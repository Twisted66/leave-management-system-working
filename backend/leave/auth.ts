import { api, APIError, Header, Cookie, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { leaveDB } from "./db";
import type { Employee } from "./types";
import { userCache, CacheKeys } from "./cache";
import * as jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

// Auth0 configuration secrets
const auth0Domain = secret("Auth0Domain");
const auth0Audience = secret("Auth0Audience");

// JWKS client for fetching Auth0 public keys - PRODUCTION OPTIMIZED
const jwksClientInstance = jwksClient({
  jwksUri: `https://${auth0Domain()}/.well-known/jwks.json`,
  requestHeaders: {},
  timeout: 5000, // Reduced from 30s to 5s for production
  cache: true,
  cacheMaxEntries: 20, // Increased for better scaling
  cacheMaxAge: 3600000, // 1 hour cache (increased from 10 minutes)
  rateLimit: true,
  jwksRequestsPerMinute: 10, // Rate limiting for production
});

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

export interface AuthData {
  userID: string;
  email: string;
  role: 'employee' | 'manager' | 'hr';
  auth0Sub: string;
}

/**
 * Gets the signing key from Auth0's JWKS endpoint
 */
function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback): void {
  try {
    if (!header.kid) {
      return callback(new Error('No key ID found in token header'));
    }
    
    jwksClientInstance.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return callback(err);
      }
      if (!key) {
        return callback(new Error('No key found'));
      }
      try {
        const signingKey = key.getPublicKey();
        return callback(null, signingKey);
      } catch (error) {
        return callback(error as Error);
      }
    });
  } catch (error) {
    return callback(error as Error);
  }
}

/**
 * Validates Auth0 JWT token using RS256 algorithm
 */
async function validateAuth0Token(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    const verifyOptions: jwt.VerifyOptions = {
      audience: auth0Audience(),
      issuer: `https://${auth0Domain()}/`,
      algorithms: ['RS256']
    };

    const verifyCallback: jwt.VerifyCallback = (err, decoded) => {
      if (err) {
        return reject(err);
      }
      if (!decoded || typeof decoded === 'string') {
        return reject(new Error('Invalid token payload'));
      }
      resolve(decoded as jwt.JwtPayload);
    };

    // Use the getKey function as the secret provider
    const getKeyWithFallback = (header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) => {
      getKey(header, (err, key) => {
        if (err) {
          return callback(err);
        }
        callback(null, key);
      });
    };

    jwt.verify(token, getKeyWithFallback, verifyOptions, verifyCallback);
  });
}

/**
 * Authentication middleware for Express
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header' });
      return undefined;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme.toLowerCase() !== 'bearer' || !token) {
      res.status(401).json({ error: 'Invalid authorization header format' });
      return undefined;
    }

    try {
      const decoded = await validateAuth0Token(token);
      
      if (!decoded.sub) {
        res.status(401).json({ error: 'Invalid token: missing sub claim' });
        return undefined;
      }

      // Check cache first
      let employee = userCache.get(CacheKeys.userByAuth0Sub(decoded.sub));
      
      if (!employee) {
        // Get or create employee in database
        const dbEmployee = await leaveDB.queryRow<{id: number, email: string, role: string, auth0Sub: string}>`
          INSERT INTO employees (email, name, role, auth0_sub)
          VALUES (${decoded.email || ''}, ${decoded.name || ''}, 'employee', ${decoded.sub})
          ON CONFLICT (auth0_sub) DO UPDATE
          SET email = EXCLUDED.email, name = EXCLUDED.name
          RETURNING id, email, role, auth0_sub as "auth0Sub"
        `;

        if (!dbEmployee) {
          throw new Error('Failed to create or update employee');
        }

        // Convert to Employee type and cache
        employee = {
          id: dbEmployee.id,
          email: dbEmployee.email,
          name: decoded.name || dbEmployee.email,
          department: 'General', // Default department
          role: dbEmployee.role as 'employee' | 'manager' | 'hr',
          managerId: null,
          profileImageUrl: null,
          createdAt: new Date(),
          auth0Sub: dbEmployee.auth0Sub
        };

        // Cache the user
        userCache.set(CacheKeys.userByAuth0Sub(decoded.sub), employee);
        userCache.set(CacheKeys.userById(employee.id), employee);
      }

      if (!employee) {
        throw new Error('Failed to create or update employee');
      }

      // Attach user to request object
      req.user = {
        userID: employee.id.toString(),
        email: employee.email,
        role: employee.role,
        auth0Sub: employee.auth0Sub
      };

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Authentication failed' 
        : 'Invalid or expired token';
      res.status(401).json({ error: errorMessage });
      return undefined;
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    const errorMessage = process.env.NODE_ENV === 'production'
      ? 'Authentication failed'
      : 'Internal server error';
    res.status(500).json({ error: errorMessage });
    return undefined;
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (roles: ('employee' | 'manager' | 'hr')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return undefined;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return undefined;
    }

    next();
  };
};

// Encore auth handler
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
      const decoded = await validateAuth0Token(token);
      
      if (!decoded.sub) {
        throw APIError.unauthenticated('Invalid token: missing sub claim');
      }

      // Check cache first
      let employee = userCache.get(CacheKeys.userByAuth0Sub(decoded.sub));
      
      if (!employee) {
        // Get or create employee in database
        const dbEmployee = await leaveDB.queryRow<{id: number, email: string, role: string, auth0Sub: string}>`
          INSERT INTO employees (email, name, role, auth0_sub)
          VALUES (${decoded.email || ''}, ${decoded.name || ''}, 'employee', ${decoded.sub})
          ON CONFLICT (auth0_sub) DO UPDATE
          SET email = EXCLUDED.email, name = EXCLUDED.name
          RETURNING id, email, role, auth0_sub as "auth0Sub"
        `;

        if (!dbEmployee) {
          throw new Error('Failed to create or update employee');
        }

        // Convert to Employee type and cache
        employee = {
          id: dbEmployee.id,
          email: dbEmployee.email,
          name: decoded.name || dbEmployee.email,
          department: 'General',
          role: dbEmployee.role as 'employee' | 'manager' | 'hr',
          managerId: null,
          profileImageUrl: null,
          createdAt: new Date(),
          auth0Sub: dbEmployee.auth0Sub
        };

        // Cache the user
        userCache.set(CacheKeys.userByAuth0Sub(decoded.sub), employee);
        userCache.set(CacheKeys.userById(employee.id), employee);
      }

      if (!employee) {
        throw new Error('Failed to create or update employee');
      }

      return {
        userID: employee.id.toString(),
        email: employee.email,
        role: employee.role,
        auth0Sub: employee.auth0Sub
      };
    } catch (error) {
      console.error('Authentication error:', error);
      // Sanitize error for production
      if (process.env.NODE_ENV === 'production') {
        throw APIError.unauthenticated('Authentication failed');
      } else {
        throw APIError.unauthenticated('Invalid or expired token');
      }
    }
  }
);

// Legacy login endpoint - deprecated in favor of Auth0
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  employee: Employee;
  token: string;
}

export const login = api<LoginRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/login" },
  async (req) => {
    throw APIError.unimplemented('This endpoint is deprecated. Please use Auth0 for authentication.');
  }
);

// Legacy register endpoint - deprecated in favor of Auth0
interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  department: string;
  role?: 'employee' | 'manager' | 'hr';
  managerId?: number;
}

export const register = api<RegisterRequest, LoginResponse>(
  { expose: true, method: "POST", path: "/auth/register" },
  async (req) => {
    throw APIError.unimplemented('This endpoint is deprecated. Please use Auth0 for user registration.');
  }
);
