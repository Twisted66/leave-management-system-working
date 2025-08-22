import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { leaveDB } from "./db";
/**
 * Synchronizes a user from Auth0 to the internal database
 * This endpoint should be called from Auth0 Actions or Rules when a user logs in
 * or when user metadata is updated in Auth0.
 *
 * Auth0 Configuration:
 * 1. Create a Machine-to-Machine application in Auth0 for server-side calls
 * 2. Grant necessary scopes to read user data
 * 3. Use this endpoint in Auth0 Actions (recommended) or Rules
 *
 * Example Auth0 Action:
 * ```javascript
 * exports.onExecutePostLogin = async (event, api) => {
 *   const axios = require('axios');
 *
 *   try {
 *     await axios.post('https://your-encore-app.com/auth0/sync-user', {
 *       auth0Sub: event.user.user_id,
 *       email: event.user.email,
 *       name: event.user.name || event.user.email,
 *       department: event.user.app_metadata?.department || 'General',
 *       role: event.user.app_metadata?.role || 'employee',
 *       managerId: event.user.app_metadata?.manager_id
 *     }, {
 *       headers: {
 *         'Authorization': `Bearer ${YOUR_M2M_TOKEN}`,
 *         'Content-Type': 'application/json'
 *       }
 *     });
 *   } catch (error) {
 *     console.error('Failed to sync user:', error);
 *   }
 * };
 * ```
 */
export const syncUser = api({ expose: true, method: "POST", path: "/auth0/sync-user", auth: true }, async (req) => {
    const authData = getAuthData();
    // Only HR or system accounts can sync users
    if (authData.role !== 'hr') {
        throw APIError.permissionDenied("Access denied. HR role required.");
    }
    // Check if user already exists by Auth0 subject
    let employee = await leaveDB.queryRow `
      SELECT 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
        profile_image_url as "profileImageUrl",
        created_at as "createdAt",
        auth0_sub as "auth0Sub"
      FROM employees
      WHERE auth0_sub = ${req.auth0Sub}
    `;
    let created = false;
    if (!employee) {
        // Check if user exists by email
        employee = await leaveDB.queryRow `
        SELECT 
          id,
          email,
          name,
          department,
          role,
          manager_id as "managerId",
          profile_image_url as "profileImageUrl",
          created_at as "createdAt",
          auth0_sub as "auth0Sub"
        FROM employees
        WHERE email = ${req.email}
      `;
        if (employee) {
            // Update existing employee with Auth0 subject
            await leaveDB.exec `
          UPDATE employees 
          SET 
            auth0_sub = ${req.auth0Sub},
            name = ${req.name},
            department = ${req.department},
            role = ${req.role || employee.role},
            manager_id = ${req.managerId || employee.managerId}
          WHERE id = ${employee.id}
        `;
            // Refresh employee data
            employee = await leaveDB.queryRow `
          SELECT 
            id,
            email,
            name,
            department,
            role,
            manager_id as "managerId",
            profile_image_url as "profileImageUrl",
            created_at as "createdAt",
            auth0_sub as "auth0Sub"
          FROM employees
          WHERE id = ${employee.id}
        `;
        }
        else {
            // Create new employee
            employee = await leaveDB.queryRow `
          INSERT INTO employees (auth0_sub, email, name, department, role, manager_id)
          VALUES (${req.auth0Sub}, ${req.email}, ${req.name}, ${req.department}, ${req.role || 'employee'}, ${req.managerId || null})
          RETURNING 
            id,
            email,
            name,
            department,
            role,
            manager_id as "managerId",
            profile_image_url as "profileImageUrl",
            created_at as "createdAt",
            auth0_sub as "auth0Sub"
        `;
            created = true;
            // Initialize leave balances for new employee
            if (employee && req.role !== 'hr') {
                await leaveDB.exec `
            INSERT INTO employee_leave_balances (employee_id, leave_type_id, year, allocated_days)
            SELECT 
              ${employee.id} as employee_id,
              lt.id as leave_type_id,
              EXTRACT(YEAR FROM NOW()) as year,
              lt.annual_allocation as allocated_days
            FROM leave_types lt
          `;
            }
        }
    }
    else {
        // Update existing employee data
        await leaveDB.exec `
        UPDATE employees 
        SET 
          name = ${req.name},
          department = ${req.department},
          role = ${req.role || employee.role},
          manager_id = ${req.managerId || employee.managerId}
        WHERE auth0_sub = ${req.auth0Sub}
      `;
        // Refresh employee data
        employee = await leaveDB.queryRow `
        SELECT 
          id,
          email,
          name,
          department,
          role,
          manager_id as "managerId",
          profile_image_url as "profileImageUrl",
          created_at as "createdAt",
          auth0_sub as "auth0Sub"
        FROM employees
        WHERE auth0_sub = ${req.auth0Sub}
      `;
    }
    if (!employee) {
        throw new Error("Failed to sync user");
    }
    return { employee, created };
});
/**
 * Bulk synchronization endpoint for migrating existing Auth0 users
 * This is useful for initial setup or bulk updates from Auth0 Management API
 */
export const bulkSyncUsers = api({ expose: true, method: "POST", path: "/auth0/bulk-sync-users", auth: true }, async (req) => {
    const authData = getAuthData();
    // Only HR can perform bulk sync
    if (authData.role !== 'hr') {
        throw APIError.permissionDenied("Access denied. HR role required.");
    }
    let synced = 0;
    let created = 0;
    const errors = [];
    for (const user of req.users) {
        try {
            const result = await syncUser(user);
            synced++;
            if (result.created) {
                created++;
            }
        }
        catch (error) {
            errors.push({
                user,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    return { synced, created, errors };
});
export const auth0Webhook = api({ expose: true, method: "POST", path: "/auth0/webhook" }, async (event) => {
    // Handle different Auth0 events
    switch (event.type) {
        case 'ss': // Successful login
        case 'sapi': // Successful API operation
            if (event.user) {
                try {
                    await syncUser({
                        auth0Sub: event.user.user_id,
                        email: event.user.email,
                        name: event.user.name || event.user.email,
                        department: event.user.app_metadata?.department || 'General',
                        role: event.user.app_metadata?.role || 'employee',
                        managerId: event.user.app_metadata?.manager_id
                    });
                }
                catch (error) {
                    console.error('Failed to sync user from webhook:', error);
                }
            }
            break;
        case 'du': // User deleted
            if (event.user_id) {
                try {
                    await leaveDB.exec `
              UPDATE employees 
              SET auth0_sub = NULL 
              WHERE auth0_sub = ${event.user_id}
            `;
                }
                catch (error) {
                    console.error('Failed to handle user deletion:', error);
                }
            }
            break;
        default:
            // Ignore other event types
            break;
    }
});
// Gets the current user's profile information
export const getUserProfile = api({ auth: true, expose: true, method: "GET", path: "/auth0/profile" }, async () => {
    const authData = getAuthData(); // guaranteed to be non-null since auth: true
    const employee = await leaveDB.queryRow `
      SELECT 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
        profile_image_url as "profileImageUrl",
        created_at as "createdAt",
        auth0_sub as "auth0Sub"
      FROM employees
      WHERE id = ${parseInt(authData.userID)}
    `;
    if (!employee) {
        throw APIError.notFound("User not found");
    }
    return {
        id: authData.userID,
        email: authData.email,
        name: employee.name,
        department: employee.department,
        role: authData.role,
        auth0Sub: authData.auth0Sub
    };
});
// Gets the current user's leave balances
export const getUserLeaveBalances = api({ auth: true, expose: true, method: "GET", path: "/auth0/leave-balances" }, async () => {
    const authData = getAuthData();
    const currentYear = new Date().getFullYear();
    const balances = await leaveDB.queryAll `
      SELECT 
        lt.name as "leaveType",
        elb.allocated_days as allocated,
        elb.used_days as used,
        (elb.allocated_days + elb.carried_forward_days - elb.used_days) as available
      FROM employee_leave_balances elb
      JOIN leave_types lt ON elb.leave_type_id = lt.id
      WHERE elb.employee_id = ${parseInt(authData.userID)} 
        AND elb.year = ${currentYear}
      ORDER BY lt.name
    `;
    return { balances };
});
// Gets team members for managers
export const getTeamInfo = api({ auth: true, expose: true, method: "GET", path: "/auth0/team" }, async () => {
    const authData = getAuthData();
    // Only managers and HR can access team information
    if (authData.role === 'employee') {
        throw APIError.permissionDenied("Access denied. Manager or HR role required.");
    }
    let members = [];
    if (authData.role === 'manager') {
        // Managers see their direct reports
        members = await leaveDB.queryAll `
        SELECT 
          id,
          name,
          email,
          department,
          role
        FROM employees
        WHERE manager_id = ${parseInt(authData.userID)}
        ORDER BY name
      `;
    }
    else if (authData.role === 'hr') {
        // HR sees all employees
        members = await leaveDB.queryAll `
        SELECT 
          id,
          name,
          email,
          department,
          role
        FROM employees
        WHERE role != 'hr'
        ORDER BY department, name
      `;
    }
    return { members };
});
//# sourceMappingURL=auth0_sync.js.map