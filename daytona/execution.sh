#!/usr/bin/env bash
set -euo pipefail
export PATH=$PATH:/usr/local/bin

# Function to send webhook
send_webhook() {
  local type=$1
  local status=$2
  local error_msg=${3:-""}
  local pr_url=${4:-""}
  local message=${5:-""}
  
  if [ -z "$WEBHOOK_URL" ]; then
    echo "[pj] Warning: WEBHOOK_URL not set, skipping webhook"
    return
  fi
  
  # Ensure message is not empty (use empty string if not provided)
  local message_value="${message:-}"
  
  # Use jq to properly escape JSON if available, otherwise use sed
  if command -v jq &> /dev/null; then
    local payload=$(jq -n \
      --arg type "$type" \
      --arg taskId "$TASK_ID" \
      --arg workspaceId "${WORKSPACE_ID:-unknown}" \
      --arg branchName "${BRANCH_NAME:-}" \
      --arg prUrl "$pr_url" \
      --arg status "$status" \
      --arg error "$error_msg" \
      --arg message "$message_value" \
      '{
        type: $type,
        taskId: $taskId,
        workspaceId: $workspaceId,
        branchName: $branchName,
        prUrl: $prUrl,
        status: $status,
        error: $error,
        message: $message
      }')
  else
    # Fallback: manual escaping (less reliable but works)
    # Use base64 encoding as a safer fallback for complex messages
    local error_escaped=$(printf '%s' "$error_msg" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/\r/\\r/g' | sed 's/\t/\\t/g')
    local message_escaped=$(printf '%s' "$message_value" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g' | sed 's/\r/\\r/g' | sed 's/\t/\\t/g')
    
    # Always include message field, even if empty
    local payload=$(cat <<EOF
{
  "type": "$type",
  "taskId": "$TASK_ID",
  "workspaceId": "${WORKSPACE_ID:-unknown}",
  "branchName": "${BRANCH_NAME:-}",
  "prUrl": "$pr_url",
  "status": "$status",
  "error": "$error_escaped",
  "message": "$message_escaped"
}
EOF
)
  fi
  
  echo "[pj] Sending webhook: $type" >&2
  echo "[pj] Webhook payload (full):" >&2
  echo "$payload" >&2
  
  # Send webhook and capture response
  local webhook_response=$(curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    --max-time 10 \
    --write-out "\n%{http_code}" \
    --silent \
    --show-error 2>&1)
  
  local http_code=$(echo "$webhook_response" | tail -1)
  local response_body=$(echo "$webhook_response" | sed '$d')
  
  if [ "$http_code" != "200" ] && [ "$http_code" != "201" ]; then
    echo "[pj] Warning: Webhook delivery failed with HTTP $http_code" >&2
    echo "[pj] Response: $response_body" >&2
  else
    echo "[pj] Webhook delivered successfully (HTTP $http_code)" >&2
  fi
}

# Function to handle errors
handle_error() {
  local error_msg=$1
  local details=${2:-""}
  echo "[pj] Error: $error_msg" >&2
  echo "[pj] Error details: $details" >&2
  
  # Include patch content in error details if patch file exists
  local error_details="$error_msg"
  if [ -n "$details" ]; then
    error_details="$error_msg\n\n$details"
  fi
  
  # If patch file exists and error is patch-related, include patch preview
  if [ -f /tmp/patch.diff ] && echo "$error_msg" | grep -qi "patch"; then
    local patch_preview=$(head -100 /tmp/patch.diff 2>/dev/null || echo "Could not read patch file")
    error_details="$error_details\n\nPatch preview (first 100 lines):\n$patch_preview"
  fi
  
  # Always try to send webhook, even if it fails
  echo "[pj] Sending failure webhook..." >&2
  echo "[pj] Error message: $error_msg" >&2
  echo "[pj] Error details length: ${#error_details} characters" >&2
  echo "[pj] Error details preview (first 500 chars): ${error_details:0:500}" >&2
  send_webhook "task.failed" "failed" "$error_msg" "" "$error_details" || {
    echo "[pj] Warning: Failed to send webhook, but continuing with error reporting" >&2
  }
  
  # Also log to stderr for visibility
  echo "[pj] ========================================" >&2
  echo "[pj] TASK EXECUTION FAILED" >&2
  echo "[pj] Error: $error_msg" >&2
  if [ -n "$details" ]; then
    echo "[pj] Details: $details" >&2
  fi
  echo "[pj] ========================================" >&2
  
  exit 1
}

# Trap errors with better error capture
# Note: We disable the trap around critical sections where we handle errors manually
trap '{
  local cmd="${BASH_COMMAND}"
  local exit_code=$?
  local line_no=$LINENO
  echo "[pj] ERR trap fired at line $line_no" >&2
  echo "[pj] Failed command: $cmd" >&2
  echo "[pj] Exit code: $exit_code" >&2
  handle_error "Script failed at line $line_no" "Command: $cmd\nExit code: $exit_code"
}' ERR

echo "[pj] ========================================"
echo "[pj] Starting execution for task: $TASK_ID"
echo "[pj] ========================================"
echo "[pj] Execution script version: 2025-11-18-v2 (includes BASE_BRANCH fix and improved cloning)"
echo "[pj] Script location: $(readlink -f "${BASH_SOURCE[0]}" 2>/dev/null || echo "${BASH_SOURCE[0]}")"
echo "[pj] Script checksum: $(md5sum "${BASH_SOURCE[0]}" 2>/dev/null | cut -d' ' -f1 || echo "unknown")"
echo "[pj] Target repo: $TARGET_REPO"
echo "[pj] Branch name: ${BRANCH_NAME:-pj/${TASK_ID}}"
echo "[pj] Base branch: ${BASE_BRANCH:-main (default)}"
echo "[pj] Model provider: ${MODEL_PROVIDER:-openai}"
echo "[pj] Model: ${MODEL:-gpt-4o}"

# Validate required environment variables
if [ -z "$TARGET_REPO" ]; then
  handle_error "TARGET_REPO environment variable is required"
fi

if [ -z "$TASK_ID" ]; then
  handle_error "TASK_ID environment variable is required"
fi

if [ -z "$AGENT_PROMPT" ]; then
  handle_error "AGENT_PROMPT environment variable is required"
fi

# Configure git
git config --global user.name "Pithy Jaunt Bot"
git config --global user.email "bot@pithy-jaunt.dev"

# Validate GitHub token if provided (needed for PR creation)
if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "[pj] Warning: GITHUB_TOKEN not set, PR creation will fail"
fi

# Create working directory (use unique directory per task to avoid conflicts)
WORK_DIR="/tmp/pj/${TASK_ID:-$(date +%s)}"
mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

# Clean up any existing repo directory
if [ -d "repo" ]; then
  echo "[pj] Cleaning up existing repo directory..."
  rm -rf repo
fi

# Clone repository
echo "[pj] Cloning repository: $TARGET_REPO"
send_webhook "task.progress" "running" "" "" "Cloning repository..." || true  # Send progress update (non-blocking)

# Determine base branch BEFORE cloning (use env var if set, otherwise default to main)
BASE_BRANCH=${BASE_BRANCH:-main}

# Clone with the specific branch if BASE_BRANCH is set and not default
if [ "$BASE_BRANCH" != "main" ]; then
  echo "[pj] Cloning repository with branch: $BASE_BRANCH"
  if ! git clone -b "$BASE_BRANCH" --single-branch "$TARGET_REPO" repo; then
    echo "[pj] Warning: Failed to clone with branch $BASE_BRANCH, trying default clone..."
    if ! git clone "$TARGET_REPO" repo; then
      handle_error "Failed to clone repository: $TARGET_REPO"
    fi
  fi
else
  if ! git clone "$TARGET_REPO" repo; then
    handle_error "Failed to clone repository: $TARGET_REPO"
  fi
fi

cd repo

# Fetch latest changes to ensure we have the most up-to-date state
echo "[pj] Fetching latest changes..."
git fetch origin || echo "[pj] Warning: Failed to fetch, continuing with existing state"

# Verify and checkout the base branch
if ! git show-ref --verify --quiet refs/heads/"$BASE_BRANCH"; then
  # Try to checkout from remote
  if git show-ref --verify --quiet refs/remotes/origin/"$BASE_BRANCH"; then
    echo "[pj] Checking out $BASE_BRANCH from origin..."
    git checkout -b "$BASE_BRANCH" "origin/$BASE_BRANCH" || git checkout "$BASE_BRANCH"
  elif git show-ref --verify --quiet refs/heads/master; then
    echo "[pj] Warning: Branch $BASE_BRANCH not found, falling back to master"
    BASE_BRANCH=master
  else
    # Use the default branch
    DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")
    echo "[pj] Warning: Branch $BASE_BRANCH not found, using default branch: $DEFAULT_BRANCH"
    BASE_BRANCH="$DEFAULT_BRANCH"
  fi
fi

echo "[pj] Base branch: $BASE_BRANCH"
git checkout "$BASE_BRANCH" || handle_error "Failed to checkout branch: $BASE_BRANCH"

# Pull latest changes to ensure we're up to date
echo "[pj] Pulling latest changes for branch $BASE_BRANCH..."
git pull origin "$BASE_BRANCH" || echo "[pj] Warning: Failed to pull, continuing with existing state"

# Create branch
BRANCH=${BRANCH_NAME:-pj/${TASK_ID}}
echo "[pj] Creating branch: $BRANCH"
if ! git checkout -b "$BRANCH"; then
  # Branch might already exist, try to delete and recreate
  git branch -D "$BRANCH" 2>/dev/null || true
  git checkout -b "$BRANCH"
fi

# Add CodeRabbit configuration if missing
if [ ! -f .coderabbit.yaml ]; then
  echo "[pj] Adding CodeRabbit configuration..."
  
  cat > .coderabbit.yaml << 'EOF'
# CodeRabbit Configuration
# Generated by Pithy Jaunt

review:
  enabled: true
  review_all_files: true
  focus:
    - code_quality
    - security
    - performance
    - maintainability
    - best_practices

analysis:
  enabled: true
  summaries:
    enabled: true
    format: markdown
  tasks:
    enabled: true
    min_priority: medium

output:
  format: markdown
  include_suggestions: true
  include_code_examples: true
EOF

  git add .coderabbit.yaml
  git commit -m "Add CodeRabbit configuration (Pithy Jaunt)" || true
  
  echo "[pj] CodeRabbit configuration added"
fi

# Run AI agent to generate patch
echo "[pj] Running AI agent to generate code changes..."
echo "[pj] Task description: $AGENT_PROMPT"
echo "[pj] Current branch: $(git rev-parse --abbrev-ref HEAD)"
echo "[pj] Current commit: $(git rev-parse HEAD)"
send_webhook "task.progress" "running" "" "" "Running AI agent to generate code changes..." || true  # Send progress update (non-blocking)

# Use local paths if running outside Docker, otherwise use /app paths
AGENT_RUNNER="${AGENT_RUNNER_PATH:-/app/agent-runner.py}"
SYSTEM_PROMPT="${SYSTEM_PROMPT_PATH:-/app/system-prompt.md}"

# CRITICAL: Use two-step approach (read file, generate modified content, then use git diff)
# This ensures the patch is generated from the actual file contents in the repository
echo "[pj] Using two-step patch generation approach (reads files first, then generates patch)"
echo "[pj] Repository state verification:"
echo "[pj]   - Working directory: $(pwd)"
echo "[pj]   - Branch: $(git rev-parse --abbrev-ref HEAD)"
echo "[pj]   - Commit: $(git rev-parse HEAD)"
echo "[pj]   - Clean working tree: $(git status --porcelain | wc -l) uncommitted changes"

# Verify repository is in a clean state (except for .coderabbit.yaml if we just added it)
if [ -n "$(git status --porcelain | grep -v '.coderabbit.yaml')" ]; then
  echo "[pj] Warning: Repository has uncommitted changes (excluding .coderabbit.yaml)"
  git status --short
fi

if ! python3 "$AGENT_RUNNER" \
  --prompt-file "$SYSTEM_PROMPT" \
  --task "$AGENT_PROMPT" \
  --repo-path "$(pwd)" \
  --out /tmp/patch.diff \
  --provider "${MODEL_PROVIDER:-openai}" \
  --model "${MODEL:-gpt-4o}" \
  --use-two-step; then
  handle_error "AI agent failed to generate patch"
fi

# Check if patch file exists and is not empty
if [ ! -f /tmp/patch.diff ] || [ ! -s /tmp/patch.diff ]; then
  handle_error "Patch file is empty or missing"
fi

echo "[pj] Patch generated successfully"
echo "[pj] Patch size: $(wc -l < /tmp/patch.diff) lines"

# Show patch details for debugging
echo "[pj] Patch file location: /tmp/patch.diff"
echo "[pj] Patch file size: $(wc -c < /tmp/patch.diff) bytes"
echo "[pj] Patch line count: $(wc -l < /tmp/patch.diff) lines"
echo "[pj] Patch preview (first 50 lines):"
head -50 /tmp/patch.diff || true
echo "[pj] ... (patch continues) ..."
echo "[pj] Patch preview (last 20 lines):"
tail -20 /tmp/patch.diff || true

# Validate patch format before applying
echo "[pj] Validating patch format..."
# Disable ERR trap temporarily to handle errors manually
trap - ERR
set +e
GIT_APPLY_CHECK_OUTPUT=$(git apply --check --verbose /tmp/patch.diff 2>&1)
GIT_APPLY_CHECK_EXIT_CODE=$?
set -e
# Re-enable ERR trap
trap '{
  local cmd="${BASH_COMMAND}"
  local exit_code=$?
  local line_no=$LINENO
  echo "[pj] ERR trap fired at line $line_no" >&2
  echo "[pj] Failed command: $cmd" >&2
  echo "[pj] Exit code: $exit_code" >&2
  handle_error "Script failed at line $line_no" "Command: $cmd\nExit code: $exit_code"
}' ERR

if [ $GIT_APPLY_CHECK_EXIT_CODE -ne 0 ]; then
  echo "[pj] Patch validation failed with exit code: $GIT_APPLY_CHECK_EXIT_CODE"
  echo "[pj] Git apply --check output:"
  echo "$GIT_APPLY_CHECK_OUTPUT"
  
  # Try to identify the specific issue
  if echo "$GIT_APPLY_CHECK_OUTPUT" | grep -q "does not exist"; then
    echo "[pj] Error: Patch references files that don't exist in the repository"
  elif echo "$GIT_APPLY_CHECK_OUTPUT" | grep -q "patch does not apply"; then
    echo "[pj] Error: Patch context lines don't match the files"
  elif echo "$GIT_APPLY_CHECK_OUTPUT" | grep -q "malformed"; then
    echo "[pj] Error: Patch format is malformed"
  fi
  
  # Show the full patch for debugging
  echo "[pj] Full patch content (for debugging):"
  cat /tmp/patch.diff || true
  
  # Try applying with --3way to handle conflicts
  echo "[pj] Attempting to apply patch with --3way (conflict resolution)..."
  trap - ERR
  set +e
  GIT_APPLY_3WAY_OUTPUT=$(git apply --3way --verbose /tmp/patch.diff 2>&1)
  GIT_APPLY_3WAY_EXIT_CODE=$?
  set -e
  trap '{
    local cmd="${BASH_COMMAND}"
    local exit_code=$?
    local line_no=$LINENO
    echo "[pj] ERR trap fired at line $line_no" >&2
    echo "[pj] Failed command: $cmd" >&2
    echo "[pj] Exit code: $exit_code" >&2
    handle_error "Script failed at line $line_no" "Command: $cmd\nExit code: $exit_code"
  }' ERR
  
  if [ $GIT_APPLY_3WAY_EXIT_CODE -ne 0 ]; then
    echo "[pj] Patch application with --3way also failed"
    echo "[pj] --3way output:"
    echo "$GIT_APPLY_3WAY_OUTPUT"
    
    # Create a detailed error message with all the information we have
    ERROR_DETAILS="Patch validation failed.\n\nGit apply --check output:\n$GIT_APPLY_CHECK_OUTPUT"
    if [ -n "$GIT_APPLY_3WAY_OUTPUT" ]; then
      ERROR_DETAILS="$ERROR_DETAILS\n\n--3way attempt output:\n$GIT_APPLY_3WAY_OUTPUT"
    fi
    # Include patch preview in error details
    if [ -f /tmp/patch.diff ]; then
      ERROR_DETAILS="$ERROR_DETAILS\n\nPatch preview (first 100 lines):\n$(head -100 /tmp/patch.diff 2>/dev/null || echo 'Could not read patch file')"
    fi
    handle_error "Failed to apply patch. The patch may be invalid or conflict with existing code." "$ERROR_DETAILS"
  else
    echo "[pj] Patch applied successfully with --3way (conflicts resolved)"
  fi
else
  echo "[pj] Patch validation passed, applying patch..."
  trap - ERR
  set +e
  GIT_APPLY_OUTPUT=$(git apply --verbose /tmp/patch.diff 2>&1)
  GIT_APPLY_EXIT_CODE=$?
  set -e
  trap '{
    local cmd="${BASH_COMMAND}"
    local exit_code=$?
    local line_no=$LINENO
    echo "[pj] ERR trap fired at line $line_no" >&2
    echo "[pj] Failed command: $cmd" >&2
    echo "[pj] Exit code: $exit_code" >&2
    handle_error "Script failed at line $line_no" "Command: $cmd\nExit code: $exit_code"
  }' ERR
  
  if [ $GIT_APPLY_EXIT_CODE -ne 0 ]; then
    echo "[pj] Patch application failed unexpectedly (validation passed but apply failed)"
    echo "[pj] Git apply output:"
    echo "$GIT_APPLY_OUTPUT"
    ERROR_DETAILS="Git apply output:\n$GIT_APPLY_OUTPUT"
    if [ -f /tmp/patch.diff ]; then
      ERROR_DETAILS="$ERROR_DETAILS\n\nPatch preview (first 100 lines):\n$(head -100 /tmp/patch.diff 2>/dev/null || echo 'Could not read patch file')"
    fi
    handle_error "Patch validation passed but application failed" "$ERROR_DETAILS"
  else
    echo "[pj] Patch applied successfully"
  fi
fi

# ========================================
# POST-APPLY VALIDATION AND TESTING
# ========================================
echo "[pj] ========================================"
echo "[pj] Running post-apply validation and tests"
echo "[pj] ========================================"

# Store the commit hash before making changes (for rollback)
PRE_PATCH_COMMIT=$(git rev-parse HEAD)
echo "[pj] Pre-patch commit: $PRE_PATCH_COMMIT"

# Track validation failures
VALIDATION_FAILED=false
VALIDATION_ERRORS=""

# Function to rollback changes if validation fails
rollback_changes() {
  echo "[pj] ========================================"
  echo "[pj] ROLLBACK: Reverting changes due to validation failure"
  echo "[pj] ========================================"
  git reset --hard "$PRE_PATCH_COMMIT" || {
    echo "[pj] ERROR: Failed to rollback changes. Manual intervention may be required."
    return 1
  }
  echo "[pj] Changes rolled back successfully"
  git clean -fd || true  # Clean untracked files
}

# 1. TypeScript Type Checking (if TypeScript project)
if [ -f "tsconfig.json" ] || [ -f "tsconfig.base.json" ]; then
  echo "[pj] Running TypeScript type checking..."
  send_webhook "task.progress" "running" "" "" "Running TypeScript type checking..." || true
  
  # Check if tsc is available
  if command -v npx &> /dev/null; then
    set +e
    TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
    TSC_EXIT_CODE=$?
    set -e
    
    if [ $TSC_EXIT_CODE -ne 0 ]; then
      VALIDATION_FAILED=true
      VALIDATION_ERRORS="${VALIDATION_ERRORS}\n\nTypeScript Errors:\n$TSC_OUTPUT"
      echo "[pj] ❌ TypeScript validation failed"
      echo "$TSC_OUTPUT"
    else
      echo "[pj] ✅ TypeScript validation passed"
    fi
  else
    echo "[pj] ⚠️  npx not available, skipping TypeScript check"
  fi
fi

# 2. Linting (if lint script exists in package.json)
if [ -f "package.json" ]; then
  # Check for common lint scripts
  if grep -q '"lint"' package.json || grep -q '"lint:fix"' package.json; then
    echo "[pj] Running linter..."
    send_webhook "task.progress" "running" "" "" "Running linter..." || true
    
    if command -v npm &> /dev/null; then
      set +e
      # Try npm run lint first, fallback to npx eslint
      if grep -q '"lint"' package.json; then
        LINT_OUTPUT=$(npm run lint 2>&1)
        LINT_EXIT_CODE=$?
      elif command -v npx &> /dev/null && [ -f ".eslintrc" ] || [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ]; then
        LINT_OUTPUT=$(npx eslint . --ext .ts,.tsx,.js,.jsx 2>&1)
        LINT_EXIT_CODE=$?
      else
        LINT_EXIT_CODE=0  # Skip if no lint config
        LINT_OUTPUT=""
      fi
      set -e
      
      if [ $LINT_EXIT_CODE -ne 0 ]; then
        # Linting errors are warnings, not failures (don't fail validation)
        echo "[pj] ⚠️  Linter found issues (non-blocking):"
        echo "$LINT_OUTPUT" | head -20
      else
        echo "[pj] ✅ Linter passed"
      fi
    fi
  fi
fi

# 3. Run Tests (if test script exists)
if [ -f "package.json" ]; then
  # Check for test scripts
  if grep -q '"test"' package.json || grep -q '"test:unit"' package.json || grep -q '"test:e2e"' package.json; then
    echo "[pj] Running tests..."
    send_webhook "task.progress" "running" "" "" "Running tests..." || true
    
    if command -v npm &> /dev/null; then
      set +e
      # Try different test commands
      TEST_OUTPUT=""
      TEST_EXIT_CODE=0
      
      if grep -q '"test"' package.json; then
        TEST_OUTPUT=$(npm test 2>&1)
        TEST_EXIT_CODE=$?
      elif grep -q '"test:unit"' package.json; then
        TEST_OUTPUT=$(npm run test:unit 2>&1)
        TEST_EXIT_CODE=$?
      fi
      set -e
      
      if [ $TEST_EXIT_CODE -ne 0 ]; then
        VALIDATION_FAILED=true
        VALIDATION_ERRORS="${VALIDATION_ERRORS}\n\nTest Failures:\n$TEST_OUTPUT"
        echo "[pj] ❌ Tests failed"
        echo "$TEST_OUTPUT" | tail -50  # Show last 50 lines
      else
        echo "[pj] ✅ Tests passed"
        echo "$TEST_OUTPUT" | tail -20  # Show summary
      fi
    fi
  fi
fi

# 4. Browser Testing (if Playwright or Browser Use is configured)
# Check for Playwright config
if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ] || [ -f ".playwright" ]; then
  echo "[pj] Running Playwright browser tests..."
  send_webhook "task.progress" "running" "" "" "Running browser tests..." || true
  
  if command -v npx &> /dev/null; then
    set +e
    # Check if playwright is installed
    if npm list playwright &> /dev/null || [ -d "node_modules/playwright" ]; then
      PLAYWRIGHT_OUTPUT=$(npx playwright test --reporter=list 2>&1)
      PLAYWRIGHT_EXIT_CODE=$?
      
      if [ $PLAYWRIGHT_EXIT_CODE -ne 0 ]; then
        VALIDATION_FAILED=true
        VALIDATION_ERRORS="${VALIDATION_ERRORS}\n\nPlaywright Test Failures:\n$PLAYWRIGHT_OUTPUT"
        echo "[pj] ❌ Playwright tests failed"
        echo "$PLAYWRIGHT_OUTPUT" | tail -50
      else
        echo "[pj] ✅ Playwright tests passed"
        echo "$PLAYWRIGHT_OUTPUT" | tail -20
      fi
    else
      echo "[pj] ⚠️  Playwright not installed, skipping browser tests"
    fi
    set -e
  fi
fi

# Check for Browser Use config (alternative browser testing)
if [ -f ".browseruse.yml" ]; then
  echo "[pj] Running Browser Use tests..."
  send_webhook "task.progress" "running" "" "" "Running Browser Use tests..." || true
  
  if command -v browser-use &> /dev/null || command -v npx &> /dev/null; then
    set +e
    if command -v browser-use &> /dev/null; then
      BROWSER_USE_OUTPUT=$(browser-use run --config .browseruse.yml --save-screenshots /tmp/screens 2>&1)
      BROWSER_USE_EXIT_CODE=$?
    elif command -v npx &> /dev/null; then
      BROWSER_USE_OUTPUT=$(npx browser-use run --config .browseruse.yml --save-screenshots /tmp/screens 2>&1)
      BROWSER_USE_EXIT_CODE=$?
    else
      BROWSER_USE_EXIT_CODE=0
      BROWSER_USE_OUTPUT=""
    fi
    set -e
    
    if [ $BROWSER_USE_EXIT_CODE -ne 0 ]; then
      # Browser Use failures are warnings (non-blocking) since they're optional
      echo "[pj] ⚠️  Browser Use tests failed (non-blocking):"
      echo "$BROWSER_USE_OUTPUT" | tail -30
    else
      echo "[pj] ✅ Browser Use tests passed"
    fi
  else
    echo "[pj] ⚠️  Browser Use not available, skipping"
  fi
fi

# If validation failed, rollback and exit
if [ "$VALIDATION_FAILED" = "true" ]; then
  echo "[pj] ========================================"
  echo "[pj] VALIDATION FAILED - Rolling back changes"
  echo "[pj] ========================================"
  rollback_changes
  
  ERROR_DETAILS="Post-apply validation failed. Changes have been rolled back.$VALIDATION_ERRORS"
  handle_error "Post-apply validation failed. Changes have been rolled back." "$ERROR_DETAILS"
fi

echo "[pj] ========================================"
echo "[pj] ✅ All validations passed"
echo "[pj] ========================================"

# Commit changes (only if validation passed)
git add -A
if ! git diff --cached --quiet; then
  git commit -m "Pithy Jaunt: $TASK_ID" || handle_error "Failed to commit changes"
  echo "[pj] Changes committed"
else
  echo "[pj] No changes to commit"
fi

# Push branch (skip if SKIP_PUSH_TO_REMOTE is set)
if [ "${SKIP_PUSH_TO_REMOTE:-false}" != "true" ]; then
  echo "[pj] Pushing branch to remote..."
  if ! git push origin "$BRANCH"; then
    handle_error "Failed to push branch to remote"
  fi
  echo "[pj] Branch pushed successfully"
else
  echo "[pj] Skipping push to remote (SKIP_PUSH_TO_REMOTE=true)"
fi

# Create PR using GitHub REST API (skip if SKIP_PR_CREATION is set)
if [ "${SKIP_PR_CREATION:-false}" = "true" ]; then
  echo "[pj] Skipping PR creation (SKIP_PR_CREATION=true)"
  PR_URL=""
else
  echo "[pj] Creating pull request..."

  # Parse repository URL to extract owner and repo
  # Supports both https://github.com/owner/repo.git and git@github.com:owner/repo.git
  # Also handles URLs without .git suffix and with dashes in repo name
  REPO_URL="$TARGET_REPO"
  # Remove trailing slash if present
  REPO_URL="${REPO_URL%/}"
  # Try to match the pattern
  if [[ "$REPO_URL" =~ github\.com[:/]([^/]+)/([^/]+?)(\.git)?/?$ ]]; then
    REPO_OWNER="${BASH_REMATCH[1]}"
    REPO_NAME="${BASH_REMATCH[2]}"
    # Remove .git suffix if present
    REPO_NAME="${REPO_NAME%.git}"
    echo "[pj] Repository: $REPO_OWNER/$REPO_NAME"
  else
    handle_error "Failed to parse repository URL: $REPO_URL"
  fi

  # Validate GitHub token
  if [ -z "${GITHUB_TOKEN:-}" ]; then
    handle_error "GITHUB_TOKEN is required to create pull request"
  fi

# Build validation summary for PR body
VALIDATION_SUMMARY=""
if [ -f "tsconfig.json" ] || [ -f "tsconfig.base.json" ]; then
  VALIDATION_SUMMARY="${VALIDATION_SUMMARY}\n- ✅ TypeScript type checking passed"
fi
if [ -f "package.json" ] && (grep -q '"lint"' package.json || grep -q '"lint:fix"' package.json); then
  VALIDATION_SUMMARY="${VALIDATION_SUMMARY}\n- ✅ Linter checks passed"
fi
if [ -f "package.json" ] && (grep -q '"test"' package.json || grep -q '"test:unit"' package.json || grep -q '"test:e2e"' package.json); then
  VALIDATION_SUMMARY="${VALIDATION_SUMMARY}\n- ✅ Tests passed"
fi
if [ -f "playwright.config.ts" ] || [ -f "playwright.config.js" ] || [ -f ".playwright" ]; then
  VALIDATION_SUMMARY="${VALIDATION_SUMMARY}\n- ✅ Browser tests (Playwright) passed"
fi
if [ -f ".browseruse.yml" ]; then
  VALIDATION_SUMMARY="${VALIDATION_SUMMARY}\n- ✅ Browser Use tests passed"
fi

PR_BODY="Automated change for task $TASK_ID

**Task Description:**
$AGENT_PROMPT

**Generated by:** Pithy Jaunt AI Agent
**Model:** ${MODEL_PROVIDER:-openai}/${MODEL:-gpt-4o}

**Validation Results:**
${VALIDATION_SUMMARY:-- ⚠️  No validation checks were run}
"

  # Create PR using GitHub REST API
  PR_URL=""
  PR_PAYLOAD=$(cat <<EOF
{
  "title": "Pithy Jaunt: $TASK_ID",
  "body": $(echo "$PR_BODY" | jq -Rs .),
  "head": "$BRANCH",
  "base": "$BASE_BRANCH"
}
EOF
  )

  # Temporarily disable exit on error to handle PR creation errors
  set +e
  PR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls" \
    -H "Authorization: token $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    -H "Content-Type: application/json" \
    -d "$PR_PAYLOAD" 2>&1)
  PR_HTTP_CODE=$(echo "$PR_RESPONSE" | tail -1)
  PR_BODY_RESPONSE=$(echo "$PR_RESPONSE" | sed '$d')
  set -e

  if [ "$PR_HTTP_CODE" = "201" ]; then
    # PR created successfully
    PR_URL=$(echo "$PR_BODY_RESPONSE" | jq -r '.html_url // .url // ""')
    if [ -z "$PR_URL" ] || [ "$PR_URL" = "null" ]; then
      # Fallback: construct URL manually
      PR_URL="https://github.com/$REPO_OWNER/$REPO_NAME/pull/$(echo "$PR_BODY_RESPONSE" | jq -r '.number')"
    fi
    echo "[pj] Pull request created: $PR_URL"
  elif [ "$PR_HTTP_CODE" = "422" ]; then
    # PR might already exist, try to find it
    echo "[pj] PR creation returned 422, checking if PR already exists..."
    set +e
    EXISTING_PR=$(curl -s -X GET \
      "https://api.github.com/repos/$REPO_OWNER/$REPO_NAME/pulls?head=$REPO_OWNER:$BRANCH&state=all" \
      -H "Authorization: token $GITHUB_TOKEN" \
      -H "Accept: application/vnd.github.v3+json" 2>&1)
    set -e
    
    EXISTING_PR_URL=$(echo "$EXISTING_PR" | jq -r '.[0].html_url // .[0].url // ""' 2>/dev/null || echo "")
    if [ -n "$EXISTING_PR_URL" ] && [ "$EXISTING_PR_URL" != "null" ]; then
      PR_URL="$EXISTING_PR_URL"
      echo "[pj] Pull request already exists: $PR_URL"
    else
      # Parse error message from response
      ERROR_MSG=$(echo "$PR_BODY_RESPONSE" | jq -r '.message // "Unknown error"' 2>/dev/null || echo "Failed to create PR (HTTP $PR_HTTP_CODE)")
      handle_error "Failed to create pull request: $ERROR_MSG"
    fi
  else
    # Other error
    ERROR_MSG=$(echo "$PR_BODY_RESPONSE" | jq -r '.message // "Unknown error"' 2>/dev/null || echo "Failed to create PR (HTTP $PR_HTTP_CODE)")
    handle_error "Failed to create pull request: $ERROR_MSG"
  fi
fi

# Browser Use tests are now run as part of post-apply validation above
# (This section is kept for backward compatibility but is now redundant)

# Send success webhook
send_webhook "task.completed" "success" "" "$PR_URL"

echo "[pj] ========================================"
echo "[pj] Execution completed successfully!"
echo "[pj] PR URL: $PR_URL"
echo "[pj] ========================================"

# Optionally keep workspace alive for debugging
if [ "${KEEP_ALIVE:-false}" = "true" ]; then
  echo "[pj] Keeping workspace alive for interactive debugging (15 minutes)..."
  sleep 900
fi

echo "[pj] Execution complete"

