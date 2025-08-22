import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { leaveDB } from "./db";
// Creates a new leave request.
export const createLeaveRequest = api({ expose: true, method: "POST", path: "/leave-requests", auth: true }, async (req) => {
    const auth = getAuthData();
    // Employees can only create requests for themselves
    if (auth.role === 'employee' && req.employeeId !== parseInt(auth.userID)) {
        throw APIError.permissionDenied("You can only create requests for yourself");
    }
    // Calculate business days between start and end date
    const daysRequested = calculateBusinessDays(req.startDate, req.endDate);
    // Check if employee has sufficient balance
    const currentYear = new Date().getFullYear();
    const balance = await leaveDB.queryRow `
      SELECT (allocated_days + carried_forward_days - used_days) as "availableDays"
      FROM employee_leave_balances
      WHERE employee_id = ${req.employeeId} 
        AND leave_type_id = ${req.leaveTypeId} 
        AND year = ${currentYear}
    `;
    if (!balance || balance.availableDays < daysRequested) {
        throw APIError.invalidArgument("Insufficient leave balance");
    }
    const leaveRequest = await leaveDB.queryRow `
      INSERT INTO leave_requests (
        employee_id, leave_type_id, start_date, end_date, 
        days_requested, reason
      )
      VALUES (
        ${req.employeeId}, ${req.leaveTypeId}, ${req.startDate}, ${req.endDate},
        ${daysRequested}, ${req.reason || null}
      )
      RETURNING 
        id,
        employee_id as "employeeId",
        leave_type_id as "leaveTypeId",
        start_date as "startDate",
        end_date as "endDate",
        days_requested as "daysRequested",
        reason,
        status,
        manager_comments as "managerComments",
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    if (!leaveRequest) {
        throw new Error("Failed to create leave request");
    }
    return leaveRequest;
});
// Retrieves leave requests with optional filtering.
export const listLeaveRequests = api({ expose: true, method: "GET", path: "/leave-requests", auth: true }, async (params) => {
    const auth = getAuthData();
    let whereClause = "WHERE 1=1";
    const queryParams = [];
    // Apply role-based filtering
    if (auth.role === 'employee') {
        // Employees can only see their own requests
        whereClause += ` AND lr.employee_id = $${queryParams.length + 1}`;
        queryParams.push(parseInt(auth.userID));
    }
    else if (auth.role === 'manager' && !params.employeeId && !params.managerId) {
        // Managers see their team's requests by default
        whereClause += ` AND e.manager_id = $${queryParams.length + 1}`;
        queryParams.push(parseInt(auth.userID));
    }
    if (params.employeeId) {
        // HR can see any employee's requests, managers can see their team's requests
        if (auth.role === 'manager') {
            // Verify the employee reports to this manager
            const isTeamMember = await leaveDB.queryRow `
          SELECT COUNT(*) as count FROM employees 
          WHERE id = ${params.employeeId} AND manager_id = ${parseInt(auth.userID)}
        `;
            if (!isTeamMember || isTeamMember.count === 0) {
                throw APIError.permissionDenied("You can only view requests from your team members");
            }
        }
        whereClause += ` AND lr.employee_id = $${queryParams.length + 1}`;
        queryParams.push(params.employeeId);
    }
    if (params.managerId && auth.role === 'hr') {
        whereClause += ` AND e.manager_id = $${queryParams.length + 1}`;
        queryParams.push(params.managerId);
    }
    if (params.status) {
        whereClause += ` AND lr.status = $${queryParams.length + 1}`;
        queryParams.push(params.status);
    }
    const query = `
      SELECT 
        lr.id,
        lr.employee_id as "employeeId",
        lr.leave_type_id as "leaveTypeId",
        lr.start_date as "startDate",
        lr.end_date as "endDate",
        lr.days_requested as "daysRequested",
        lr.reason,
        lr.status,
        lr.manager_comments as "managerComments",
        lr.approved_by as "approvedBy",
        lr.approved_at as "approvedAt",
        lr.created_at as "createdAt",
        lr.updated_at as "updatedAt",
        e.name as "employeeName",
        lt.name as "leaveTypeName",
        approver.name as "approverName"
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN employees approver ON lr.approved_by = approver.id
      ${whereClause}
      ORDER BY lr.created_at DESC
    `;
    const requests = await leaveDB.rawQueryAll(query, ...queryParams);
    return { requests };
});
// Updates the status of a leave request (approve/reject).
export const updateLeaveRequestStatus = api({ expose: true, method: "PUT", path: "/leave-requests/:id/status", auth: true }, async (req) => {
    const auth = getAuthData();
    // Only managers and HR can approve/reject requests
    if (auth.role === 'employee') {
        throw APIError.permissionDenied("You don't have permission to approve/reject requests");
    }
    const now = new Date();
    // Get the leave request details first
    const existingRequest = await leaveDB.queryRow `
      SELECT 
        lr.employee_id as "employeeId",
        lr.leave_type_id as "leaveTypeId",
        lr.days_requested as "daysRequested",
        lr.status,
        e.manager_id as "managerId"
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE lr.id = ${req.id}
    `;
    if (!existingRequest) {
        throw APIError.notFound("Leave request not found");
    }
    if (existingRequest.status !== 'pending') {
        throw APIError.invalidArgument("Leave request has already been processed");
    }
    // Managers can only approve requests from their team
    if (auth.role === 'manager' && existingRequest.managerId !== parseInt(auth.userID)) {
        throw APIError.permissionDenied("You can only approve requests from your team members");
    }
    // Update the request status
    const updatedRequest = await leaveDB.queryRow `
      UPDATE leave_requests 
      SET 
        status = ${req.status},
        manager_comments = ${req.managerComments || null},
        approved_by = ${req.approvedBy},
        approved_at = ${now},
        updated_at = ${now}
      WHERE id = ${req.id}
      RETURNING 
        id,
        employee_id as "employeeId",
        leave_type_id as "leaveTypeId",
        start_date as "startDate",
        end_date as "endDate",
        days_requested as "daysRequested",
        reason,
        status,
        manager_comments as "managerComments",
        approved_by as "approvedBy",
        approved_at as "approvedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;
    if (!updatedRequest) {
        throw new Error("Failed to update leave request");
    }
    // If approved, update the employee's used days
    if (req.status === 'approved') {
        const currentYear = new Date().getFullYear();
        await leaveDB.exec `
        UPDATE employee_leave_balances 
        SET used_days = used_days + ${existingRequest.daysRequested}
        WHERE employee_id = ${existingRequest.employeeId} 
          AND leave_type_id = ${existingRequest.leaveTypeId}
          AND year = ${currentYear}
      `;
    }
    return updatedRequest;
});
function calculateBusinessDays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    while (current <= endDate) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    return count;
}
//# sourceMappingURL=leave_requests.js.map