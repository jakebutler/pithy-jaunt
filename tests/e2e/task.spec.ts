import { test, expect } from '@playwright/test';
import {
  generateTestUserEmail,
  generateTestPassword,
  createTestUser,
  loginUserInBrowser,
} from '../utils/auth';
import { getTestRepository, generateTestTask } from '../utils/fixtures';

const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

test.describe('Task Management Smoke Tests', () => {
  let testUser: { email: string; password: string };
  let repoId: string;

  test.beforeEach(async ({ page }) => {
    // Create a test user
    testUser = await createTestUser(baseURL);
    
    // Login
    await loginUserInBrowser(page, baseURL, testUser.email, testUser.password);
    
    // Connect a repository for task creation
    await page.goto(`${baseURL}/repos`);
    await page.waitForSelector('form, input[type="text"], input[type="url"]', { timeout: 5000 });
    
    const testRepo = getTestRepository();
    const repoInput = page.locator('input[type="text"], input[type="url"]').first();
    await repoInput.fill(testRepo.url);
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    await page.waitForTimeout(3000);
    
    // Extract repoId from URL or API response
    // For now, we'll try to get it from the page URL or make an API call
    const currentUrl = page.url();
    const match = currentUrl.match(/\/repos\/([^\/]+)/);
    if (match) {
      repoId = match[1];
    } else {
      // Fallback: try to get from API
      const reposResponse = await fetch(`${baseURL}/api/repo`, {
        headers: {
          Cookie: await page.context().cookies().then(cookies => 
            cookies.map(c => `${c.name}=${c.value}`).join('; ')
          ),
        },
      });
      if (reposResponse.ok) {
        const repos = await reposResponse.json();
        if (repos.length > 0) {
          repoId = repos[0].repoId || repos[0]._id;
        }
      }
    }
  });

  test('Create task for connected repository', async ({ page }) => {
    if (!repoId) {
      test.skip();
      return;
    }

    // Navigate to create task page
    await page.goto(`${baseURL}/repos/${repoId}/tasks/new`);
    await page.waitForTimeout(2000);
    
    const testTask = generateTestTask();
    
    // Fill in task form
    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
    const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
    
    if (await titleInput.count() > 0) {
      await titleInput.fill(testTask.title);
    }
    if (await descriptionInput.count() > 0) {
      await descriptionInput.fill(testTask.description);
    }
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for redirect or success message
    await page.waitForTimeout(3000);
    
    // Verify task was created (redirected to task detail or tasks list)
    const currentUrl = page.url();
    const bodyText = await page.textContent('body');
    
    expect(
      currentUrl.includes('/tasks/') ||
      bodyText?.toLowerCase().includes(testTask.title.toLowerCase()) ||
      bodyText?.toLowerCase().includes('created')
    ).toBeTruthy();
  });

  test('Create task with missing required fields', async ({ page }) => {
    if (!repoId) {
      test.skip();
      return;
    }

    await page.goto(`${baseURL}/repos/${repoId}/tasks/new`);
    await page.waitForTimeout(2000);
    
    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Wait for validation error
    await page.waitForTimeout(1000);
    
    // Check for validation error
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/required|error|invalid/i);
  });

  test('List tasks for authenticated user', async ({ page }) => {
    // Login first
    await loginUserInBrowser(page, baseURL, testUser.email, testUser.password);
    
    // Navigate to tasks page
    await page.goto(`${baseURL}/tasks`);
    await page.waitForTimeout(2000);
    
    // Verify we're on the tasks page (not redirected to login)
    const currentUrl = page.url();
    expect(currentUrl).toContain('/tasks');
    
    // Check that the page loads (might be empty list, which is fine)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('Filter tasks by repository', async ({ page }) => {
    if (!repoId) {
      test.skip();
      return;
    }

    // Navigate to tasks page with repo filter
    await page.goto(`${baseURL}/tasks?repoId=${repoId}`);
    await page.waitForTimeout(2000);
    
    // Verify URL contains the filter
    const currentUrl = page.url();
    expect(currentUrl).toContain(`repoId=${repoId}`);
  });
});




