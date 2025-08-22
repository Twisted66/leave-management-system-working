import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { secret } from "encore.dev/config";
import { leaveDB } from "./db";
import type { Employee } from "./types";
import * as crypto from "crypto";

// Auth0 webhook secret for signature verification
const auth0WebhookSecret = secret("Auth0WebhookSecret");

/**
 * Auth0 User Synchronization Endpoints
 * 
 * These endpoints help synchronize user data between Auth0 and the internal database.
 * They should be called during user onboarding or when user data changes in Auth0.
 */

interface SyncUserRequest {
  auth0Sub: string;
  email: string;
  name: string;
  department: string;
  role?: 'employee' | 'manager' | 'hr';
  managerId?: number;
}

interface SyncUserResponse {
  employee: Employee;
  created: boolean;
}

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
export const syncUser = api<SyncUserRequest, SyncUserResponse>(
  { expose: true, method: "POST", path: "/auth0/sync-user", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    
    // Only HR or system accounts can sync users
    if (authData.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    // Check if user already exists by Auth0 subject
    let employee = await leaveDB.queryRow<Employee>`
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
      employee = await leaveDB.queryRow<Employee>`
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
        await leaveDB.exec`
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
        employee = await leaveDB.queryRow<Employee>`
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
      } else {
        // Create new employee
        employee = await leaveDB.queryRow<Employee>`
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
          await leaveDB.exec`
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
    } else {
      // Update existing employee data
      await leaveDB.exec`
        UPDATE employees 
        SET 
          name = ${req.name},
          department = ${req.department},
          role = ${req.role || employee.role},
          manager_id = ${req.managerId || employee.managerId}
        WHERE auth0_sub = ${req.auth0Sub}
      `;

      // Refresh employee data
      employee = await leaveDB.queryRow<Employee>`
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
  }
);

interface BulkSyncRequest {
  users: SyncUserRequest[];
}

interface BulkSyncResponse {
  synced: number;
  created: number;
  errors: Array<{
    user: SyncUserRequest;
    error: string;
  }>;
}

/**
 * Bulk synchronization endpoint for migrating existing Auth0 users
 * This is useful for initial setup or bulk updates from Auth0 Management API
 */
export const bulkSyncUsers = api<BulkSyncRequest, BulkSyncResponse>(
  { expose: true, method: "POST", path: "/auth0/bulk-sync-users", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    
    // Only HR can perform bulk sync
    if (authData.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    let synced = 0;
    let created = 0;
    const errors: Array<{ user: SyncUserRequest; error: string }> = [];

    for (const user of req.users) {
      try {
        const result = await syncUser(user);
        synced++;
        if (result.created) {
          created++;
        }
      } catch (error) {
        errors.push({
          user,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { synced, created, errors };
  }
);

/**
 * Verifies Auth0 webhook signature for security
 */
function verifyWebhookSignature(body: string, signature: string, timestamp: string): boolean {
  try {
    const payload = `${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', auth0WebhookSecret())
      .update(payload)
      .digest('hex');
    
    // Extract signature from header (format: "t=timestamp,v1=signature")
    const signatureParts = signature.split(',');
    const webhookSignature = signatureParts.find(part => part.startsWith('v1='))?.split('=')[1];
    
    if (!webhookSignature) {
      return false;
    }
    
    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(webhookSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

/**
 * Webhook endpoint for Auth0 to notify about user changes
 * Configure this in Auth0 Dashboard under Monitoring > Logs > Log Streams
 * 
 * SECURITY: This endpoint now requires signature verification
 * Set Auth0WebhookSecret in your Encore secrets
 */
interface Auth0WebhookEvent {
  type: string;
  user_id?: string;
  user?: {
    user_id: string;
    email: string;
    name?: string;
    app_metadata?: {
      department?: string;
      role?: string;
      manager_id?: number;
    };
  };
}

interface WebhookHeaders {
  "auth0-signature"?: string;
  "auth0-timestamp"?: string;
}

export const auth0Webhook = api<Auth0WebhookEvent, void>(
  { expose: true, method: "POST", path: "/auth0/webhook", auth: false },
  async (event, { headers }) => {
    // Verify webhook signature for security
    const signature = (headers as WebhookHeaders)["auth0-signature"];
    const timestamp = (headers as WebhookHeaders)["auth0-timestamp"];
    
    if (!signature || !timestamp) {
      throw APIError.unauthenticated("Missing webhook signature or timestamp");
    }
    
    const body = JSON.stringify(event);
    if (!verifyWebhookSignature(body, signature, timestamp)) {
      throw APIError.unauthenticated("Invalid webhook signature");
    }
    
    // Verify timestamp to prevent replay attacks (5 minute window)
    const now = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp);
    if (Math.abs(now - webhookTime) > 300) {
      throw APIError.unauthenticated("Webhook timestamp too old");
    }
    
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
          } catch (error) {
            // Sanitize error for production
            console.error('Webhook user sync failed:', error);
            throw APIError.internal("User synchronization failed");
          }
        }
        break;
      
      case 'du': // User deleted
        if (event.user_id) {
          try {
            await leaveDB.exec`
              UPDATE employees 
              SET auth0_sub = NULL 
              WHERE auth0_sub = ${event.user_id}
            `;
          } catch (error) {
            console.error('Webhook user deletion failed:', error);
            throw APIError.internal("User deletion failed");
          }
        }
        break;
      
      default:
        // Ignore other event types silently
        break;
    }
  }
);

/**
 * Example API endpoint that returns user profile information
 * This endpoint is protected and requires Auth0 authentication
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  department: string;
  role: string;
  auth0Sub: string;
}

// Gets the current user's profile information
export const getUserProfile = api<void, UserProfile>(
  { auth: true, expose: true, method: "GET", path: "/auth0/profile" },
  async () => {
    const authData = getAuthData()!; // guaranteed to be non-null since auth: true
    
    const employee = await leaveDB.queryRow<Employee>`
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
  }
);

/**
 * Example API endpoint that returns user-specific leave balances
 * This demonstrates how to use authentication data in business logic
 */
export interface UserLeaveBalances {
  balances: Array<{
    leaveType: string;
    allocated: number;
    used: number;
    available: number;
  }>;
}

// Gets the current user's leave balances
export const getUserLeaveBalances = api<void, UserLeaveBalances>(
  { auth: true, expose: true, method: "GET", path: "/auth0/leave-balances" },
  async () => {
    const authData = getAuthData()!;
    const currentYear = new Date().getFullYear();
    
    const balances = await leaveDB.queryAll<{
      leaveType: string;
      allocated: number;
      used: number;
      available: number;
    }>`
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
  }
);

/**
 * Example API endpoint for managers to get their team's information
 * This demonstrates role-based access control with Auth0
 */
export interface TeamMember {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
}

export interface TeamInfo {
  members: TeamMember[];
}

// Gets team members for managers
export const getTeamInfo = api<void, TeamInfo>(
  { auth: true, expose: true, method: "GET", path: "/auth0/team" },
  async () => {
    const authData = getAuthData()!;
    
    // Only managers and HR can access team information
    if (authData.role === 'employee') {
      throw APIError.permissionDenied("Access denied. Manager or HR role required.");
    }

    let members: TeamMember[] = [];

    if (authData.role === 'manager') {
      // Managers see their direct reports
      members = await leaveDB.queryAll<TeamMember>`
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
    } else if (authData.role === 'hr') {
      // HR sees all employees
      members = await leaveDB.queryAll<TeamMember>`
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
  }
);
