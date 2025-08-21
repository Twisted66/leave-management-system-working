import { api, APIError, Header, Cookie } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { leaveDB } from "./db";
import type { Employee } from "./types";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";

const jwtSecret = secret("JWTSecret");

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  employee: Employee;
  token: string;
}

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

export interface AuthData {
  userID: string;
  email: string;
  role: 'employee' | 'manager' | 'hr';
}

// Authenticates a user with email and password.
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    const employee = await leaveDB.queryRow<Employee & { password_hash: string }>`
      SELECT 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
        profile_image_url as "profileImageUrl",
        created_at as "createdAt",
        password_hash
      FROM employees
      WHERE email = ${req.email}
    `;

    if (!employee) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(req.password, employee.password_hash);
    if (!isValidPassword) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: employee.id.toString(),
        email: employee.email,
        role: employee.role
      },
      jwtSecret(),
      { expiresIn: '24h' }
    );

    // Remove password hash from response
    const { password_hash, ...employeeData } = employee;

    return {
      employee: employeeData,
      token
    };
  }
);

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  department: string;
  role?: 'employee' | 'manager' | 'hr';
  managerId?: number;
}

// Registers a new user account.
export const register = api<RegisterRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    // Check if user already exists
    const existingUser = await leaveDB.queryRow<{ id: number }>`
      SELECT id FROM employees WHERE email = ${req.email}
    `;

    if (existingUser) {
      throw APIError.alreadyExists("User with this email already exists");
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(req.password, saltRounds);

    // Create employee
    const employee = await leaveDB.queryRow<Employee>`
      INSERT INTO employees (email, name, department, role, manager_id, password_hash)
      VALUES (${req.email}, ${req.name}, ${req.department}, ${req.role || 'employee'}, ${req.managerId || null}, ${passwordHash})
      RETURNING 
        id,
        email,
        name,
        department,
        role,
        manager_id as "managerId",
        profile_image_url as "profileImageUrl",
        created_at as "createdAt"
    `;

    if (!employee) {
      throw new Error("Failed to create employee");
    }

    // Initialize leave balances for the new employee
    if (employee.role !== 'hr') {
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

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: employee.id.toString(),
        email: employee.email,
        role: employee.role
      },
      jwtSecret(),
      { expiresIn: '24h' }
    );

    return {
      employee,
      token
    };
  }
);

// Auth handler for protecting endpoints
const auth = authHandler<AuthParams, AuthData>(
  async (params) => {
    // Get token from Authorization header or session cookie
    const token = params.authorization?.replace("Bearer ", "") ?? params.session?.value;
    
    if (!token) {
      throw APIError.unauthenticated("Missing authentication token");
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, jwtSecret()) as any;
      
      // Verify user still exists in database
      const employee = await leaveDB.queryRow<Employee>`
        SELECT 
          id,
          email,
          name,
          department,
          role,
          manager_id as "managerId",
          profile_image_url as "profileImageUrl",
          created_at as "createdAt"
        FROM employees
        WHERE id = ${parseInt(decoded.userId)}
      `;

      if (!employee) {
        throw APIError.unauthenticated("User not found");
      }

      return {
        userID: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw APIError.unauthenticated("Invalid token");
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw APIError.unauthenticated("Token expired");
      }
      throw error;
    }
  }
);

export { auth };
