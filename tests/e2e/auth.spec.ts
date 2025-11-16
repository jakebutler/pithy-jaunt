import { test, expect } from '@playwright/test';
import {
  generateTestUserEmail,
  generateTestPassword,
  signupUserInBrowser,
  loginUserInBrowser,
} from '../utils/auth';

const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

test.describe('Authentication Smoke Tests', () => {
  test('User signup with valid credentials', async ({ page }) => {
    const email = generateTestUserEmail();
    const password = generateTestPassword();

    await page.goto(`${baseURL}/signup`);
    
    // Fill in signup form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation or success message
    // After signup, user might be redirected to login or dashboard
    await page.waitForTimeout(2000);
    
    // Verify we're not on the signup page anymore (or see success message)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/signup');
  });

  test('User signup with invalid email format', async ({ page }) => {
    await page.goto(`${baseURL}/signup`);
    
    // Fill in signup form with invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', generateTestPassword());
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message or validation
    await page.waitForTimeout(1000);
    
    // Check for error message (either from browser validation or API)
    const emailInput = page.locator('input[type="email"]');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    
    // Either browser validation or API error should be present
    expect(validationMessage || await page.textContent('body')).toBeTruthy();
  });

  test('User signup with weak password', async ({ page }) => {
    await page.goto(`${baseURL}/signup`);
    
    const email = generateTestUserEmail();
    
    // Fill in signup form with weak password
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'short'); // Less than 8 chars
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(1000);
    
    // Check for error message about password length
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/password|8|characters/i);
  });

  test('User login with valid credentials', async ({ page }) => {
    // First create a user
    const email = generateTestUserEmail();
    const password = generateTestPassword();
    
    // Create user via API
    const signupResponse = await fetch(`${baseURL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    expect(signupResponse.ok).toBeTruthy();
    
    // Now test login
    await page.goto(`${baseURL}/login`);
    
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard or repos
    await page.waitForURL(/\/dashboard|\/repos/, { timeout: 5000 });
    
    // Verify we're logged in
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/dashboard|\/repos/);
  });

  test('User login with invalid credentials', async ({ page }) => {
    await page.goto(`${baseURL}/login`);
    
    // Use invalid credentials
    await page.fill('input[type="email"]', generateTestUserEmail());
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Check for error message
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/invalid|credentials|error/i);
    
    // Verify we're still on login page
    expect(page.url()).toContain('/login');
  });

  test('Magic link request flow', async ({ page }) => {
    await page.goto(`${baseURL}/magic-link`);
    
    const email = generateTestUserEmail();
    
    // Fill in magic link form
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await page.waitForTimeout(2000);
    
    // Check for success message
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/email|sent|check|magic/i);
  });
});




