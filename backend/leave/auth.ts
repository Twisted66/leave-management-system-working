import { api, APIError, Header } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { leaveDB } from "./db";
import type { Employee } from "./types";
import { userCache, CacheKeys } from "./cache";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";

interface AuthParams {
  authorization: Header<"Authorization">;
}

export interface AuthData {
  userID: string;
  email: string;
  role: 'employee' | 'manager' | 'hr';
  supabaseUserId: string;
}

// Supabase JWKS endpoint and key info
const SUPABASE_PROJECT_URL = 'https://ocxijuowaqkbyhtnlxdz.supabase.co';
const SUPABASE_JWKS_URL = `${SUPABASE_PROJECT_URL}/auth/v1/.well-known/jwks.json`;

// Cache for JWKS keys
let jwksCache: any = null;
let jwksCacheTime: number = 0;
const JWKS_CACHE_TTL = 3600000; // 1 hour

/**
 * Converts a JWK to a PEM public key.
 */
function jwkToPem(jwk: any): string {
  const modulus = Buffer.from(jwk.n, 'base64');
  const exponent = Buffer.from(jwk.e, 'base64');

  const pubKey = crypto.createPublicKey({
    key: {
      kty: 'RSA',
      n: modulus,
      e: exponent,
    },
    format: 'jwk'
  });

  return pubKey.export({ type: 'pkcs1', format: 'pem' }) as string;
}

/**
 * Fetches JWKS from Supabase, with caching.
 */
async function getSigningKey(kid: string): Promise<string> {
  const now = Date.now();
  if (!jwksCache || (now - jwksCacheTime) > JWKS_CACHE_TTL) {
    try {
      const response = await fetch(SUPABASE_JWKS_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
      }
      jwksCache = await response.json();
      jwksCacheTime = now;
      console.log('🔑 JWKS fetched and cached successfully.');
    } catch (error) {
      console.error('❌ Failed to fetch JWKS:', error);
      throw new Error('Could not fetch signing keys.');
    }
  }

  const key = jwksCache.keys.find((k: any) => k.kid === kid);
  if (!key) {
    throw new Error('Signing key not found.');
  }

  return jwkToPem(key);
}

/**
 * Validates Supabase JWT token using RS256 and JWKS.
 */
async function validateSupabaseToken(token: string): Promise<jwt.JwtPayload> {
  console.log('🔍 Validating Supabase token...');
  const decodedToken = jwt.decode(token, { complete: true });
  if (!decodedToken || !decodedToken.header.kid) {
    throw new Error('Invalid token or missing KID.');
  }

  const kid = decodedToken.header.kid;
  const pem = await getSigningKey(kid);

  try {
    const decoded = jwt.verify(token, pem, {
      algorithms: ['RS256'],
      issuer: `https://${SUPABASE_PROJECT_URL.split('//')[1]}`,
      audience: 'authenticated',
    }) as jwt.JwtPayload;

    console.log('✅ Token verification successful');
    if (!decoded.sub) {
      throw new Error('Token missing required "sub" claim.');
    }
    return decoded;
  } catch (err: any) {
    console.error('❌ Token validation error:', err.message);
    throw new Error(`Token validation failed: ${err.message}`);
  }
}

// Encore auth handler - Back to original simple pattern
export const authHandlerImpl = authHandler<AuthParams, AuthData>(
  async (params) => {
    console.log('🚀 AUTH HANDLER INVOKED! 🚀');
    console.log('🔍 Auth params:', Object.keys(params));
    console.log('🔍 Authorization header present:', !!params.authorization);
    
    const authHeader = params.authorization;
    if (!authHeader) {
      console.log('❌ No authorization header');
      throw APIError.unauthenticated('No authorization header');
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme.toLowerCase() !== 'bearer' || !token) {
      console.log('❌ Invalid auth format');
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
        console.log('📄 Employee not in cache, querying database');
        const dbEmployee = await leaveDB.queryRow<Employee & { supabaseId: string }>`
          SELECT id, email, name, department, role, manager_id as "managerId", profile_image_url as "profileImageUrl", created_at as "createdAt", supabase_id as "supabaseId"
          FROM employees WHERE supabase_id = ${decoded.sub}
        `;

        if (!dbEmployee) {
          console.log('❌ User not found in database');
          throw APIError.unauthenticated('User not found in the system.');
        }
        employee = dbEmployee;
        userCache.set(CacheKeys.userByExternalId(decoded.sub), employee);
        userCache.set(CacheKeys.userById(employee.id), employee);
        console.log('✅ Employee cached');
      } else {
        console.log('✅ Employee found in cache');
      }

      console.log('✅ Auth successful for user:', employee.email);
      return {
        userID: employee.id.toString(),
        email: employee.email,
        role: employee.role,
        supabaseUserId: decoded.sub
      };
    } catch (error: any) {
      console.error('❌ Authentication error:', error);
      throw APIError.unauthenticated(`Authentication failed: ${error.message}`);
    }
  }
);

// Test endpoint to verify auth handler is working
export const testAuth = api<void, { message: string, user: any }>(
  { expose: true, method: "GET", path: "/auth/test", auth: true },
  async () => {
    console.log('🧪 Test auth endpoint called');
    // This should have auth data if handler worked
    return { 
      message: "Auth handler is working!",
      user: "User data would be populated by auth handler"
    };
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