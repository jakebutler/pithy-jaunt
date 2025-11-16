# Test Automation Design

## Context

Pithy Jaunt is a Next.js 15 application with:
- Server-side API routes (Next.js App Router)
- Client-side React components
- Supabase authentication
- Convex backend (serverless functions & realtime)
- External integrations (GitHub API, CodeRabbit, Daytona)

We need automated tests to prevent regressions in critical user flows while maintaining fast feedback loops and minimal maintenance burden.

## Goals / Non-Goals

### Goals
- **Smoke test suite** covering critical paths: signup, login, repo connection, task creation
- **Fast feedback**: E2E tests complete in < 5 minutes
- **Reliable**: Tests should be deterministic and not flaky
- **Maintainable**: Clear test structure, reusable utilities
- **CI integration**: Tests run automatically on PRs

### Non-Goals
- 100% code coverage (start with critical paths)
- Visual regression testing (future consideration)
- Performance/load testing (out of scope for MVP)
- Mobile app testing (separate effort)

## Decisions

### Decision: Playwright for E2E Testing
**Rationale:**
- Modern, fast, and reliable browser automation
- Excellent Next.js integration
- Built-in test runner and assertions
- Cross-browser support (Chrome, Firefox, Safari)
- Better than Cypress for Next.js App Router (handles SSR better)

**Alternatives considered:**
- Cypress: More complex setup for Next.js, slower
- Puppeteer: Lower-level, more boilerplate
- Selenium: Too heavy, slower

### Decision: Vitest for Unit/Integration Testing
**Rationale:**
- Fast, Vite-native test runner
- Jest-compatible API (easy migration if needed)
- Excellent TypeScript support
- Works well with Next.js and React Testing Library
- Better performance than Jest

**Alternatives considered:**
- Jest: Slower, more configuration needed
- Mocha: Less modern, more setup required

### Decision: Test Structure
```
tests/
├── e2e/              # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── repo.spec.ts
│   └── task.spec.ts
├── unit/             # Vitest unit tests
│   ├── api/
│   ├── lib/
│   └── components/
└── utils/            # Test utilities
    ├── auth.ts
    ├── fixtures.ts
    └── cleanup.ts
```

### Decision: Test Data Management
- Use separate Supabase test project (via environment variable)
- Use separate Convex test deployment (via environment variable)
- Cleanup test data after each test run (via test hooks)
- Use factories/fixtures for test data creation

**Alternatives considered:**
- In-memory mocks: Too complex for E2E, doesn't test real integrations
- Shared test database: Risk of test interference

### Decision: Test Execution Strategy
- **Local development**: Run tests manually with `npm test`
- **CI**: Run all tests on every PR
- **Pre-commit**: Optional (not blocking, can add later)
- **Smoke tests**: Run on every commit
- **Full suite**: Run on PR merge to main

## Risks / Trade-offs

### Risk: Test Flakiness
**Mitigation:**
- Use Playwright's built-in retries and wait strategies
- Isolate test data (separate test accounts)
- Use deterministic test data (no random timestamps in assertions)

### Risk: Slow Test Execution
**Mitigation:**
- Run E2E tests in parallel (Playwright supports this)
- Use test sharding in CI
- Keep smoke tests focused (only critical paths)
- Consider test prioritization (critical tests run first)

### Risk: External Service Dependencies
**Mitigation:**
- Use test accounts for GitHub API (separate token)
- Mock external services where appropriate (CodeRabbit, Daytona for unit tests)
- Use real services for E2E tests (but with test data)

### Risk: Test Maintenance Burden
**Mitigation:**
- Clear test structure and naming conventions
- Reusable test utilities and fixtures
- Document test patterns and best practices
- Regular test review and cleanup

## Migration Plan

1. **Phase 1**: Set up infrastructure (Playwright, Vitest configs)
2. **Phase 2**: Implement smoke test suite (auth, repo, task)
3. **Phase 3**: Add CI integration
4. **Phase 4**: Expand coverage based on priorities

**Rollback**: If tests cause issues, can disable in CI temporarily while fixing

## Open Questions

- Should we use Playwright's built-in authentication state reuse? (Yes, for performance)
- How to handle test data cleanup for Convex? (Use test deployment with cleanup hooks)
- Should we test against staging or production-like environment? (Start with local, expand to staging later)




