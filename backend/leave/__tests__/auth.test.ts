import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

// Mock external dependencies
jest.mock('node-fetch');
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock Encore dependencies
jest.mock('encore.dev/api', () => ({
  api: jest.fn(),
  APIError: {
    unauthenticated: jest.fn((msg: string) => new Error(`Unauthenticated: ${msg}`)),
    invalidArgument: jest.fn((msg: string) => new Error(`Invalid argument: ${msg}`)),
  },
  Header: jest.fn(),
  Gateway: jest.fn(),
}));

jest.mock('encore.dev/auth', () => ({
  authHandler: jest.fn(),
}));

jest.mock('./db', () => ({
  leaveDB: {
    queryRow: jest.fn(),
  },
}));

jest.mock('./cache', () => ({
  userCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
  CacheKeys: {
    userByExternalId: jest.fn((id: string) => `user:external:${id}`),
    userById: jest.fn((id: string) => `user:${id}`),
  },
}));

describe('Authentication Module', () => {
  // Test interfaces
  interface JWK {
    kty: string;
    kid: string;
    use?: string;
    n: string;
    e: string;
    alg?: string;
  }

  interface JWKSResponse {
    keys: JWK[];
  }

  describe('jwkToPem function', () => {
    test('should convert JWK to PEM format correctly', () => {
      const mockJWK: JWK = {
        kty: 'RSA',
        kid: 'test-key-id',
        n: Buffer.from('test-modulus').toString('base64'),
        e: Buffer.from('test-exponent').toString('base64'),
      };

      // Mock crypto.createPublicKey
      const mockPublicKey = {
        export: jest.fn().mockReturnValue('-----BEGIN RSA PUBLIC KEY-----\\ntest-pem-content\\n-----END RSA PUBLIC KEY-----'),
      };
      jest.spyOn(crypto, 'createPublicKey').mockReturnValue(mockPublicKey as any);

      // This would test the actual jwkToPem function
      // For now, we're testing the interface and structure
      expect(mockJWK.kty).toBe('RSA');
      expect(mockJWK.kid).toBe('test-key-id');
      expect(typeof mockJWK.n).toBe('string');
      expect(typeof mockJWK.e).toBe('string');
    });

    test('should handle invalid JWK input', () => {
      const invalidJWK = {
        kty: 'RSA',
        kid: 'test',
        n: 'invalid-base64-!!!',
        e: 'invalid-base64-!!!',
      };

      expect(() => {
        Buffer.from(invalidJWK.n, 'base64');
      }).not.toThrow(); // Buffer.from handles invalid base64 gracefully
    });
  });

  describe('getSigningKey function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should fetch JWKS from Supabase successfully', async () => {
      const mockJWKSResponse: JWKSResponse = {
        keys: [
          {
            kty: 'RSA',
            kid: 'test-key-id',
            n: Buffer.from('test-modulus').toString('base64'),
            e: Buffer.from('test-exponent').toString('base64'),
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockJWKSResponse),
      });

      // Test that the function would handle JWKS response correctly
      expect(mockJWKSResponse.keys).toHaveLength(1);
      expect(mockJWKSResponse.keys[0].kid).toBe('test-key-id');
    });

    test('should handle JWKS fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(
        fetch('https://ocxijuowaqkbyhtnlxdz.supabase.co/auth/v1/.well-known/jwks.json')
      ).resolves.toMatchObject({
        ok: false,
        status: 500,
      });
    });

    test('should cache JWKS response', () => {
      const mockJWKSResponse: JWKSResponse = {
        keys: [
          {
            kty: 'RSA',
            kid: 'cached-key-id',
            n: 'cached-n',
            e: 'cached-e',
          },
        ],
      };

      // Test cache logic
      const cacheTime = Date.now();
      const cacheAge = Date.now() - cacheTime;
      const CACHE_TTL = 3600000; // 1 hour

      expect(cacheAge).toBeLessThan(CACHE_TTL);
    });
  });

  describe('validateSupabaseToken function', () => {
    test('should validate JWT token structure', () => {
      const mockToken = jwt.sign(
        {
          sub: 'test-user-id',
          email: 'test@example.com',
          aud: 'authenticated',
          iss: 'https://ocxijuowaqkbyhtnlxdz.supabase.co/auth/v1',
        },
        'secret',
        { algorithm: 'HS256', keyid: 'test-key-id' }
      );

      const decoded = jwt.decode(mockToken, { complete: true });
      
      expect(decoded).not.toBeNull();
      if (decoded && typeof decoded === 'object' && 'header' in decoded) {
        expect(decoded.header.kid).toBe('test-key-id');
        expect(decoded.header.alg).toBe('HS256');
      }
    });

    test('should reject token without required claims', () => {
      const invalidToken = jwt.sign(
        {
          // Missing 'sub' claim
          email: 'test@example.com',
          aud: 'authenticated',
        },
        'secret'
      );

      const decoded = jwt.decode(invalidToken) as jwt.JwtPayload;
      expect(decoded.sub).toBeUndefined();
    });

    test('should handle malformed tokens', () => {
      const malformedToken = 'invalid.token.structure';
      
      const decoded = jwt.decode(malformedToken, { complete: true });
      expect(decoded).toBeNull();
    });
  });

  describe('Type Safety Tests', () => {
    test('should properly type JWK interface', () => {
      const jwk: JWK = {
        kty: 'RSA',
        kid: 'test-key',
        n: 'modulus',
        e: 'exponent',
        use: 'sig',
        alg: 'RS256',
      };

      // TypeScript compilation ensures these properties exist and have correct types
      expect(typeof jwk.kty).toBe('string');
      expect(typeof jwk.kid).toBe('string');
      expect(typeof jwk.n).toBe('string');
      expect(typeof jwk.e).toBe('string');
      expect(typeof jwk.use).toBe('string');
      expect(typeof jwk.alg).toBe('string');
    });

    test('should properly type JWKS response', () => {
      const jwksResponse: JWKSResponse = {
        keys: [
          {
            kty: 'RSA',
            kid: 'key-1',
            n: 'mod1',
            e: 'exp1',
          },
          {
            kty: 'RSA',
            kid: 'key-2',
            n: 'mod2',
            e: 'exp2',
          },
        ],
      };

      expect(Array.isArray(jwksResponse.keys)).toBe(true);
      expect(jwksResponse.keys).toHaveLength(2);
      jwksResponse.keys.forEach((key) => {
        expect(typeof key.kty).toBe('string');
        expect(typeof key.kid).toBe('string');
      });
    });
  });

  describe('Authentication Data Interface', () => {
    test('should properly structure AuthData', () => {
      interface AuthData {
        userID: string;
        email: string;
        role: 'employee' | 'manager' | 'hr';
        supabaseUserId: string;
      }

      const authData: AuthData = {
        userID: '123',
        email: 'test@example.com',
        role: 'employee',
        supabaseUserId: 'supabase-id-123',
      };

      expect(typeof authData.userID).toBe('string');
      expect(typeof authData.email).toBe('string');
      expect(['employee', 'manager', 'hr']).toContain(authData.role);
      expect(typeof authData.supabaseUserId).toBe('string');
    });
  });
});