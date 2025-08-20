import { api, APIError } from "encore.dev/api";
import { leaveDB } from "./db";
import type { LeaveRequest } from "./types";

interface CreateLeaveRequestRequest {
  employeeId: number;
  leaveTypeId: number;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

// Creates a new leave request.
export const createLeaveRequest = api<CreateLeaveRequestRequest, LeaveRequest>(
  { expose: true, method: "POST", path: "/leave-requests" },
  async (req) => {
    // Calculate business days between start and end date
    const daysRequested = calculateBusinessDays(req.startDate, req.endDate);
    
    // Check if employee has sufficient balance
    const currentYear = new Date().getFullYear();
    const balance = await leaveDB.queryRow<{availableDays: number}>`
      SELECT (allocated_days + carried_forward_days - used_days) as "availableDays"
      FROM employee_leave_balances
      WHERE employee_id = ${req.employeeId} 
        AND leave_type_id = ${req.leaveTypeId} 
        AND year = ${currentYear}
    `;

    if (!balance || balance.availableDays < daysRequested) {
      throw APIError.invalidArgument("Insufficient leave balance");
    }

    const leaveRequest = await leaveDB.queryRow<LeaveRequest>`
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
  }
);

interface ListLeaveRequestsParams {
  employeeId?: number;
  managerId?: number;
  status?: string;
}

interface ListLeaveRequestsResponse {
  requests: LeaveRequest[];
}

// Retrieves leave requests with optional filtering.
export const listLeaveRequests = api<ListLeaveRequestsParams, ListLeaveRequestsResponse>(
  { expose: true, method: "GET", path: "/leave-requests" },
  async (params) => {
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    
    if (params.employeeId) {
      whereClause += ` AND lr.employee_id = $${queryParams.length + 1}`;
      queryParams.push(params.employeeId);
    }
    
    if (params.managerId) {
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

    const requests = await leaveDB.rawQueryAll<LeaveRequest>(query, ...queryParams);
    return { requests };
  }
);

interface UpdateLeaveRequestStatusRequest {
  id: number;
  status: 'approved' | 'rejected';
  managerComments?: string;
  approvedBy: number;
}

// Updates the status of a leave request (approve/reject).
export const updateLeaveRequestStatus = api<UpdateLeaveRequestStatusRequest, LeaveRequest>(
  { expose: true, method: "PUT", path: "/leave-requests/:id/status" },
  async (req) => {
    const now = new Date();
    
    // Get the leave request details first
    const existingRequest = await leaveDB.queryRow<{
      employeeId: number;
      leaveTypeId: number;
      daysRequested: number;
      status: string;
    }>`
      SELECT 
        employee_id as "employeeId",
        leave_type_id as "leaveTypeId",
        days_requested as "daysRequested",
        status
      FROM leave_requests 
      WHERE id = ${req.id}
    `;

    if (!existingRequest) {
      throw APIError.notFound("Leave request not found");
    }

    if (existingRequest.status !== 'pending') {
      throw APIError.invalidArgument("Leave request has already been processed");
    }

    // Update the request status
    const updatedRequest = await leaveDB.queryRow<LeaveRequest>`
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
      await leaveDB.exec`
        UPDATE employee_leave_balances 
        SET used_days = used_days + ${existingRequest.daysRequested}
        WHERE employee_id = ${existingRequest.employeeId} 
          AND leave_type_id = ${existingRequest.leaveTypeId}
          AND year = ${currentYear}
      `;
    }

    return updatedRequest;
  }
);

function calculateBusinessDays(startDate: Date, endDate: Date): number {
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
