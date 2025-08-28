import { api, APIError } from "encore.dev/api";
import { getAuthData } from "encore.dev/internal/codegen/auth";
import { leaveDB } from "./db";

interface SickLeaveTier {
  id: number;
  employeeId: number;
  year: number;
  fullPayDaysUsed: number;    // Out of 15 days full pay
  halfPayDaysUsed: number;    // Out of 30 days half pay
  unpaidDaysUsed: number;     // Out of 45 days unpaid
}

interface SickLeaveUsageRequest {
  employeeId: number;
  days: number;
  startDate: Date;
  endDate: Date;
  reason?: string;
}

interface SickLeaveUsageResponse {
  approved: boolean;
  tier: 'full_pay' | 'half_pay' | 'unpaid' | 'exceeded';
  daysDeducted: number;
  remainingFullPay: number;
  remainingHalfPay: number;
  remainingUnpaid: number;
}

interface GetSickLeaveBalanceParams {
  employeeId: number;
  year?: number;
}

interface SickLeaveBalance {
  year: number;
  fullPayDaysRemaining: number;    // Out of 15
  halfPayDaysRemaining: number;    // Out of 30
  unpaidDaysRemaining: number;     // Out of 45
  fullPayDaysUsed: number;
  halfPayDaysUsed: number;
  unpaidDaysUsed: number;
}

// Constants for UAE Labor Law 2025 sick leave limits
const SICK_LEAVE_LIMITS = {
  FULL_PAY_DAYS: 15,
  HALF_PAY_DAYS: 30,
  UNPAID_DAYS: 45
};

/**
 * Gets sick leave balance for an employee
 */
export const getSickLeaveBalance = api<GetSickLeaveBalanceParams, SickLeaveBalance>(
  { expose: true, method: "GET", path: "/employees/:employeeId/sick-leave-balance", auth: true },
  async ({ employeeId, year }) => {
    const auth = getAuthData()!;
    
    // Permission check: employees can only view their own balance
    if (auth.role === 'employee' && employeeId !== parseInt(auth.userID)) {
      throw APIError.permissionDenied("You can only view your own sick leave balance");
    }
    
    // Managers can only view their team members' balances
    if (auth.role === 'manager') {
      const isTeamMember = await leaveDB.queryRow<{count: number}>`
        SELECT COUNT(*) as count FROM employees 
        WHERE id = ${employeeId} AND (manager_id = ${parseInt(auth.userID)} OR id = ${parseInt(auth.userID)})
      `;
      if (!isTeamMember || isTeamMember.count === 0) {
        throw APIError.permissionDenied("You can only view sick leave balances for yourself or your team members");
      }
    }

    const currentYear = year || new Date().getFullYear();
    
    // Get or create sick leave tier record
    let tierRecord = await leaveDB.queryRow<SickLeaveTier>`
      SELECT 
        id,
        employee_id as "employeeId",
        year,
        full_pay_days_used as "fullPayDaysUsed",
        half_pay_days_used as "halfPayDaysUsed",
        unpaid_days_used as "unpaidDaysUsed"
      FROM sick_leave_tiers 
      WHERE employee_id = ${employeeId} AND year = ${currentYear}
    `;

    if (!tierRecord) {
      // Create initial record
      tierRecord = await leaveDB.queryRow<SickLeaveTier>`
        INSERT INTO sick_leave_tiers (employee_id, year)
        VALUES (${employeeId}, ${currentYear})
        RETURNING 
          id,
          employee_id as "employeeId",
          year,
          full_pay_days_used as "fullPayDaysUsed",
          half_pay_days_used as "halfPayDaysUsed",
          unpaid_days_used as "unpaidDaysUsed"
      `;
    }

    if (!tierRecord) {
      throw APIError.internal("Failed to create or retrieve sick leave tier record");
    }

    return {
      year: currentYear,
      fullPayDaysRemaining: Math.max(0, SICK_LEAVE_LIMITS.FULL_PAY_DAYS - tierRecord.fullPayDaysUsed),
      halfPayDaysRemaining: Math.max(0, SICK_LEAVE_LIMITS.HALF_PAY_DAYS - tierRecord.halfPayDaysUsed),
      unpaidDaysRemaining: Math.max(0, SICK_LEAVE_LIMITS.UNPAID_DAYS - tierRecord.unpaidDaysUsed),
      fullPayDaysUsed: tierRecord.fullPayDaysUsed,
      halfPayDaysUsed: tierRecord.halfPayDaysUsed,
      unpaidDaysUsed: tierRecord.unpaidDaysUsed
    };
  }
);

/**
 * Records sick leave usage with tiered pay structure
 */
export const recordSickLeaveUsage = api<SickLeaveUsageRequest, SickLeaveUsageResponse>(
  { expose: true, method: "POST", path: "/sick-leave-usage", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only HR can record sick leave usage
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Only HR can record sick leave usage");
    }

    const currentYear = new Date().getFullYear();
    
    // Get current tier status
    const balance = await getSickLeaveBalance({ employeeId: req.employeeId, year: currentYear });
    
    let tier: 'full_pay' | 'half_pay' | 'unpaid' | 'exceeded' = 'exceeded';
    let daysToDeduct = req.days;
    let fullPayDaysToAdd = 0;
    let halfPayDaysToAdd = 0;
    let unpaidDaysToAdd = 0;

    // Determine which tier(s) to use
    if (balance.fullPayDaysRemaining >= daysToDeduct) {
      // All days can be full pay
      tier = 'full_pay';
      fullPayDaysToAdd = daysToDeduct;
    } else if (balance.fullPayDaysRemaining > 0) {
      // Use remaining full pay days, then determine next tier
      fullPayDaysToAdd = balance.fullPayDaysRemaining;
      const remainingDays = daysToDeduct - balance.fullPayDaysRemaining;
      
      if (balance.halfPayDaysRemaining >= remainingDays) {
        // Remaining days are half pay
        tier = 'half_pay';
        halfPayDaysToAdd = remainingDays;
      } else if (balance.halfPayDaysRemaining > 0) {
        // Use remaining half pay, then unpaid
        halfPayDaysToAdd = balance.halfPayDaysRemaining;
        const stillRemaining = remainingDays - balance.halfPayDaysRemaining;
        
        if (balance.unpaidDaysRemaining >= stillRemaining) {
          tier = 'unpaid';
          unpaidDaysToAdd = stillRemaining;
        } else {
          // Exceeds all limits
          tier = 'exceeded';
          unpaidDaysToAdd = balance.unpaidDaysRemaining;
        }
      } else if (balance.unpaidDaysRemaining >= remainingDays) {
        // All remaining days are unpaid
        tier = 'unpaid';
        unpaidDaysToAdd = remainingDays;
      }
    } else if (balance.halfPayDaysRemaining >= daysToDeduct) {
      // All days are half pay
      tier = 'half_pay';
      halfPayDaysToAdd = daysToDeduct;
    } else if (balance.halfPayDaysRemaining > 0) {
      // Use remaining half pay, then unpaid
      halfPayDaysToAdd = balance.halfPayDaysRemaining;
      const remainingDays = daysToDeduct - balance.halfPayDaysRemaining;
      
      if (balance.unpaidDaysRemaining >= remainingDays) {
        tier = 'unpaid';
        unpaidDaysToAdd = remainingDays;
      } else {
        tier = 'exceeded';
        unpaidDaysToAdd = balance.unpaidDaysRemaining;
      }
    } else if (balance.unpaidDaysRemaining >= daysToDeduct) {
      // All days are unpaid
      tier = 'unpaid';
      unpaidDaysToAdd = daysToDeduct;
    }

    // Calculate actual days that will be deducted (might be less if exceeded)
    const actualDaysDeducted = fullPayDaysToAdd + halfPayDaysToAdd + unpaidDaysToAdd;
    const approved = actualDaysDeducted === daysToDeduct;

    if (approved && actualDaysDeducted > 0) {
      // Update the tier record
      await leaveDB.exec`
        UPDATE sick_leave_tiers 
        SET 
          full_pay_days_used = full_pay_days_used + ${fullPayDaysToAdd},
          half_pay_days_used = half_pay_days_used + ${halfPayDaysToAdd},
          unpaid_days_used = unpaid_days_used + ${unpaidDaysToAdd}
        WHERE employee_id = ${req.employeeId} AND year = ${currentYear}
      `;

      // Also create a leave request record for tracking
      const sickLeaveType = await leaveDB.queryRow<{id: number}>`
        SELECT id FROM leave_types WHERE name = 'Sick Leave'
      `;

      if (sickLeaveType) {
        await leaveDB.exec`
          INSERT INTO leave_requests (
            employee_id, 
            leave_type_id, 
            start_date, 
            end_date, 
            days_requested, 
            reason, 
            status,
            approved_by,
            approved_at
          )
          VALUES (
            ${req.employeeId}, 
            ${sickLeaveType.id}, 
            ${req.startDate}, 
            ${req.endDate}, 
            ${actualDaysDeducted}, 
            ${req.reason || `Sick leave - ${tier} tier`}, 
            'approved',
            ${parseInt(auth.userID)},
            NOW()
          )
        `;
      }
    }

    // Get updated balance
    const updatedBalance = await getSickLeaveBalance({ employeeId: req.employeeId, year: currentYear });

    return {
      approved,
      tier,
      daysDeducted: actualDaysDeducted,
      remainingFullPay: updatedBalance.fullPayDaysRemaining,
      remainingHalfPay: updatedBalance.halfPayDaysRemaining,
      remainingUnpaid: updatedBalance.unpaidDaysRemaining
    };
  }
);

/**
 * Resets sick leave tiers for a new year (HR only)
 */
export const resetSickLeaveTiersForNewYear = api<{year: number}, {message: string}>(
  { expose: true, method: "POST", path: "/sick-leave/reset-year", auth: true },
  async ({ year }) => {
    const auth = getAuthData()!;
    
    if (auth.role !== 'hr') {
      throw APIError.permissionDenied("Only HR can reset sick leave tiers");
    }

    // Create new tier records for all active employees
    await leaveDB.exec`
      INSERT INTO sick_leave_tiers (employee_id, year)
      SELECT e.id, ${year}
      FROM employees e
      WHERE e.role IN ('employee', 'manager')
      ON CONFLICT (employee_id, year) DO NOTHING
    `;

    return { message: `Sick leave tiers initialized for year ${year}` };
  }
);