# Post-Apply Validation and Rollback

This document describes the post-apply validation, testing, and rollback mechanisms implemented in the task execution flow.

## Overview

After a patch is successfully applied, the system runs a series of validation checks and tests to ensure the changes are correct and don't break the codebase. If any validation fails, the changes are automatically rolled back.

## Validation Steps

The validation process runs in the following order:

### 1. TypeScript Type Checking

**When it runs:** If `tsconfig.json` or `tsconfig.base.json` is present in the repository.

**Command:** `npx tsc --noEmit`

**Behavior:**
- ✅ **Pass:** Continues to next validation step
- ❌ **Fail:** Triggers rollback and task failure

**Output:** Type errors are captured and included in the error message.

### 2. Linting

**When it runs:** If `package.json` contains a `"lint"` or `"lint:fix"` script, or if ESLint config files (`.eslintrc`, `.eslintrc.js`, `.eslintrc.json`) are present.

**Command:** `npm run lint` or `npx eslint . --ext .ts,.tsx,.js,.jsx`

**Behavior:**
- ⚠️ **Non-blocking:** Linting errors are logged as warnings but do not fail the validation
- This allows code style issues to be fixed in follow-up PRs

### 3. Test Execution

**When it runs:** If `package.json` contains a `"test"`, `"test:unit"`, or `"test:e2e"` script.

**Command:** `npm test` or `npm run test:unit`

**Behavior:**
- ✅ **Pass:** Continues to next validation step
- ❌ **Fail:** Triggers rollback and task failure

**Output:** Test failures are captured and included in the error message.

### 4. Browser Testing (Playwright)

**When it runs:** If `playwright.config.ts`, `playwright.config.js`, or `.playwright` directory is present.

**Command:** `npx playwright test --reporter=list`

**Behavior:**
- ✅ **Pass:** Continues to next validation step
- ❌ **Fail:** Triggers rollback and task failure

**Requirements:**
- Playwright must be installed (`npm list playwright` or `node_modules/playwright` exists)
- Playwright browsers are already installed in the Daytona image (Chromium with dependencies)

**Output:** Test failures are captured and included in the error message.

### 5. Browser Testing (Browser Use)

**When it runs:** If `.browseruse.yml` configuration file is present.

**Command:** `browser-use run --config .browseruse.yml --save-screenshots /tmp/screens`

**Behavior:**
- ⚠️ **Non-blocking:** Browser Use test failures are logged as warnings but do not fail the validation
- This allows optional browser testing to be configured without blocking PR creation

**Screenshots:** Saved to `/tmp/screens` in the workspace (can be attached to PRs in future enhancements).

## Rollback Mechanism

If any **blocking** validation fails (TypeScript errors, test failures, Playwright failures), the system automatically:

1. **Stores the pre-patch commit hash** before applying changes
2. **Runs `git reset --hard <pre-patch-commit>`** to revert all changes
3. **Runs `git clean -fd`** to remove untracked files
4. **Sends a failure webhook** with detailed error information
5. **Exits with an error** (task status: `failed`)

### Rollback Safety

- The rollback uses the commit hash from before the patch was applied
- All changes (including new files) are reverted
- The repository is left in the exact state it was before the patch
- If rollback itself fails, an error is logged (manual intervention may be required)

## Browser Support in Daytona Sandboxes

Daytona sandboxes support browser automation through:

1. **VNC (Virtual Network Computing):** Remote desktop access for visual debugging
2. **Chrome DevTools Protocol (CDP):** Programmatic control of Chrome/Chromium
3. **Playwright:** Already installed in the Pithy Jaunt image with Chromium and dependencies

### Using Playwright

Playwright is the recommended approach for browser testing in Daytona sandboxes:

- ✅ Already installed in the declarative image
- ✅ Chromium browser with dependencies pre-installed
- ✅ Supports headless and headed modes
- ✅ Can capture screenshots and videos
- ✅ Works seamlessly in the sandbox environment

### Using Browser Use

Browser Use is an alternative browser automation tool that can be configured via `.browseruse.yml`:

- ⚠️ Must be installed in the repository (not pre-installed)
- ⚠️ Test failures are non-blocking (warnings only)
- ✅ Useful for AI-driven browser interactions

## Configuration

### Enabling Validation

Validation runs automatically if the corresponding configuration files are present:

- **TypeScript:** `tsconfig.json` or `tsconfig.base.json`
- **Linting:** `package.json` with `"lint"` script or ESLint config files
- **Tests:** `package.json` with `"test"` script
- **Playwright:** `playwright.config.ts` or `playwright.config.js`
- **Browser Use:** `.browseruse.yml`

### Disabling Validation

To skip validation for a specific task, you would need to:

1. Remove the configuration files before running the task (not recommended)
2. Modify the execution script (not recommended)
3. Accept that validation will run but may be skipped if tools aren't available

## Error Reporting

When validation fails, the error message includes:

1. **Which validation failed** (TypeScript, tests, Playwright, etc.)
2. **Full error output** from the failed command
3. **Confirmation that rollback was performed**
4. **Pre-patch commit hash** for reference

The error is sent via webhook to the Pithy Jaunt application, which updates the task status and displays the error in the UI.

## PR Body Enhancement

The PR body automatically includes a validation summary:

```markdown
**Validation Results:**
- ✅ TypeScript type checking passed
- ✅ Linter checks passed
- ✅ Tests passed
- ✅ Browser tests (Playwright) passed
```

This helps reviewers quickly see that the changes have been validated.

## Future Enhancements

Potential improvements:

1. **Configurable validation:** Allow users to enable/disable specific validations
2. **Screenshot attachment:** Automatically attach Playwright/Browser Use screenshots to PRs
3. **Test coverage reporting:** Include test coverage metrics in PR body
4. **Performance testing:** Add performance benchmarks as a validation step
5. **Security scanning:** Run security scanners (npm audit, etc.) as validation
6. **Build verification:** Run build commands (npm run build) to ensure code compiles

