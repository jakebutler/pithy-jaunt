# Test Environment Setup Guide

This guide explains how to set up the test environment for running automated tests.

## Quick Setup

Run the setup script to automatically create `.env.test` from your `.env` file:

```bash
./scripts/setup-test-env.sh
```

This will:
1. Create `.env.test` from `env.test.example`
2. Copy values from `.env` (Convex, GitHub, etc.)
3. Prompt you to verify you're using test credentials

## Manual Setup

If you prefer to set up manually:

1. Copy the example file:
   ```bash
   cp env.test.example .env.test
   ```

2. Edit `.env.test` and fill in your test credentials:
   - **Supabase**: Use a separate test project (recommended) or your dev project
   - **Convex**: Use a separate test deployment (recommended) or your dev deployment
   - **GitHub**: Can use the same token as dev (or create a test token)

## Required Environment Variables

### For E2E Tests (Required)

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)
- `CONVEX_DEPLOYMENT` - Your Convex deployment URL
- `NEXT_PUBLIC_CONVEX_URL` - Your Convex URL
- `GITHUB_TOKEN` - GitHub token with `repo:public_repo` scope

### For Unit Tests (Not Required)

Unit tests use mocks and don't require real credentials.

## GitHub Actions CI Setup

For tests to run in CI, you need to add these secrets to your GitHub repository:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `TEST_SUPABASE_URL`
   - `TEST_SUPABASE_ANON_KEY`
   - `TEST_SUPABASE_SERVICE_ROLE_KEY`
   - `TEST_CONVEX_DEPLOYMENT`
   - `TEST_CONVEX_URL`
   - `TEST_GITHUB_TOKEN`

The workflow file (`.github/workflows/test.yml`) is already configured to use these secrets.

## Test Email Domains

**Important**: Supabase may reject emails from `@test.example.com` domain. 

If you encounter email validation errors:
1. Use a real email domain (e.g., `@gmail.com`, `@example.com`)
2. Or configure Supabase to allow test domains
3. Or use Supabase's test mode if available

The test utilities generate emails like: `test-user-{timestamp}-{random}@test.example.com`

You can modify `tests/utils/auth.ts` to use a different domain if needed.

## Running Tests

### Unit Tests (No environment needed)
```bash
npm run test:unit
```

### E2E Tests (Requires .env.test)
```bash
npm run test:e2e
```

Playwright will automatically:
- Start the Next.js dev server
- Load `.env.test` when `NODE_ENV=test`
- Run tests against the local server

### All Tests
```bash
npm run test:ci
```

## Troubleshooting

### "Your project's URL and Key are required"
- Make sure `.env.test` exists and has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify the values are correct (no extra spaces, quotes, etc.)

### "Email address is invalid"
- Supabase is rejecting the test email domain
- Use a real email domain or configure Supabase to allow test domains

### "Rate limit exceeded"
- Too many signup attempts in a short time
- Wait a few minutes or use a separate test Supabase project

### Tests can't find elements
- The UI might have changed
- Check the selectors in test files
- Consider adding `data-testid` attributes to UI elements

## Best Practices

1. **Use separate test projects**: Don't use production Supabase/Convex for tests
2. **Clean up test data**: Tests create users/repos that should be cleaned up
3. **Isolate tests**: Each test should be independent
4. **Use realistic data**: Test with data similar to production

## Next Steps

After setup:
1. Run `npm run test:unit` to verify unit tests pass
2. Run `npm run test:e2e` to verify E2E tests pass
3. Check CI runs successfully after pushing

