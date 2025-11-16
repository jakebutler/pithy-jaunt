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
 * Uses a configurable domain from env or defaults to example.com
 */
export function generateTestUserEmail(prefix = 'test-user'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  // Use TEST_EMAIL_DOMAIN from env, or default to example.com (more likely to be accepted)
  const domain = process.env.TEST_EMAIL_DOMAIN || 'example.com';
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
  await page.click('button[type="submit"]');
  // Wait for navigation after login
  await page.waitForURL(/\/dashboard|\/repos/, { timeout: 5000 });
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




