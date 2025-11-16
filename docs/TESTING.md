# Testing Guide

This document describes the test automation strategy and how to run tests for Pithy Jaunt.

## Test Structure

```
tests/
├── e2e/              # Playwright E2E tests
│   ├── auth.spec.ts  # Authentication flow tests
│   ├── repo.spec.ts  # Repository connection tests
│   └── task.spec.ts  # Task management tests
├── unit/             # Vitest unit tests
│   └── api/          # API route unit tests
└── utils/            # Test utilities
    ├── auth.ts       # Authentication helpers
    ├── fixtures.ts   # Test data fixtures
    └── cleanup.ts    # Test cleanup utilities
```

## Running Tests

### All Tests
```bash
npm run test:ci
```

### Unit Tests Only
```bash
npm run test:unit
# Or with watch mode
npm run test:watch
# Or with UI
npm run test:ui
```

### E2E Tests Only
```bash
npm run test:e2e
# Or with UI
npm run test:e2e:ui
```

## Test Environment Setup

### Prerequisites

1. **Test Supabase Project**: Create a separate Supabase project for testing
2. **Test Convex Deployment**: Set up a test Convex deployment
3. **Test GitHub Token**: Create a GitHub token with `repo:public_repo` scope

### Environment Variables

Copy `env.test.example` to `.env.test` and fill in test credentials:

```bash
cp env.test.example .env.test
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Test Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Test Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Test Supabase service role key
- `CONVEX_DEPLOYMENT` - Test Convex deployment URL
- `NEXT_PUBLIC_CONVEX_URL` - Test Convex URL
- `GITHUB_TOKEN` - Test GitHub token

### Local Development

1. Start the Next.js dev server:
   ```bash
   npm run dev
   ```

2. In another terminal, run tests:
   ```bash
   npm run test:e2e
   ```

   Playwright will automatically use the running dev server.

## Test Coverage

### Smoke Test Suite

The smoke test suite covers critical user flows:

#### Authentication
- ✅ User signup with valid credentials
- ✅ User signup validation (invalid email, weak password)
- ✅ User login with valid credentials
- ✅ User login with invalid credentials
- ✅ Magic link request flow

#### Repository Connection
- ✅ Connect valid public GitHub repository
- ✅ Connect repository with invalid URL format
- ✅ Connect non-existent repository
- ✅ Connect duplicate repository
- ✅ Repository appears in list after connection

#### Task Management
- ✅ Create task for connected repository
- ✅ Create task with missing required fields
- ✅ List tasks for authenticated user
- ✅ Filter tasks by repository

### Unit Tests

Unit tests cover:
- API route validation
- Input validation logic
- Utility functions

## Writing Tests

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';
import { generateTestUserEmail, createTestUser } from '../utils/auth';

test('User can sign up', async ({ page }) => {
  const email = generateTestUserEmail();
  const password = 'TestPassword123!';
  
  await page.goto('/signup');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  await page.waitForURL(/\/dashboard|\/repos/);
  expect(page.url()).toMatch(/\/dashboard|\/repos/);
});
```

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/auth/signup/route';

describe('POST /api/auth/signup', () => {
  it('should validate required fields', async () => {
    const request = new Request('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

## Test Utilities

### Authentication Helpers

```typescript
import { createTestUser, loginUserInBrowser } from '../utils/auth';

// Create a test user
const user = await createTestUser(baseURL);

// Login in browser
await loginUserInBrowser(page, baseURL, user.email, user.password);
```

### Fixtures

```typescript
import { getTestRepository, generateTestTask } from '../utils/fixtures';

// Get a test repository
const repo = getTestRepository();

// Generate a test task
const task = generateTestTask();
```

## CI/CD Integration

Tests run automatically on:
- Pull requests to `main`
- Pushes to `main`

Test results are available in GitHub Actions, and test artifacts (Playwright reports) are uploaded for failed tests.

## Test Data Management

### Test Isolation

- Each test creates its own test user
- Test data is isolated using unique identifiers (timestamps, random strings)
- Tests should clean up after themselves when possible

### Cleanup

Test cleanup utilities are available in `tests/utils/cleanup.ts`. Note that full cleanup implementation requires:
- Supabase Admin API access for user deletion
- Convex mutations for repository and task deletion

Currently, cleanup is logged but not fully implemented. This should be completed as part of test infrastructure improvements.

## Troubleshooting

### Tests Failing Locally

1. **Check environment variables**: Ensure `.env.test` is properly configured
2. **Check dev server**: Ensure `npm run dev` is running for E2E tests
3. **Check browser installation**: Run `npx playwright install` if needed
4. **Check test data**: Some tests may fail if test data already exists (duplicate users, repos)

### Flaky Tests

If tests are flaky:
1. Increase wait timeouts
2. Use Playwright's built-in waiting strategies (`waitForSelector`, `waitForURL`)
3. Check for race conditions in test setup/teardown

### CI Failures

1. Check GitHub Actions logs for specific error messages
2. Verify all required secrets are configured in GitHub
3. Check Playwright report artifacts for screenshots and traces

## Best Practices

1. **Use test utilities**: Don't duplicate test setup code
2. **Isolate tests**: Each test should be independent
3. **Use descriptive test names**: Test names should clearly describe what they test
4. **Wait for elements**: Use Playwright's waiting strategies instead of fixed timeouts
5. **Clean up**: Clean up test data when possible
6. **Keep tests fast**: E2E tests should complete in < 5 minutes total

## Future Improvements

- [ ] Implement full test data cleanup
- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Expand unit test coverage
- [ ] Add integration tests for external services
- [ ] Set up test coverage reporting




