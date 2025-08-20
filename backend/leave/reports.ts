import { api } from "encore.dev/api";
import { leaveDB } from "./db";

interface LeaveUsageReport {
  employeeId: number;
  employeeName: string;
  department: string;
  leaveTypeName: string;
  allocatedDays: number;
  usedDays: number;
  availableDays: number;
  utilizationPercentage: number;
}

interface DepartmentSummary {
  department: string;
  totalEmployees: number;
  totalAllocatedDays: number;
  totalUsedDays: number;
  averageUtilization: number;
}

interface LeaveUsageReportResponse {
  employeeReports: LeaveUsageReport[];
  departmentSummaries: DepartmentSummary[];
}

interface GetLeaveUsageReportParams {
  year?: number;
  department?: string;
}

// Generates a comprehensive leave usage report for HR.
export const getLeaveUsageReport = api<GetLeaveUsageReportParams, LeaveUsageReportResponse>(
  { expose: true, method: "GET", path: "/reports/leave-usage" },
  async (params) => {
    const year = params.year || new Date().getFullYear();
    
    let whereClause = "WHERE elb.year = $1";
    const queryParams: any[] = [year];
    
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
      ORDER BY e.department, e.name, lt.name
    `;

    const employeeReports = await leaveDB.rawQueryAll<LeaveUsageReport>(employeeQuery, ...queryParams);

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
      GROUP BY e.department
      ORDER BY e.department
    `;

    const departmentSummaries = await leaveDB.rawQueryAll<DepartmentSummary>(departmentQuery, ...queryParams);

    return { employeeReports, departmentSummaries };
  }
);

interface PendingRequestsSummary {
  totalPending: number;
  byDepartment: Array<{
    department: string;
    pendingCount: number;
  }>;
  byLeaveType: Array<{
    leaveTypeName: string;
    pendingCount: number;
  }>;
}

// Generates a summary of pending leave requests for managers and HR.
export const getPendingRequestsSummary = api<void, PendingRequestsSummary>(
  { expose: true, method: "GET", path: "/reports/pending-requests" },
  async () => {
    const totalPending = await leaveDB.queryRow<{count: number}>`
      SELECT COUNT(*) as count
      FROM leave_requests
      WHERE status = 'pending'
    `;

    const byDepartment = await leaveDB.queryAll<{department: string; pendingCount: number}>`
      SELECT 
        e.department,
        COUNT(*) as "pendingCount"
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      WHERE lr.status = 'pending'
      GROUP BY e.department
      ORDER BY "pendingCount" DESC
    `;

    const byLeaveType = await leaveDB.queryAll<{leaveTypeName: string; pendingCount: number}>`
      SELECT 
        lt.name as "leaveTypeName",
        COUNT(*) as "pendingCount"
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE lr.status = 'pending'
      GROUP BY lt.name
      ORDER BY "pendingCount" DESC
    `;

    return {
      totalPending: totalPending?.count || 0,
      byDepartment,
      byLeaveType
    };
  }
);
