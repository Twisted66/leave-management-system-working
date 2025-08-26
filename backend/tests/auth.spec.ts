import { test, expect } from '@playwright/test';

test('Supabase admin login', async ({ page }) => {
  await page.goto('http://localhost:5173'); // Assuming frontend is served here

  // Fill in login form
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]'); // Assuming a submit button

  // Wait for navigation or a success indicator
  // This is a placeholder, you might need to adjust based on your actual application's behavior
  await page.waitForURL('**/dashboard'); // Assuming successful login redirects to /dashboard

  // Assert that login was successful
  await expect(page.locator('text=Welcome, admin!')).toBeVisible(); // Assuming a welcome message
});
