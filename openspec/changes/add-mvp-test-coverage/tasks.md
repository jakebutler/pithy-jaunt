# Implementation Tasks

## 1. Test Infrastructure Setup
- [x] 1.1 Install test dependencies (Playwright, Vitest, @testing-library/react)
- [x] 1.2 Create Playwright configuration (playwright.config.ts)
- [x] 1.3 Create Vitest configuration (vitest.config.ts)
- [x] 1.4 Add test scripts to package.json (test, test:e2e, test:unit, test:ci)
- [x] 1.5 Set up test environment variables (.env.test)
- [x] 1.6 Create test utilities directory (tests/utils/)

## 2. Test Data & Fixtures
- [x] 2.1 Create test user factory/fixtures
- [x] 2.2 Create test repository fixtures (mock GitHub repos)
- [x] 2.3 Create test cleanup utilities (delete test users, repos, tasks)
- [ ] 2.4 Set up test database isolation (Convex test deployment or cleanup) - Partial: utilities created, full implementation requires Convex mutations

## 3. Authentication Tests (Smoke Suite)
- [x] 3.1 E2E: User signup with valid credentials
- [x] 3.2 E2E: User signup with invalid email format
- [x] 3.3 E2E: User signup with weak password (< 8 chars)
- [x] 3.4 E2E: User login with valid credentials
- [x] 3.5 E2E: User login with invalid credentials
- [x] 3.6 E2E: Magic link request and flow
- [x] 3.7 Unit: Auth API route validation (signup, login)

## 4. Repository Connection Tests (Smoke Suite)
- [x] 4.1 E2E: Connect public GitHub repository (valid URL)
- [x] 4.2 E2E: Connect repository with invalid URL format
- [x] 4.3 E2E: Connect non-existent repository
- [x] 4.4 E2E: Connect duplicate repository (already connected)
- [x] 4.5 E2E: Repository appears in list after connection
- [x] 4.6 Unit: Repository URL validation logic
- [ ] 4.7 Unit: CodeRabbit config detection - Partial: test structure created, needs full implementation

## 5. Task Management Tests (Smoke Suite)
- [x] 5.1 E2E: Create task for connected repository
- [x] 5.2 E2E: Create task with missing required fields
- [ ] 5.3 E2E: Create task for non-existent repository - Partial: test structure created, needs API mocking
- [ ] 5.4 E2E: Create task for repository user doesn't own - Partial: test structure created, needs API mocking
- [x] 5.5 E2E: List tasks for authenticated user
- [x] 5.6 E2E: Filter tasks by repository
- [x] 5.7 Unit: Task creation API validation

## 6. CI/CD Integration
- [x] 6.1 Create GitHub Actions workflow for test execution
- [ ] 6.2 Configure test environment in CI (Supabase test project, Convex test deployment) - Requires secrets setup
- [ ] 6.3 Add test status badge to README - Optional enhancement
- [ ] 6.4 Configure test failure notifications - Optional enhancement

## 7. Documentation
- [x] 7.1 Create TESTING.md guide
- [x] 7.2 Document test structure and conventions
- [x] 7.3 Document how to run tests locally
- [x] 7.4 Document test data setup and cleanup
- [x] 7.5 Add test coverage goals and strategy to project.md

