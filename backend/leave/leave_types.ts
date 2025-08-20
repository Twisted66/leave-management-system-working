import { api } from "encore.dev/api";
import { leaveDB } from "./db";
import type { LeaveType } from "./types";

interface ListLeaveTypesResponse {
  leaveTypes: LeaveType[];
}

// Retrieves all leave types.
export const listLeaveTypes = api<void, ListLeaveTypesResponse>(
  { expose: true, method: "GET", path: "/leave-types" },
  async () => {
    const leaveTypes = await leaveDB.queryAll<LeaveType>`
      SELECT 
        id,
        name,
        annual_allocation as "annualAllocation",
        carry_forward_limit as "carryForwardLimit",
        created_at as "createdAt"
      FROM leave_types
      ORDER BY name
    `;
    return { leaveTypes };
  }
);
