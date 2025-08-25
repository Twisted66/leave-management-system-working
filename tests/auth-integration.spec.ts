import { test, expect, type Page } from '@playwright/test';

/**
 * Comprehensive Supabase Authentication Integration Tests
 * 
 * This test suite verifies the complete authentication flow between:
 * - Frontend React SPA with Supabase Auth
 * - Backend API with JWT token validation
 * - User synchronization between Supabase and backend database
 * 
 * Test Environment:
 * - Frontend: http://127.0.0.1:4000/ (Encore static hosting)
 * - Backend API: http://127.0.0.1:4000/ (Encore.dev)
 */

// Test user credentials (from migration files)
const TEST_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'admin123',
  supabaseUserId: 'eb49b337-d813-421b-ba5a-d7519e89b7f4'
};

// Helper function to wait for authentication state
async function waitForAuthState(page: Page, isAuthenticated: boolean) {
  await page.waitForFunction(
    (expectedState) => {
      const authContextElement = document.querySelector('[data-testid="auth-state"]');
      if (!authContextElement) return false;
      const isAuth = authContextElement.getAttribute('data-authenticated') === 'true';
      return isAuth === expectedState;
    },
    isAuthenticated,
    { timeout: 10000 }
  );
}

// Helper function to extract JWT token from localStorage/sessionStorage
async function extractJWTToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    // Check for Supabase session in localStorage
    const supabaseAuthKey = Object.keys(localStorage).find(key => 
      key.includes('supabase.auth.token')
    );
    
    if (supabaseAuthKey) {
      const authData = JSON.parse(localStorage.getItem(supabaseAuthKey) || '{}');
      return authData?.access_token || null;
    }
    
    return null;
  });
}

// Helper function to verify JWT token structure
function verifyJWTStructure(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));
    
    // Verify required JWT fields
    return !!(
      header.alg && 
      header.typ === 'JWT' &&
      payload.sub &&
      payload.email &&
      payload.aud &&
      payload.exp &&
      payload.iat
    );
  } catch {
    return false;
  }
}

test.describe('Supabase Authentication Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should display login form when not authenticated', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login page
    await expect(page).toHaveURL('/login');
    
    // Verify login form elements are present
    await expect(page.locator('input[id="email"]')).toBeVisible();
    await expect(page.locator('input[id="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Verify page title and branding
    await expect(page.locator('h2')).toContainText('Sign In');
    await expect(page.locator('text=Leave Management System - v2.0')).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in invalid credentials
    await page.fill('input[id="email"]', 'invalid@example.com');
    await page.fill('input[id="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text*=❌')).toBeVisible({ timeout: 10000 });
    
    // Should still be on login page
    await expect(page).toHaveURL('/login');
  });

  test('should successfully authenticate with valid Supabase credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in valid credentials
    await page.fill('input[id="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[id="password"]', TEST_CREDENTIALS.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await expect(page.locator('text*=✅')).toBeVisible({ timeout: 15000 });
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL('/', { timeout: 15000 });
    
    // Verify we're actually authenticated by checking for dashboard elements
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should properly handle JWT tokens after authentication', async ({ page }) => {
    await page.goto('/login');
    
    // Login with valid credentials
    await page.fill('input[id="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[id="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for successful authentication
    await expect(page).toHaveURL('/', { timeout: 15000 });
    
    // Extract JWT token from browser storage
    const jwtToken = await extractJWTToken(page);
    
    expect(jwtToken).toBeTruthy();
    expect(typeof jwtToken).toBe('string');
    
    if (jwtToken) {
      // Verify JWT token structure
      expect(verifyJWTStructure(jwtToken)).toBeTruthy();
      
      // Decode and verify token claims
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      
      expect(payload.email).toBe(TEST_CREDENTIALS.email);
      expect(payload.sub).toBeTruthy(); // Supabase user ID
      expect(payload.aud).toBe('authenticated');
      expect(payload.exp).toBeGreaterThan(Date.now() / 1000); // Not expired
    }
  });

  test('should access backend auth endpoints with valid token', async ({ page }) => {
    // First, authenticate
    await page.goto('/login');
    await page.fill('input[id="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[id="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
    
    // Extract JWT token
    const jwtToken = await extractJWTToken(page);
    expect(jwtToken).toBeTruthy();
    
    // Test backend auth endpoint
    const authTestResponse = await page.evaluate(async (token) => {
      const response = await fetch('/auth/test', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      return {
        status: response.status,
        ok: response.ok,
        data: response.ok ? await response.json() : await response.text()
      };
    }, jwtToken);
    
    expect(authTestResponse.status).toBe(200);
    expect(authTestResponse.ok).toBe(true);
    expect(authTestResponse.data).toHaveProperty('message');
  });

  test('should verify user synchronization between Supabase and backend', async ({ page }) => {
    // Authenticate first
    await page.goto('/login');
    await page.fill('input[id="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[id="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
    
    // Extract JWT token
    const jwtToken = await extractJWTToken(page);
    expect(jwtToken).toBeTruthy();
    
    if (jwtToken) {
      // Decode token to get Supabase user ID
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      const supabaseUserId = payload.sub;
      
      // Test the getUser endpoint to verify backend database sync
      const userDataResponse = await page.evaluate(async (args) => {
        const response = await fetch(`/auth/user/${args.userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${args.token}`,
            'Content-Type': 'application/json'
          }
        });
        
        return {
          status: response.status,
          ok: response.ok,
          data: response.ok ? await response.json() : await response.text()
        };
      }, { userId: supabaseUserId, token: jwtToken });
      
      expect(userDataResponse.status).toBe(200);
      expect(userDataResponse.ok).toBe(true);
      
      const userData = userDataResponse.data as { employee: any };
      expect(userData.employee).toBeTruthy();
      expect(userData.employee.email).toBe(TEST_CREDENTIALS.email);
      expect(userData.employee.role).toBeTruthy();
    }
  });

  test('should protect routes and redirect unauthenticated users', async ({ page }) => {
    // Try to access protected routes without authentication
    const protectedRoutes = [
      '/dashboard',
      '/employees',
      '/leave-requests',
      '/my-requests',
      '/reports',
      '/documents',
      '/settings'
    ];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      
      // Should show login form
      await expect(page.locator('input[id="email"]')).toBeVisible();
    }
  });

  test('should maintain authentication state across page refreshes', async ({ page }) => {
    // Authenticate first
    await page.goto('/login');
    await page.fill('input[id="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[id="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
    
    // Verify we're on dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    
    // Should still be authenticated and on dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });
    
    // Verify JWT token is still present
    const jwtToken = await extractJWTToken(page);
    expect(jwtToken).toBeTruthy();
  });

  test('should successfully logout and clear authentication state', async ({ page }) => {
    // Authenticate first
    await page.goto('/login');
    await page.fill('input[id="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[id="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
    
    // Find and click logout button (assuming it's in the layout/navigation)
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout"), a:has-text("Sign Out")').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // If no visible logout button, try to logout programmatically
      await page.evaluate(() => {
        // Try to find Supabase client and sign out
        const supabaseAuthKey = Object.keys(localStorage).find(key => 
          key.includes('supabase.auth.token')
        );
        if (supabaseAuthKey) {
          localStorage.removeItem(supabaseAuthKey);
        }
        // Trigger a page reload to reset auth state
        window.location.reload();
      });
    }
    
    // Should redirect back to login
    await expect(page).toHaveURL('/login');
    
    // Verify auth state is cleared
    const jwtToken = await extractJWTToken(page);
    expect(jwtToken).toBeFalsy();
    
    // Should show login form
    await expect(page.locator('input[id="email"]')).toBeVisible();
  });

  test('should handle expired or invalid tokens gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Set an invalid/expired token in localStorage
    await page.evaluate(() => {
      const invalidToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJpbnZhbGlkIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImV4cCI6MTYwMDAwMDAwMCwiaWF0IjoxNjAwMDAwMDAwfQ.invalid';
      const authKey = 'sb-ocxijuowaqkbyhtnlxdz-auth-token';
      localStorage.setItem(authKey, JSON.stringify({
        access_token: invalidToken,
        refresh_token: 'invalid',
        expires_at: 1600000000,
        user: { id: 'invalid', email: 'test@example.com' }
      }));
    });
    
    // Refresh page to trigger auth check
    await page.reload();
    
    // Should redirect to login due to invalid token
    await expect(page).toHaveURL('/login');
    await expect(page.locator('input[id="email"]')).toBeVisible();
  });

  test('should verify backend auth handler rejects requests without proper authorization', async ({ page }) => {
    await page.goto('/');
    
    // Test backend endpoint without authorization header
    const unauthorizedResponse = await page.evaluate(async () => {
      const response = await fetch('/auth/test', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return {
        status: response.status,
        ok: response.ok
      };
    });
    
    // Should return 401 Unauthorized
    expect(unauthorizedResponse.status).toBe(401);
    expect(unauthorizedResponse.ok).toBe(false);
    
    // Test with invalid bearer token
    const invalidTokenResponse = await page.evaluate(async () => {
      const response = await fetch('/auth/test', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid_token_here',
          'Content-Type': 'application/json'
        }
      });
      
      return {
        status: response.status,
        ok: response.ok
      };
    });
    
    // Should return 401 Unauthorized
    expect(invalidTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.ok).toBe(false);
  });

  test('should verify role-based access control', async ({ page }) => {
    // Authenticate as admin user
    await page.goto('/login');
    await page.fill('input[id="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[id="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/', { timeout: 15000 });
    
    // Try to access HR-only endpoints (like listing all employees)
    const jwtToken = await extractJWTToken(page);
    expect(jwtToken).toBeTruthy();
    
    if (jwtToken) {
      const employeesResponse = await page.evaluate(async (token) => {
        const response = await fetch('/employees', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        return {
          status: response.status,
          ok: response.ok,
          data: response.ok ? await response.json() : null
        };
      }, jwtToken);
      
      // Admin user should have access to employee list
      expect(employeesResponse.status).toBe(200);
      expect(employeesResponse.ok).toBe(true);
      expect(employeesResponse.data).toHaveProperty('employees');
    }
  });
});

test.describe('Authentication Performance Tests', () => {
  test('should complete login flow within reasonable time limits', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/login');
    await page.fill('input[id="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[id="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    
    // Wait for successful authentication
    await expect(page).toHaveURL('/', { timeout: 15000 });
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    const endTime = Date.now();
    const loginDuration = endTime - startTime;
    
    // Login should complete within 10 seconds
    expect(loginDuration).toBeLessThan(10000);
    
    console.log(`Login completed in ${loginDuration}ms`);
  });

  test('should handle concurrent authentication requests', async ({ browser }) => {
    // Create multiple pages to simulate concurrent logins
    const pages = await Promise.all([
      browser.newPage(),
      browser.newPage(),
      browser.newPage()
    ]);
    
    try {
      // Perform concurrent logins
      const loginPromises = pages.map(async (page, index) => {
        await page.goto('/login');
        await page.fill('input[id="email"]', TEST_CREDENTIALS.email);
        await page.fill('input[id="password"]', TEST_CREDENTIALS.password);
        await page.click('button[type="submit"]');
        
        // Wait for authentication
        await expect(page).toHaveURL('/', { timeout: 15000 });
        return page;
      });
      
      const results = await Promise.all(loginPromises);
      
      // All should successfully authenticate
      for (const page of results) {
        await expect(page.locator('text=Dashboard')).toBeVisible();
        const token = await extractJWTToken(page);
        expect(token).toBeTruthy();
      }
    } finally {
      // Clean up
      await Promise.all(pages.map(page => page.close()));
    }
  });
});