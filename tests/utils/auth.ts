import { Page } from '@playwright/test';

/**
 * Test utilities for authentication flows
 */

export interface TestUser {
  email: string;
  password: string;
}

/**
 * Generate a unique test user email
 * Uses a configurable domain from env or defaults to mailinator.com (accepts any email)
 */
export function generateTestUserEmail(prefix = 'test-user'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  // Use TEST_EMAIL_DOMAIN from env, or default to mailinator.com (accepts any email for testing)
  // Alternative: use a real domain like gmail.com if you have access
  const domain = process.env.TEST_EMAIL_DOMAIN || 'mailinator.com';
  return `${prefix}-${timestamp}-${random}@${domain}`;
}

/**
 * Generate a test password that meets requirements
 */
export function generateTestPassword(): string {
  return 'TestPassword123!';
}

/**
 * Create a test user via signup API
 */
export async function createTestUser(
  baseURL: string,
  email?: string,
  password?: string
): Promise<TestUser> {
  const testEmail = email || generateTestUserEmail();
  const testPassword = password || generateTestPassword();

  const response = await fetch(`${baseURL}/api/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create test user: ${error.error || response.statusText}`);
  }

  // Wait a moment for user to be fully created and synced
  await new Promise(resolve => setTimeout(resolve, 1000));

  return { email: testEmail, password: testPassword };
}

/**
 * Login a user via API and return session cookies
 */
export async function loginUser(
  baseURL: string,
  email: string,
  password: string
): Promise<Response> {
  const response = await fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  return response;
}

/**
 * Login a user in Playwright and set authentication state
 */
export async function loginUserInBrowser(
  page: Page,
  baseURL: string,
  email: string,
  password: string
): Promise<void> {
  await page.goto(`${baseURL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Click submit button and wait for navigation
  await Promise.all([
    page.waitForURL(/\/dashboard|\/repos/, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  
  // Wait a moment for session to be fully established
  await page.waitForTimeout(1000);
  
  // Verify we're actually on dashboard/repos
  const currentUrl = page.url();
  if (!currentUrl.includes('/dashboard') && !currentUrl.includes('/repos')) {
    const bodyText = await page.textContent('body') || '';
    if (bodyText.toLowerCase().includes('error') || bodyText.toLowerCase().includes('invalid')) {
      throw new Error('Login failed - error message displayed on page');
    }
    throw new Error(`Login did not redirect. Current URL: ${currentUrl}`);
  }
}

/**
 * Sign up a user in Playwright
 */
export async function signupUserInBrowser(
  page: Page,
  baseURL: string,
  email: string,
  password: string
): Promise<void> {
  await page.goto(`${baseURL}/signup`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for navigation or success message
  await page.waitForTimeout(2000);
}




