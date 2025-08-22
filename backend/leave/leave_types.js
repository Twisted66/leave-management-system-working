import { api } from "encore.dev/api";
import { leaveDB } from "./db";
// Retrieves all leave types.
export const listLeaveTypes = api({ expose: true, method: "GET", path: "/leave-types" }, async () => {
    const leaveTypes = await leaveDB.queryAll `
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
});
//# sourceMappingURL=leave_types.js.map