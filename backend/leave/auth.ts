import { api, APIError, Header, Cookie, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { leaveDB } from "./db";
import type { Employee } from "./types";
import * as jwt from "jsonwebtoken";
import * as jwksClient from "jwks-rsa";

// Auth0 configuration secrets
const auth0Domain = secret("Auth0Domain");
const auth0Audience = secret("Auth0Audience");

// JWKS client for fetching Auth0 public keys
const jwksClientInstance = jwksClient({
  jwksUri: `https://${auth0Domain()}/.well-known/jwks.json`,
  requestHeaders: {}, // Optional
  timeout: 30000, // Defaults to 30s
  cache: true,
  cacheMaxEntries: 5, // Default value
  cacheMaxAge: 600000, // Default value (10 minutes)
});

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

export interface AuthData {
  userID: string;
  email: string;
  role: 'employee' | 'manager' | 'hr';
  auth0Sub: string; // Auth0 subject identifier
}

/**
 * Gets the signing key from Auth0's JWKS endpoint
 */
function getKey(header: any, callback: any) {
  jwksClientInstance.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Validates Auth0 JWT token using RS256 algorithm
 */
async function validateAuth0Token(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: auth0Audience(),
        issuer: `https://${auth0Domain()}/`,
        algorithms: ['RS256']
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

/**
 * Auth0 Authentication Handler
 * 
 * This handler validates JWT tokens issued by Auth0 and maps them to internal user data.
 * 
 * Auth0 Configuration Required:
 * 1. Create an Auth0 tenant at https://auth0.com
 * 2. Create a Single Page Application (SPA) in your Auth0 dashboard
 * 3. Configure the following settings in your Auth0 application:
 *    - Allowed Callback URLs: https://yourdomain.com/callback
 *    - Allowed Logout URLs: https://yourdomain.com
 *    - Allowed Web Origins: https://yourdomain.com
 *    - Allowed Origins (CORS): https://yourdomain.com
 * 4. Set the following Encore secrets:
 *    - Auth0Domain: your-tenant.auth0.com
 *    - Auth0Audience: your-api-identifier (create an API in Auth0 dashboard)
 * 5. Configure Auth0 Rules or Actions to include custom claims:
 *    - Add user metadata like role, employee_id to the token
 * 
 * Example Auth0 Rule to add custom claims:
 * ```javascript
 * function addCustomClaims(user, context, callback) {
 *   const namespace = 'https://yourapp.com/';
 *   context.idToken[namespace + 'role'] = user.app_metadata.role || 'employee';
 *   context.idToken[namespace + 'employee_id'] = user.app_metadata.employee_id;
 *   context.accessToken[namespace + 'role'] = user.app_metadata.role || 'employee';
 *   context.accessToken[namespace + 'employee_id'] = user.app_metadata.employee_id;
 *   callback(null, user, context);
 * }
 * ```
 */
const auth = authHandler<AuthParams, AuthData>(
  async (params) => {
    // Get token from Authorization header or session cookie
    const token = params.authorization?.replace("Bearer ", "") ?? params.session?.value;
    
    if (!token) {
      throw APIError.unauthenticated("Missing authentication token");
    }

    try {
      // Validate the Auth0 JWT token
      const decoded = await validateAuth0Token(token);
      
      if (!decoded || !decoded.sub) {
        throw APIError.unauthenticated("Invalid token payload");
      }

      // Extract user information from token
      const auth0Sub = decoded.sub;
      const email = decoded.email;
      
      // Extract custom claims (adjust namespace to match your Auth0 configuration)
      const namespace = 'https://yourapp.com/';
      const role = decoded[namespace + 'role'] || 'employee';
      const employeeId = decoded[namespace + 'employee_id'];

      // If employee_id is provided in token, use it; otherwise look up by email
      let employee: Employee | null = null;
      
      if (employeeId) {
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
          WHERE id = ${employeeId}
        `;
      } else if (email) {
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
          WHERE email = ${email}
        `;
      }

      if (!employee) {
        throw APIError.unauthenticated("User not found in system");
      }

      // Update employee record with Auth0 subject if not already set
      if (!employee.auth0Sub) {
        await leaveDB.exec`
          UPDATE employees 
          SET auth0_sub = ${auth0Sub}
          WHERE id = ${employee.id}
        `;
      }

      return {
        userID: employee.id.toString(),
        email: employee.email,
        role: employee.role,
        auth0Sub: auth0Sub
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

// Configure the API gateway to use the Auth0 auth handler
export const gw = new Gateway({ authHandler: auth });

export { auth };

/**
 * Legacy login endpoint - deprecated in favor of Auth0
 * This endpoint is kept for backward compatibility but should not be used
 * with Auth0 authentication enabled.
 */
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  employee: Employee;
  token: string;
}

// Authenticates a user with email and password (DEPRECATED - use Auth0 instead).
export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    throw APIError.unimplemented("Login via email/password is disabled. Please use Auth0 authentication.");
  }
);

/**
 * Legacy register endpoint - deprecated in favor of Auth0
 * User registration should be handled through Auth0 signup flows
 */
interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  department: string;
  role?: 'employee' | 'manager' | 'hr';
  managerId?: number;
}

// Registers a new user account (DEPRECATED - use Auth0 instead).
export const register = api<RegisterRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    throw APIError.unimplemented("Registration via email/password is disabled. Please use Auth0 authentication.");
  }
);
