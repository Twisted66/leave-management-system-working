import { api, APIError } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";
import { leaveDB } from "./db";
import * as jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
// Auth0 configuration secrets
const auth0Domain = secret("Auth0Domain");
const auth0Audience = secret("Auth0Audience");
// JWKS client for fetching Auth0 public keys
const jwksClientInstance = jwksClient({
    jwksUri: `https://${auth0Domain()}/.well-known/jwks.json`,
    requestHeaders: {},
    timeout: 30000,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000,
});
/**
 * Gets the signing key from Auth0's JWKS endpoint
 */
function getKey(header, callback) {
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
            }
            catch (error) {
                return callback(error);
            }
        });
    }
    catch (error) {
        return callback(error);
    }
}
/**
 * Validates Auth0 JWT token using RS256 algorithm
 */
async function validateAuth0Token(token) {
    return new Promise((resolve, reject) => {
        const verifyOptions = {
            audience: auth0Audience(),
            issuer: `https://${auth0Domain()}/`,
            algorithms: ['RS256']
        };
        const verifyCallback = (err, decoded) => {
            if (err) {
                return reject(err);
            }
            if (!decoded || typeof decoded === 'string') {
                return reject(new Error('Invalid token payload'));
            }
            resolve(decoded);
        };
        // Use the getKey function as the secret provider
        const getKeyWithFallback = (header, callback) => {
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
export const authenticate = async (req, res, next) => {
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
            // Get or create employee in database
            const [employee] = await leaveDB.query `
        INSERT INTO employees (email, name, role, auth0_sub)
        VALUES (${decoded.email || ''}, ${decoded.name || ''}, 'employee', ${decoded.sub})
        ON CONFLICT (auth0_sub) DO UPDATE
        SET email = EXCLUDED.email, name = EXCLUDED.name
        RETURNING id, email, role, auth0_sub as "auth0Sub"
      `;
            if (!employee) {
                throw new Error('Failed to create or update employee');
            }
            // Attach user to request object
            req.user = {
                userID: employee.id.toString(),
                email: employee.email,
                role: (employee.role || 'employee'),
                auth0Sub: employee.auth0Sub
            };
            next();
        }
        catch (error) {
            console.error('Authentication error:', error);
            res.status(401).json({ error: 'Invalid or expired token' });
            return undefined;
        }
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return undefined;
    }
};
/**
 * Role-based authorization middleware
 */
export const authorize = (roles) => {
    return (req, res, next) => {
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
export const auth = authHandler(async (params) => {
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
        // Get or create employee in database
        const [employee] = await leaveDB.query `
        INSERT INTO employees (email, name, role, auth0_sub)
        VALUES (${decoded.email || ''}, ${decoded.name || ''}, 'employee', ${decoded.sub})
        ON CONFLICT (auth0_sub) DO UPDATE
        SET email = EXCLUDED.email, name = EXCLUDED.name
        RETURNING id, email, role, auth0_sub as "auth0Sub"
      `;
        if (!employee) {
            throw new Error('Failed to create or update employee');
        }
        return {
            userID: employee.id.toString(),
            email: employee.email,
            role: (employee.role || 'employee'),
            auth0Sub: employee.auth0Sub
        };
    }
    catch (error) {
        console.error('Authentication error:', error);
        throw APIError.unauthenticated('Invalid or expired token');
    }
});
export const login = api({ expose: true, method: "POST", path: "/auth/login" }, async (req) => {
    throw APIError.unimplemented('This endpoint is deprecated. Please use Auth0 for authentication.');
});
export const register = api({ expose: true, method: "POST", path: "/auth/register" }, async (req) => {
    throw APIError.unimplemented('This endpoint is deprecated. Please use Auth0 for user registration.');
});
//# sourceMappingURL=auth.js.map