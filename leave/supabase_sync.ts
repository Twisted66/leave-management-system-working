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

    // TRANSACTION FIX: Use database transaction for atomicity
    const tx = leaveDB.begin();
    
    try {
      // Check if user already exists within transaction
      const existingEmployee = await tx.queryRow<Employee>`
        SELECT * FROM employees WHERE supabase_id = ${req.supabaseUserId}
      `;

      let employee: Employee;
      let created = false;

      if (existingEmployee) {
        // Update existing user within transaction
        const updatedEmployee = await tx.queryRow<{
          id: number;
          email: string;
          name: string;
          department: string;
          role: string;
          managerId: number | null;
          profileImageUrl: string | null;
          createdAt: Date;
          supabaseId: string;
        }>`
          UPDATE employees 
          SET email = ${req.email}, 
              name = ${req.name}, 
              department = ${req.department},
              role = ${req.role || 'employee'},
              manager_id = ${req.managerId || null},
              updated_at = NOW()
          WHERE supabase_id = ${req.supabaseUserId}
          RETURNING id, email, name, department, role, 
                    manager_id as "managerId", 
                    profile_image_url as "profileImageUrl",
                    created_at as "createdAt",
                    supabase_id as "supabaseId"
        `;

        if (!updatedEmployee) {
          throw new Error('UPDATE returned no rows - possible constraint violation');
        }

        employee = {
          ...updatedEmployee,
          role: updatedEmployee.role as 'employee' | 'manager' | 'hr',
          managerId: updatedEmployee.managerId || undefined,
          profileImageUrl: updatedEmployee.profileImageUrl || undefined
        };
        
        console.log(`✅ User updated: ${employee.email} (ID: ${employee.id})`);
      } else {
        // Create new user within transaction
        const newEmployee = await tx.queryRow<{
          id: number;
          email: string;
          name: string;
          department: string;
          role: string;
          managerId: number | null;
          profileImageUrl: string | null;
          createdAt: Date;
          supabaseId: string;
        }>`
          INSERT INTO employees (email, name, department, role, manager_id, supabase_id, created_at, updated_at)
          VALUES (${req.email}, ${req.name}, ${req.department}, ${req.role || 'employee'}, ${req.managerId || null}, ${req.supabaseUserId}, NOW(), NOW())
          RETURNING id, email, name, department, role, 
                    manager_id as "managerId", 
                    profile_image_url as "profileImageUrl",
                    created_at as "createdAt",
                    supabase_id as "supabaseId"
        `;

        if (!newEmployee) {
          throw new Error('INSERT returned no rows - possible constraint violation');
        }

        employee = {
          ...newEmployee,
          role: newEmployee.role as 'employee' | 'manager' | 'hr',
          managerId: newEmployee.managerId || undefined,
          profileImageUrl: newEmployee.profileImageUrl || undefined
        };
        created = true;
        
        console.log(`✅ User created: ${employee.email} (ID: ${employee.id})`);
      }

      // Commit the transaction
      await tx.commit();

      return {
        employee,
        created
      };
    } catch (error: any) {
      // Rollback transaction on any error
      await tx.rollback();
      
      // ENHANCED ERROR REPORTING: Specific error types
      console.error('Sync user error:', {
        supabaseUserId: req.supabaseUserId,
        email: req.email,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      if (error.message?.includes('constraint')) {
        throw APIError.invalidArgument(`Data constraint violation: ${error.message}`);
      }
      if (error.message?.includes('duplicate')) {
        throw APIError.alreadyExists('User already exists with this email or ID');
      }
      if (error.message?.includes('foreign key')) {
        throw APIError.invalidArgument('Invalid manager ID - manager does not exist');
      }
      
      throw APIError.internal(`Sync operation failed: ${error.message}`);
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
    const authData = getAuthData()!;
    
    // SECURITY FIX: Users can only access their own data unless they are HR
    if (authData.supabaseUserId !== req.supabaseUserId && authData.role !== 'hr') {
      throw APIError.permissionDenied('Access denied: You can only access your own user data');
    }
    
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
        supabaseId: string;
      }>`
        SELECT id, email, name, department, role, 
               manager_id as "managerId", 
               profile_image_url as "profileImageUrl",
               created_at as "createdAt",
               supabase_id as "supabaseId"
        FROM employees 
        WHERE supabase_id = ${req.supabaseUserId}
      `;

      if (!employee) {
        throw APIError.notFound('User not found');
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
      if (error instanceof APIError) {
        throw error;
      }
      console.error('Database error in getUser:', error);
      throw APIError.internal('Failed to get user data');
    }
  }
);