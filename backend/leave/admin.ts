import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { getAuthData } from "~encore/auth";
import { leaveDB } from "./db";
import type { Employee } from "./types";
import * as crypto from "crypto";

// Admin initialization secret
const adminInitSecret = secret("AdminInitSecret");

/**
 * Admin user creation and management endpoints
 * These endpoints handle initial admin setup and admin operations
 */

interface CreateAdminRequest {
  email: string;
  name: string;
  department: string;
  auth0Sub: string;
  initSecret: string; // Required for initial admin creation
}

interface CreateAdminResponse {
  admin: Employee;
  message: string;
}

/**
 * Creates the initial admin user - requires secret key
 * This endpoint should only be used once during system setup
 */
export const createInitialAdmin = api<CreateAdminRequest, CreateAdminResponse>(
  { expose: true, method: "POST", path: "/admin/create-initial", auth: false },
  async (req) => {
    // Verify initialization secret
    if (req.initSecret !== adminInitSecret()) {
      throw APIError.unauthenticated("Invalid initialization secret");
    }

    // Check if any admin users already exist
    const existingAdmin = await leaveDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM employees WHERE role = 'hr'
    `;

    if (existingAdmin && existingAdmin.count > 0) {
      throw APIError.permissionDenied("Admin user already exists. Use regular admin creation endpoints.");
    }

    // Create the initial admin user
    const admin = await leaveDB.queryRow<Employee>`
      INSERT INTO employees (auth0_sub, email, name, department, role)
      VALUES (${req.auth0Sub}, ${req.email}, ${req.name}, ${req.department}, 'hr')
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

    if (!admin) {
      throw APIError.internal("Failed to create admin user");
    }

    // Initialize leave types if they don't exist
    const existingLeaveTypes = await leaveDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM leave_types
    `;

    if (existingLeaveTypes && existingLeaveTypes.count === 0) {
      await leaveDB.exec`
        INSERT INTO leave_types (name, description, annual_allocation, max_carry_forward, requires_approval)
        VALUES 
          ('Annual Leave', 'Annual vacation leave', 25, 5, true),
          ('Sick Leave', 'Medical leave for illness', 10, 0, false),
          ('Personal Leave', 'Personal time off', 3, 0, true),
          ('Maternity/Paternity Leave', 'Parental leave', 90, 0, true),
          ('Emergency Leave', 'Emergency time off', 2, 0, true)
      `;
    }

    return {
      admin,
      message: "Initial admin user created successfully. System is ready for use."
    };
  }
);

interface CreateAdminUserRequest {
  email: string;
  name: string;
  department: string;
  auth0Sub: string;
}

/**
 * Creates additional admin users - requires existing HR role
 */
export const createAdminUser = api<CreateAdminUserRequest, CreateAdminResponse>(
  { expose: true, method: "POST", path: "/admin/create", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    
    // Only existing HR can create new admin users
    if (authData.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    // Check if user already exists
    const existingUser = await leaveDB.queryRow<Employee>`
      SELECT id FROM employees WHERE email = ${req.email} OR auth0_sub = ${req.auth0Sub}
    `;

    if (existingUser) {
      throw APIError.invalidArgument("User with this email or Auth0 ID already exists");
    }

    // Create the admin user
    const admin = await leaveDB.queryRow<Employee>`
      INSERT INTO employees (auth0_sub, email, name, department, role)
      VALUES (${req.auth0Sub}, ${req.email}, ${req.name}, ${req.department}, 'hr')
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

    if (!admin) {
      throw APIError.internal("Failed to create admin user");
    }

    return {
      admin,
      message: "Admin user created successfully"
    };
  }
);

interface UpdateUserRoleRequest {
  employeeId: number;
  newRole: 'employee' | 'manager' | 'hr';
}

interface UpdateUserRoleResponse {
  employee: Employee;
  message: string;
}

/**
 * Updates user role - HR only operation
 */
export const updateUserRole = api<UpdateUserRoleRequest, UpdateUserRoleResponse>(
  { expose: true, method: "PUT", path: "/admin/update-role", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    
    // Only HR can update user roles
    if (authData.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    // Prevent users from demoting themselves
    if (parseInt(authData.userID) === req.employeeId && req.newRole !== 'hr') {
      throw APIError.invalidArgument("Cannot demote yourself from HR role");
    }

    // Update the user's role
    await leaveDB.exec`
      UPDATE employees 
      SET role = ${req.newRole}
      WHERE id = ${req.employeeId}
    `;

    // Get updated employee data
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
      WHERE id = ${req.employeeId}
    `;

    if (!employee) {
      throw APIError.notFound("Employee not found");
    }

    return {
      employee,
      message: `User role updated to ${req.newRole} successfully`
    };
  }
);

interface AdminStatsResponse {
  totalEmployees: number;
  totalManagers: number;
  totalHR: number;
  totalLeaveRequests: number;
  pendingRequests: number;
  totalLeaveTypes: number;
}

/**
 * Gets admin dashboard statistics
 */
export const getAdminStats = api<void, AdminStatsResponse>(
  { expose: true, method: "GET", path: "/admin/stats", auth: true },
  async () => {
    const authData = getAuthData()!;
    
    // Only HR can access admin stats
    if (authData.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    const [
      employeeStats,
      managerStats,
      hrStats,
      totalRequests,
      pendingRequests,
      leaveTypes
    ] = await Promise.all([
      leaveDB.queryRow<{ count: number }>`SELECT COUNT(*) as count FROM employees WHERE role = 'employee'`,
      leaveDB.queryRow<{ count: number }>`SELECT COUNT(*) as count FROM employees WHERE role = 'manager'`,
      leaveDB.queryRow<{ count: number }>`SELECT COUNT(*) as count FROM employees WHERE role = 'hr'`,
      leaveDB.queryRow<{ count: number }>`SELECT COUNT(*) as count FROM leave_requests`,
      leaveDB.queryRow<{ count: number }>`SELECT COUNT(*) as count FROM leave_requests WHERE status = 'pending'`,
      leaveDB.queryRow<{ count: number }>`SELECT COUNT(*) as count FROM leave_types`
    ]);

    return {
      totalEmployees: employeeStats?.count || 0,
      totalManagers: managerStats?.count || 0,
      totalHR: hrStats?.count || 0,
      totalLeaveRequests: totalRequests?.count || 0,
      pendingRequests: pendingRequests?.count || 0,
      totalLeaveTypes: leaveTypes?.count || 0
    };
  }
);

interface SystemHealthResponse {
  status: 'healthy' | 'warning' | 'error';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail';
    message: string;
  }>;
  timestamp: string;
}

/**
 * System health check for administrators
 */
export const getSystemHealth = api<void, SystemHealthResponse>(
  { expose: true, method: "GET", path: "/admin/health", auth: true },
  async () => {
    const authData = getAuthData()!;
    
    // Only HR can access system health
    if (authData.role !== 'hr') {
      throw APIError.permissionDenied("Access denied. HR role required.");
    }

    const checks: Array<{
      name: string;
      status: 'pass' | 'fail';
      message: string;
    }> = [];
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    try {
      // Database connectivity check
      await leaveDB.queryRow`SELECT 1`;
      checks.push({ name: 'Database', status: 'pass', message: 'Database connection healthy' });
    } catch (error) {
      checks.push({ name: 'Database', status: 'fail', message: 'Database connection failed' });
      overallStatus = 'error';
    }

    try {
      // Admin users check
      const adminCount = await leaveDB.queryRow<{ count: number }>`SELECT COUNT(*) as count FROM employees WHERE role = 'hr'`;
      if (adminCount && adminCount.count > 0) {
        checks.push({ name: 'Admin Users', status: 'pass', message: `${adminCount.count} admin user(s) configured` });
      } else {
        checks.push({ name: 'Admin Users', status: 'fail', message: 'No admin users found' });
        overallStatus = 'error';
      }
    } catch (error) {
      checks.push({ name: 'Admin Users', status: 'fail', message: 'Failed to check admin users' });
      overallStatus = 'error';
    }

    try {
      // Leave types check
      const leaveTypesCount = await leaveDB.queryRow<{ count: number }>`SELECT COUNT(*) as count FROM leave_types`;
      if (leaveTypesCount && leaveTypesCount.count > 0) {
        checks.push({ name: 'Leave Types', status: 'pass', message: `${leaveTypesCount.count} leave type(s) configured` });
      } else {
        checks.push({ name: 'Leave Types', status: 'fail', message: 'No leave types configured' });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      }
    } catch (error) {
      checks.push({ name: 'Leave Types', status: 'fail', message: 'Failed to check leave types' });
      if (overallStatus === 'healthy') overallStatus = 'warning';
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString()
    };
  }
);