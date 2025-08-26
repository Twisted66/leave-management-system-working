import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { leaveDB } from "./db";
import type { LeaveBalance } from "./types";

interface GetEmployeeBalancesParams {
  employeeId: number;
}

interface GetEmployeeBalancesResponse {
  balances: LeaveBalance[];
}

// Retrieves leave balances for a specific employee.
export const getEmployeeBalances = api<GetEmployeeBalancesParams, GetEmployeeBalancesResponse>(
  { expose: true, method: "GET", path: "/employees/:employeeId/balances", auth: true },
  async ({ employeeId }) => {
    const auth = getAuthData()!;
    
    // Employees can only view their own balances
    if (auth.role === 'employee' && employeeId !== parseInt(auth.userID)) {
      throw new Error("You can only view your own balances");
    }

    // Managers can only view their team members' balances
    if (auth.role === 'manager') {
      const isTeamMember = await leaveDB.queryRow<{count: number}>`
        SELECT COUNT(*) as count FROM employees 
        WHERE id = ${employeeId} AND (manager_id = ${parseInt(auth.userID)} OR id = ${parseInt(auth.userID)})
      `;
      if (!isTeamMember || isTeamMember.count === 0) {
        throw new Error("You can only view balances for yourself or your team members");
      }
    }

    const currentYear = new Date().getFullYear();
    const balances = await leaveDB.queryAll<LeaveBalance>`
      SELECT 
        elb.id,
        elb.employee_id as "employeeId",
        elb.leave_type_id as "leaveTypeId",
        elb.year,
        elb.allocated_days as "allocatedDays",
        elb.used_days as "usedDays",
        elb.carried_forward_days as "carriedForwardDays",
        (elb.allocated_days + elb.carried_forward_days - elb.used_days) as "availableDays",
        lt.name as "leaveTypeName"
      FROM employee_leave_balances elb
      JOIN leave_types lt ON elb.leave_type_id = lt.id
      WHERE elb.employee_id = ${employeeId} AND elb.year = ${currentYear}
      ORDER BY lt.name
    `;
    return { balances };
  }
);

interface UpdateBalanceRequest {
  employeeId: number;
  leaveTypeId: number;
  allocatedDays: number;
  carriedForwardDays: number;
}

// Updates an employee's leave balance (HR only).
export const updateBalance = api<UpdateBalanceRequest, LeaveBalance>(
  { expose: true, method: "PUT", path: "/balances", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can update balances
    if (auth.role !== 'hr') {
      throw new Error("Access denied. HR role required.");
    }

    const currentYear = new Date().getFullYear();
    const balance = await leaveDB.queryRow<LeaveBalance>`
      UPDATE employee_leave_balances 
      SET 
        allocated_days = ${req.allocatedDays},
        carried_forward_days = ${req.carriedForwardDays}
      WHERE employee_id = ${req.employeeId} 
        AND leave_type_id = ${req.leaveTypeId} 
        AND year = ${currentYear}
      RETURNING 
        id,
        employee_id as "employeeId",
        leave_type_id as "leaveTypeId",
        year,
        allocated_days as "allocatedDays",
        used_days as "usedDays",
        carried_forward_days as "carriedForwardDays",
        (allocated_days + carried_forward_days - used_days) as "availableDays"
    `;

    if (!balance) {
      throw new Error("Balance not found");
    }

    return balance;
  }
);
