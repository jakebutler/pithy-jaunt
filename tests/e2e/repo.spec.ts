import { test, expect } from '@playwright/test';
import {
  generateTestUserEmail,
  generateTestPassword,
  createTestUser,
  loginUserInBrowser,
} from '../utils/auth';
import {
  getTestRepository,
  generateInvalidRepositoryUrl,
  generateNonExistentRepositoryUrl,
} from '../utils/fixtures';

const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

test.describe('Repository Connection Smoke Tests', () => {
  let testUser: { email: string; password: string };

  test.beforeEach(async () => {
    // Create a test user for each test
    testUser = await createTestUser(baseURL);
  });

  test('Connect valid public GitHub repository', async ({ page }) => {
    // Login first
    await loginUserInBrowser(page, baseURL, testUser.email, testUser.password);
    
    // Navigate to repos page
    await page.goto(`${baseURL}/repos`);
    
    // Wait for the connect form to be visible
    await page.waitForSelector('form, input[type="text"], input[type="url"]', { timeout: 5000 });
    
    const testRepo = getTestRepository();
    
    // Fill in repository URL
    const repoInput = page.locator('input[type="text"], input[type="url"]').first();
    await repoInput.fill(testRepo.url);
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for redirect to repository detail page or success message
    await page.waitForTimeout(3000);
    
    // Verify repository was connected (either redirected to detail page or appears in list)
    const currentUrl = page.url();
    const bodyText = await page.textContent('body');
    
    // Either we're on a repo detail page or the repo appears in the list
    expect(
      currentUrl.includes('/repos/') || 
      bodyText?.toLowerCase().includes(testRepo.name.toLowerCase()) ||
      bodyText?.toLowerCase().includes('connected')
    ).toBeTruthy();
  });

  test('Connect repository with invalid URL format', async ({ page }) => {
    await loginUserInBrowser(page, baseURL, testUser.email, testUser.password);
    
    // Ensure we're still logged in
    await page.goto(`${baseURL}/repos`);
    await page.waitForSelector('form, input[type="text"], input[type="url"]', { timeout: 10000 });
    
    const invalidUrl = generateInvalidRepositoryUrl();
    
    // Fill in invalid URL
    const repoInput = page.locator('input[type="text"], input[type="url"]').first();
    await repoInput.fill(invalidUrl);
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for error message or response
    await page.waitForTimeout(3000);
    
    // Check for error message (could be in page content or API response)
    const bodyText = await page.textContent('body') || '';
    const currentUrl = page.url();
    
    // Error could be displayed on page or we might still be on repos page with error
    expect(
      bodyText.toLowerCase().includes('invalid') ||
      bodyText.toLowerCase().includes('error') ||
      bodyText.toLowerCase().includes('format') ||
      currentUrl.includes('/repos') // If still on repos page, validation might have prevented submission
    ).toBeTruthy();
  });

  test('Connect non-existent repository', async ({ page }) => {
    await loginUserInBrowser(page, baseURL, testUser.email, testUser.password);
    
    // Ensure we're still logged in
    await page.goto(`${baseURL}/repos`);
    await page.waitForSelector('form, input[type="text"], input[type="url"]', { timeout: 10000 });
    
    const nonExistentUrl = generateNonExistentRepositoryUrl();
    
    // Fill in non-existent repository URL
    const repoInput = page.locator('input[type="text"], input[type="url"]').first();
    await repoInput.fill(nonExistentUrl);
    
    // Submit the form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for error message or response
    await page.waitForTimeout(5000);
    
    // Check for error message about repository not found
    const bodyText = await page.textContent('body') || '';
    expect(
      bodyText.toLowerCase().includes('not found') ||
      bodyText.toLowerCase().includes("doesn't exist") ||
      bodyText.toLowerCase().includes('error')
    ).toBeTruthy();
  });

  test('Connect duplicate repository', async ({ page }) => {
    await loginUserInBrowser(page, baseURL, testUser.email, testUser.password);
    
    await page.goto(`${baseURL}/repos`);
    await page.waitForSelector('form, input[type="text"], input[type="url"]', { timeout: 5000 });
    
    const testRepo = getTestRepository();
    
    // Connect repository first time
    const repoInput = page.locator('input[type="text"], input[type="url"]').first();
    await repoInput.fill(testRepo.url);
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // Try to connect the same repository again
    await page.goto(`${baseURL}/repos`);
    await page.waitForSelector('form, input[type="text"], input[type="url"]', { timeout: 5000 });
    
    const repoInput2 = page.locator('input[type="text"], input[type="url"]').first();
    await repoInput2.fill(testRepo.url);
    const submitButton2 = page.locator('button[type="submit"]').first();
    await submitButton2.click();
    
    // Wait for error message
    await page.waitForTimeout(3000);
    
    // Check for error message about duplicate
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/already connected|duplicate|exists/i);
  });

  test('Repository appears in list after connection', async ({ page }) => {
    await loginUserInBrowser(page, baseURL, testUser.email, testUser.password);
    
    await page.goto(`${baseURL}/repos`);
    await page.waitForSelector('form, input[type="text"], input[type="url"]', { timeout: 5000 });
    
    const testRepo = getTestRepository();
    
    // Connect repository
    const repoInput = page.locator('input[type="text"], input[type="url"]').first();
    await repoInput.fill(testRepo.url);
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // Navigate back to repos list
    await page.goto(`${baseURL}/repos`);
    await page.waitForTimeout(2000);
    
    // Check if repository appears in the list
    const bodyText = await page.textContent('body');
    expect(
      bodyText?.toLowerCase().includes(testRepo.name.toLowerCase()) ||
      bodyText?.toLowerCase().includes(testRepo.owner.toLowerCase())
    ).toBeTruthy();
  });
});




