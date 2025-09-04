import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - Quick verification that the app is working
 * These tests should run quickly and catch major issues
 */

test.describe('Smoke Tests', () => {
  
  test('app loads and renders', async ({ page }) => {
    await page.goto('/');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Basic checks
    await expect(page).toHaveTitle('Leave Management System');
    await expect(page.locator('#root')).toBeVisible();
    
    // Wait a moment for React to render
    await page.waitForTimeout(2000);
    
    // Should have rendered content (React app should mount)
    const content = await page.locator('#root').textContent();
    expect(content).toBeTruthy();
    expect(content?.length ?? 0).toBeGreaterThan(10);
  });

  test('static files serve correctly', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that we got HTML, not an error page
    const content = await page.content();
    expect(content).toContain('<div id="root">');
    expect(content).toContain('Leave Management System');
  });
});