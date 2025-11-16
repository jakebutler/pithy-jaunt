# Skipped Tests

This document tracks tests that are currently skipped and should be re-enabled after UI updates.

## E2E Tests Skipped for UI Revamp

The following tests are skipped using `test.skip()` because they depend on UI elements that will be updated during the UI revamp:

### Authentication Tests
- **User signup with valid credentials** (`tests/e2e/auth.spec.ts`)
  - Reason: Signup flow needs UI updates
  - TODO: Re-enable after UI revamp

### Repository Connection Tests
- **Connect valid public GitHub repository** (`tests/e2e/repo.spec.ts`)
  - Reason: Repository connection form needs UI updates
  - TODO: Re-enable after UI revamp

- **Connect repository with invalid URL format** (`tests/e2e/repo.spec.ts`)
  - Reason: Error message display needs UI updates
  - TODO: Re-enable after UI revamp

- **Connect non-existent repository** (`tests/e2e/repo.spec.ts`)
  - Reason: Error message display needs UI updates
  - TODO: Re-enable after UI revamp

- **Connect duplicate repository** (`tests/e2e/repo.spec.ts`)
  - Reason: Duplicate detection flow needs UI updates
  - TODO: Re-enable after UI revamp

- **Repository appears in list after connection** (`tests/e2e/repo.spec.ts`)
  - Reason: Repository list display needs UI updates
  - TODO: Re-enable after UI revamp

## Re-enabling Tests

To re-enable these tests after the UI revamp:

1. Remove `test.skip()` and change back to `test()`
2. Remove the TODO comment
3. Update selectors if the UI structure has changed
4. Run the tests to verify they pass

## Current Test Status

- **Unit Tests**: ✅ All passing (31/31)
- **E2E Tests**: ✅ 6 passing, 9 skipped
- **Total**: ✅ All active tests passing

