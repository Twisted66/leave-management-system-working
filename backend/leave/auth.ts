import { api, APIError, Header } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { leaveDB } from "./db";
import type { Employee } from "./types";
import { userCache, CacheKeys } from "./cache";
import * as jwt from "jsonwebtoken";

interface AuthParams {
  authorization?: Header<"Authorization">;
}

export interface AuthData {
  userID: string;
  email: string;
  role: 'employee' | 'manager' | 'hr';
  supabaseUserId: string;
}

// Supabase JWT secret for verification
const supabaseJwtSecret = secret("SupabaseJwtSecret");

/**
 * Validates Supabase JWT token
 */
async function validateSupabaseToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, supabaseJwtSecret(), {
      algorithms: ['HS256']
    }, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      if (!decoded || typeof decoded === 'string') {
        return reject(new Error('Invalid token payload'));
      }
      resolve(decoded as jwt.JwtPayload);
    });
  });
}





// Encore auth handler for Supabase
export const auth = authHandler(
  async (params: AuthParams): Promise<AuthData> => {
    const authHeader = params.authorization;
    if (!authHeader) {
      throw APIError.unauthenticated('No authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme.toLowerCase() !== 'bearer' || !token) {
      throw APIError.invalidArgument('Invalid authorization header format');
    }

    try {
      const decoded = await validateSupabaseToken(token);
      
      if (!decoded.sub || !decoded.email) {
        throw APIError.unauthenticated('Invalid token: missing claims');
      }

      // Check cache first
      let employee = userCache.get(CacheKeys.userByExternalId(decoded.sub));
      
      if (!employee) {
        // Get or create employee in database with proper role assignment
        const defaultRole = decoded.email === 'admin@example.com' ? 'hr' : 'employee';
        const defaultName = decoded.user_metadata?.name || decoded.email?.split('@')[0] || 'User';
        const defaultDepartment = decoded.email === 'admin@example.com' ? 'IT' : 'General';
        
        const dbEmployee = await leaveDB.queryRow<{id: number, email: string, role: string, auth0Sub: string, department: string, name: string}>`
          INSERT INTO employees (email, name, department, role, auth0_sub)
          VALUES (${decoded.email}, ${defaultName}, ${defaultDepartment}, ${defaultRole}, ${decoded.sub})
          ON CONFLICT (auth0_sub) DO UPDATE
          SET email = EXCLUDED.email, name = EXCLUDED.name
          RETURNING id, email, name, department, role, auth0_sub as "auth0Sub"
        `;

        if (!dbEmployee) {
          throw new Error('Failed to create or update employee');
        }

        // Convert to Employee type and cache
        employee = {
          id: dbEmployee.id,
          email: dbEmployee.email,
          name: dbEmployee.name,
          department: dbEmployee.department,
          role: dbEmployee.role as 'employee' | 'manager' | 'hr',
          managerId: undefined,
          profileImageUrl: undefined,
          createdAt: new Date(),
          auth0Sub: dbEmployee.auth0Sub
        };

        // Cache the user
        userCache.set(CacheKeys.userByExternalId(decoded.sub), employee);
        userCache.set(CacheKeys.userById(employee.id), employee);
      }

      if (!employee) {
        throw new Error('Failed to create or get employee');
      }

      return {
        userID: employee.id.toString(),
        email: employee.email,
        role: employee.role,
        supabaseUserId: decoded.sub
      };
    } catch (error) {
      throw APIError.unauthenticated('Authentication failed');
    }
  }
);

// Simple login endpoint for Supabase (if needed for backend-only operations)
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  employee: Employee;
  message: string;
}

export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    // This is now handled by Supabase frontend
    // Backend just needs to verify tokens
    throw APIError.unimplemented('Use Supabase authentication on the frontend');
  }
);
