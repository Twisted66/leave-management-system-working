import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { leaveDB } from "./db";
// Generates a comprehensive leave usage report for HR.
export const getLeaveUsageReport = api({ expose: true, method: "GET", path: "/reports/leave-usage", auth: true }, async (params) => {
    const auth = getAuthData();
    // Only HR can access reports
    if (auth.role !== 'hr') {
        throw new Error("Access denied. HR role required.");
    }
    const year = params.year || new Date().getFullYear();
    let whereClause = "WHERE elb.year = $1";
    const queryParams = [year];
    if (params.department) {
        whereClause += " AND e.department = $2";
        queryParams.push(params.department);
    }
    // Employee-level report
    const employeeQuery = `
      SELECT 
        e.id as "employeeId",
        e.name as "employeeName",
        e.department,
        lt.name as "leaveTypeName",
        elb.allocated_days as "allocatedDays",
        elb.used_days as "usedDays",
        (elb.allocated_days + elb.carried_forward_days - elb.used_days) as "availableDays",
        CASE 
          WHEN elb.allocated_days > 0 
          THEN ROUND((elb.used_days::DECIMAL / elb.allocated_days) * 100, 2)
          ELSE 0 
        END as "utilizationPercentage"
      FROM employee_leave_balances elb
      JOIN employees e ON elb.employee_id = e.id
      JOIN leave_types lt ON elb.leave_type_id = lt.id
      ${whereClause}
      AND e.role != 'hr'
      ORDER BY e.department, e.name, lt.name
    `;
    const employeeReports = await leaveDB.rawQueryAll(employeeQuery, ...queryParams);
    // Department-level summary
    const departmentQuery = `
      SELECT 
        e.department,
        COUNT(DISTINCT e.id) as "totalEmployees",
        SUM(elb.allocated_days) as "totalAllocatedDays",
        SUM(elb.used_days) as "totalUsedDays",
        CASE 
          WHEN SUM(elb.allocated_days) > 0 
          THEN ROUND((SUM(elb.used_days)::DECIMAL / SUM(elb.allocated_days)) * 100, 2)
          ELSE 0 
        END as "averageUtilization"
      FROM employee_leave_balances elb
      JOIN employees e ON elb.employee_id = e.id
      ${whereClause}
      AND e.role != 'hr'
      GROUP BY e.department
      ORDER BY e.department
    `;
    const departmentSummaries = await leaveDB.rawQueryAll(departmentQuery, ...queryParams);
    return { employeeReports, departmentSummaries };
});
// Generates a summary of pending leave requests for managers and HR.
export const getPendingRequestsSummary = api({ expose: true, method: "GET", path: "/reports/pending-requests", auth: true }, async () => {
    const auth = getAuthData();
    // Only managers and HR can access this report
    if (auth.role === 'employee') {
        throw new Error("Access denied. Manager or HR role required.");
    }
    let whereClause = "WHERE lr.status = 'pending'";
    const queryParams = [];
    // If manager, only show their team's requests
    if (auth.role === 'manager') {
        whereClause += " AND e.manager_id = $1";
        queryParams.push(parseInt(auth.userID));
    }
    const totalPending = await leaveDB.rawQueryRow(`SELECT COUNT(*) as count
       FROM leave_requests lr
       JOIN employees e ON lr.employee_id = e.id
       ${whereClause}`, ...queryParams);
    const byDepartment = await leaveDB.rawQueryAll(`SELECT 
        e.department,
        COUNT(*) as "pendingCount"
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      ${whereClause}
      GROUP BY e.department
      ORDER BY "pendingCount" DESC`, ...queryParams);
    const byLeaveType = await leaveDB.rawQueryAll(`SELECT 
        lt.name as "leaveTypeName",
        COUNT(*) as "pendingCount"
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      ${whereClause}
      GROUP BY lt.name
      ORDER BY "pendingCount" DESC`, ...queryParams);
    return {
        totalPending: totalPending?.count || 0,
        byDepartment,
        byLeaveType
    };
});
//# sourceMappingURL=reports.js.map