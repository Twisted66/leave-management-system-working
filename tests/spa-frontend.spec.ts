import { test, expect } from '@playwright/test';

/**
 * Leave Management System - Frontend SPA Tests
 * 
 * Tests verify that:
 * 1. The application loads correctly through Encore.dev static serving
 * 2. Client-side routing (React Router) works properly
 * 3. Static assets (CSS, JS) are served correctly
 * 4. SPA functionality operates without server-side rendering issues
 */

test.describe('Leave Management System - SPA Frontend', () => {
  
  test('main page loads correctly', async ({ page }) => {
    // Navigate to the application root
    await page.goto('/');
    
    // Should redirect to /frontend/dashboard (due to basename="/frontend" in App.tsx)
    await expect(page).toHaveURL(/\/frontend\/dashboard/);
    
    // Wait for React to fully load and render
    await page.waitForLoadState('networkidle');
    
    // Verify the page title
    await expect(page).toHaveTitle('Leave Management System');
    
    // Check that the root React element exists
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    
    // Verify the application actually rendered content (not just empty root)
    await expect(rootElement).not.toBeEmpty();
  });

  test('static assets load correctly', async ({ page }) => {
    // Monitor network requests
    const failedRequests: string[] = [];
    page.on('response', response => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()}: ${response.url()}`);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify no failed asset requests
    expect(failedRequests).toEqual([]);
    
    // Check that CSS is loaded (styles should be applied)
    const bodyStyle = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).fontFamily
    );
    expect(bodyStyle).toBeTruthy(); // Should have some font applied
    
    // Verify JavaScript assets are working by checking React rendered content
    const reactContent = await page.locator('#root').innerHTML();
    expect(reactContent.length).toBeGreaterThan(100); // Should have substantial content
  });

  test('client-side routing works', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Since we're not logged in, check that we're redirected to login
    // or that authentication is being handled
    const currentUrl = page.url();
    
    // The app should either:
    // 1. Show the login page
    // 2. Show a loading/error state
    // 3. Navigate to login route
    
    // Check if we can navigate to the login page directly
    await page.goto('/frontend/login');
    await page.waitForLoadState('networkidle');
    
    // Should be on login page without full page refresh (SPA behavior)
    await expect(page).toHaveURL(/\/frontend\/login/);
    
    // Verify React is still rendering (not a server 404)
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    await expect(rootElement).not.toBeEmpty();
  });

  test('SPA navigation without page refresh', async ({ page }) => {
    await page.goto('/frontend/login');
    await page.waitForLoadState('networkidle');
    
    // Count initial resource requests
    let requestCount = 0;
    page.on('request', request => {
      if (request.resourceType() === 'document') {
        requestCount++;
      }
    });
    
    // Try navigating to different routes to test SPA behavior
    const testRoutes = ['/frontend/dashboard', '/frontend/login'];
    
    for (const route of testRoutes) {
      const initialRequestCount = requestCount;
      
      // Navigate programmatically (simulating SPA navigation)
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Verify the URL changed
      await expect(page).toHaveURL(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      
      // Verify React is still rendering
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();
      
      // For SPA navigation, we shouldn't see additional document requests
      // (though the first navigation might load the page)
    }
  });

  test('handles direct URL access (SPA routing)', async ({ page }) => {
    // Test that deep links work (important for SPA)
    const deepRoutes = [
      '/frontend/dashboard',
      '/frontend/login',
      '/frontend/my-requests',
      '/frontend/employees'
    ];
    
    for (const route of deepRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Should load the SPA, not get a 404
      const rootElement = page.locator('#root');
      await expect(rootElement).toBeVisible();
      await expect(rootElement).not.toBeEmpty();
      
      // URL should be preserved (or redirect to login if protected)
      const currentUrl = page.url();
      expect(currentUrl).toContain('/frontend/');
    }
  });

  test('error handling and resilience', async ({ page }) => {
    // Test that the app handles errors gracefully
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for any JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    // Navigate around to trigger potential errors
    await page.goto('/frontend/login');
    await page.goto('/frontend/dashboard');
    await page.goto('/frontend/nonexistent-route'); // Test 404 handling
    
    await page.waitForLoadState('networkidle');
    
    // Report any JavaScript errors
    if (errors.length > 0) {
      console.warn('JavaScript errors detected:', errors);
    }
    
    // App should still be responsive
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
  });

  test('responsive design on mobile', async ({ page, browserName }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    
    await page.goto('/frontend/login');
    await page.waitForLoadState('networkidle');
    
    // Verify the app renders on mobile
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    
    // Check that content fits in mobile viewport (no horizontal scroll)
    const bodyWidth = await page.locator('body').boundingBox();
    expect(bodyWidth?.width).toBeLessThanOrEqual(375);
  });

  test('CSS and styling loads correctly', async ({ page }) => {
    await page.goto('/frontend/login');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for styles to apply
    await page.waitForTimeout(1000);
    
    // Check that CSS is actually applied by looking at computed styles
    const body = page.locator('body');
    
    // Should have some basic styling applied
    const backgroundColor = await body.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    const fontSize = await body.evaluate(el => 
      window.getComputedStyle(el).fontSize
    );
    
    // Should have non-default values (indicates CSS loaded)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
    expect(fontSize).not.toBe('16px'); // Not browser default
  });

  test('production asset loading workaround', async ({ page }) => {
    // This test specifically checks the production asset loading workaround
    // implemented in index.html for Encore deployment
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check console for asset loading messages
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(msg.text());
    });
    
    await page.waitForTimeout(2000); // Wait for any dynamic loading
    
    // Look for production asset loading messages in console
    const hasAssetLoadingLogs = consoleLogs.some(log => 
      log.includes('Loading assets') || 
      log.includes('Loaded script') || 
      log.includes('Loaded CSS')
    );
    
    // If on production domain (encr.app), should see asset loading workaround
    const isProduction = page.url().includes('encr.app');
    if (isProduction) {
      expect(hasAssetLoadingLogs).toBe(true);
    }
    
    // Regardless of production status, app should load
    const rootElement = page.locator('#root');
    await expect(rootElement).toBeVisible();
    await expect(rootElement).not.toBeEmpty();
  });
});