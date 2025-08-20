import { api, APIError } from "encore.dev/api";
import { leaveDB } from "./db";
import type { Employee } from "./types";

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  employee: Employee;
  token: string;
}

// Authenticates a user with email and password.
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    // In a real app, you would hash and verify the password
    // For demo purposes, we'll use simple email-based authentication
    
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
      WHERE email = ${req.email}
    `;

    if (!employee) {
      throw APIError.unauthenticated("Invalid email or password");
    }

    // For demo purposes, accept any password for existing users
    // In production, you would verify the hashed password here
    
    // Generate a simple token (in production, use JWT or similar)
    const token = `token_${employee.id}_${Date.now()}`;

    return {
      employee,
      token
    };
  }
);

interface ValidateTokenRequest {
  token: string;
}

interface ValidateTokenResponse {
  employee: Employee;
}

// Validates an authentication token and returns the associated employee.
export const validateToken = api<ValidateTokenRequest, ValidateTokenResponse>(
  { expose: true, method: "POST", path: "/auth/validate" },
  async (req) => {
    // Extract employee ID from token (simple demo implementation)
    const tokenParts = req.token.split('_');
    if (tokenParts.length !== 3 || tokenParts[0] !== 'token') {
      throw APIError.unauthenticated("Invalid token");
    }

    const employeeId = parseInt(tokenParts[1]);
    if (isNaN(employeeId)) {
      throw APIError.unauthenticated("Invalid token");
    }

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
      WHERE id = ${employeeId}
    `;

    if (!employee) {
      throw APIError.unauthenticated("Invalid token");
    }

    return { employee };
  }
);
