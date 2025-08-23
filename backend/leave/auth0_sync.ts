import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { leaveDB } from "./db";
import type { Employee } from "./types";

/**
 * User Synchronization Endpoints for Supabase
 * 
 * These endpoints help synchronize user data between Supabase and the internal database.
 */

interface SyncUserRequest {
  supabaseUserId: string;
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
 * Synchronizes a user from Supabase to the internal database
 */
export const syncUser = api<SyncUserRequest, SyncUserResponse>(
  { expose: true, method: "POST", path: "/auth/sync-user", auth: true },
  async (req) => {
    const authData = getAuthData()!;
    
    // Only allow HR users to sync other users
    if (authData.role !== 'hr') {
      throw APIError.permissionDenied('Only HR users can sync user data');
    }

    try {
      // Check if user already exists
      const existingEmployee = await leaveDB.queryRow<Employee>`
        SELECT * FROM employees WHERE auth0_sub = ${req.supabaseUserId}
      `;

      let employee: Employee;
      let created = false;

      if (existingEmployee) {
        // Update existing user
        const updatedEmployee = await leaveDB.queryRow<{
          id: number;
          email: string;
          name: string;
          department: string;
          role: string;
          managerId: number | null;
          profileImageUrl: string | null;
          createdAt: Date;
          auth0Sub: string;
        }>`
          UPDATE employees 
          SET email = ${req.email}, 
              name = ${req.name}, 
              department = ${req.department},
              role = ${req.role || 'employee'},
              manager_id = ${req.managerId || null}
          WHERE auth0_sub = ${req.supabaseUserId}
          RETURNING id, email, name, department, role, 
                    manager_id as "managerId", 
                    profile_image_url as "profileImageUrl",
                    created_at as "createdAt",
                    auth0_sub as "auth0Sub"
        `;

        if (!updatedEmployee) {
          throw new Error('Failed to update employee');
        }

        employee = {
          ...updatedEmployee,
          role: updatedEmployee.role as 'employee' | 'manager' | 'hr',
          managerId: updatedEmployee.managerId || undefined,
          profileImageUrl: updatedEmployee.profileImageUrl || undefined
        };
      } else {
        // Create new user
        const newEmployee = await leaveDB.queryRow<{
          id: number;
          email: string;
          name: string;
          department: string;
          role: string;
          managerId: number | null;
          profileImageUrl: string | null;
          createdAt: Date;
          auth0Sub: string;
        }>`
          INSERT INTO employees (email, name, department, role, manager_id, auth0_sub)
          VALUES (${req.email}, ${req.name}, ${req.department}, ${req.role || 'employee'}, ${req.managerId || null}, ${req.supabaseUserId})
          RETURNING id, email, name, department, role, 
                    manager_id as "managerId", 
                    profile_image_url as "profileImageUrl",
                    created_at as "createdAt",
                    auth0_sub as "auth0Sub"
        `;

        if (!newEmployee) {
          throw new Error('Failed to create employee');
        }

        employee = {
          ...newEmployee,
          role: newEmployee.role as 'employee' | 'manager' | 'hr',
          managerId: newEmployee.managerId || undefined,
          profileImageUrl: newEmployee.profileImageUrl || undefined
        };
        created = true;
      }

      return {
        employee,
        created
      };
    } catch (error) {
      throw APIError.internal('Failed to sync user data');
    }
  }
);

interface GetUserRequest {
  supabaseUserId: string;
}

interface GetUserResponse {
  employee: Employee | null;
}

/**
 * Gets user data by Supabase user ID
 */
export const getUser = api<GetUserRequest, GetUserResponse>(
  { expose: true, method: "GET", path: "/auth/user/:supabaseUserId", auth: true },
  async (req) => {
    try {
      const employee = await leaveDB.queryRow<{
        id: number;
        email: string;
        name: string;
        department: string;
        role: string;
        managerId: number | null;
        profileImageUrl: string | null;
        createdAt: Date;
        auth0Sub: string;
      }>`
        SELECT id, email, name, department, role, 
               manager_id as "managerId", 
               profile_image_url as "profileImageUrl",
               created_at as "createdAt",
               auth0_sub as "auth0Sub"
        FROM employees 
        WHERE auth0_sub = ${req.supabaseUserId}
      `;

      if (!employee) {
        return { employee: null };
      }

      return {
        employee: {
          ...employee,
          role: employee.role as 'employee' | 'manager' | 'hr',
          managerId: employee.managerId || undefined,
          profileImageUrl: employee.profileImageUrl || undefined
        }
      };
    } catch (error) {
      throw APIError.internal('Failed to get user data');
    }
  }
);