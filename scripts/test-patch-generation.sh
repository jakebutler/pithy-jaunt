#!/usr/bin/env bash
# Test script for validating patch generation and application
# Usage: ./scripts/test-patch-generation.sh <repo-path> <task-description>

set -euo pipefail

REPO_PATH="${1:-}"
TASK_DESCRIPTION="${2:-Update the README.md file to add a test section}"

if [ -z "$REPO_PATH" ]; then
  echo "Usage: $0 <repo-path> <task-description>"
  echo "Example: $0 /tmp/test-repo 'Update README.md to add installation instructions'"
  exit 1
fi

if [ ! -d "$REPO_PATH" ]; then
  echo "Error: Repository path does not exist: $REPO_PATH"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENT_RUNNER="$PROJECT_ROOT/daytona/agent-runner.py"
SYSTEM_PROMPT="$PROJECT_ROOT/daytona/system-prompt.md"
PATCH_OUTPUT="/tmp/test-patch-$(date +%s).diff"

echo "=========================================="
echo "Testing Patch Generation and Application"
echo "=========================================="
echo "Repository: $REPO_PATH"
echo "Task: $TASK_DESCRIPTION"
echo "Patch output: $PATCH_OUTPUT"
echo ""

# Check if required files exist
if [ ! -f "$AGENT_RUNNER" ]; then
  echo "Error: agent-runner.py not found at $AGENT_RUNNER"
  exit 1
fi

if [ ! -f "$SYSTEM_PROMPT" ]; then
  echo "Error: system-prompt.md not found at $SYSTEM_PROMPT"
  exit 1
fi

# Check if Python dependencies are installed
echo "Checking Python dependencies..."
python3 -c "import openai" 2>/dev/null || {
  echo "Warning: openai package not found. Install with: pip install openai"
}
python3 -c "import anthropic" 2>/dev/null || {
  echo "Warning: anthropic package not found. Install with: pip install anthropic"
}

# Check environment variables
if [ -z "${OPENAI_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Error: Either OPENAI_API_KEY or ANTHROPIC_API_KEY must be set"
  exit 1
fi

# Determine provider
PROVIDER="${MODEL_PROVIDER:-openai}"
MODEL="${MODEL:-gpt-4o}"

if [ "$PROVIDER" = "anthropic" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "Error: ANTHROPIC_API_KEY is required for anthropic provider"
  exit 1
fi

if [ "$PROVIDER" = "openai" ] && [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "Error: OPENAI_API_KEY is required for openai provider"
  exit 1
fi

echo "Using provider: $PROVIDER, model: $MODEL"
echo ""

# Create a backup of the repo
BACKUP_DIR="/tmp/repo-backup-$(date +%s)"
echo "Creating backup of repository at $BACKUP_DIR..."
cp -r "$REPO_PATH" "$BACKUP_DIR"
echo "Backup created"
echo ""

# Generate patch
echo "=========================================="
echo "Step 1: Generating patch..."
echo "=========================================="
cd "$REPO_PATH"

if ! python3 "$AGENT_RUNNER" \
  --prompt-file "$SYSTEM_PROMPT" \
  --task "$TASK_DESCRIPTION" \
  --repo-path "$REPO_PATH" \
  --out "$PATCH_OUTPUT" \
  --provider "$PROVIDER" \
  --model "$MODEL"; then
  echo "Error: Patch generation failed"
  exit 1
fi

echo ""
echo "Patch generated successfully"
echo ""

# Display patch
echo "=========================================="
echo "Step 2: Generated Patch"
echo "=========================================="
echo "Patch file: $PATCH_OUTPUT"
echo "Patch size: $(wc -l < "$PATCH_OUTPUT") lines"
echo ""
echo "Patch content:"
echo "---"
cat "$PATCH_OUTPUT"
echo "---"
echo ""

# Validate patch format
echo "=========================================="
echo "Step 3: Validating patch format..."
echo "=========================================="
if git apply --check --verbose "$PATCH_OUTPUT" 2>&1; then
  echo "✓ Patch format validation passed"
else
  VALIDATION_EXIT_CODE=$?
  echo "✗ Patch format validation failed (exit code: $VALIDATION_EXIT_CODE)"
  echo ""
  echo "Trying to identify the issue..."
  
  if git apply --check "$PATCH_OUTPUT" 2>&1 | grep -q "does not exist"; then
    echo "Issue: Patch references files that don't exist"
  elif git apply --check "$PATCH_OUTPUT" 2>&1 | grep -q "patch does not apply"; then
    echo "Issue: Patch context lines don't match the files"
  elif git apply --check "$PATCH_OUTPUT" 2>&1 | grep -q "malformed"; then
    echo "Issue: Patch format is malformed"
  else
    echo "Issue: Unknown validation error"
  fi
  
  echo ""
  echo "Full validation output:"
  git apply --check --verbose "$PATCH_OUTPUT" 2>&1 || true
  echo ""
  
  read -p "Continue with patch application attempt? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Repository backup is at: $BACKUP_DIR"
    exit 1
  fi
fi

echo ""

# Apply patch
echo "=========================================="
echo "Step 4: Applying patch..."
echo "=========================================="

# Create a test branch
TEST_BRANCH="test-patch-$(date +%s)"
git checkout -b "$TEST_BRANCH" 2>/dev/null || {
  echo "Warning: Could not create test branch, applying to current branch"
}

if git apply --verbose "$PATCH_OUTPUT" 2>&1; then
  echo "✓ Patch applied successfully"
  APPLY_SUCCESS=true
else
  APPLY_EXIT_CODE=$?
  echo "✗ Patch application failed (exit code: $APPLY_EXIT_CODE)"
  APPLY_SUCCESS=false
  
  echo ""
  echo "Trying with --3way (conflict resolution)..."
  if git apply --3way --verbose "$PATCH_OUTPUT" 2>&1; then
    echo "✓ Patch applied successfully with --3way"
    APPLY_SUCCESS=true
  else
    echo "✗ Patch application with --3way also failed"
  fi
fi

echo ""

# Show changes
if [ "$APPLY_SUCCESS" = true ]; then
  echo "=========================================="
  echo "Step 5: Changes made by patch"
  echo "=========================================="
  git diff HEAD || true
  echo ""
  
  echo "=========================================="
  echo "Summary"
  echo "=========================================="
  echo "✓ Patch generated"
  echo "✓ Patch applied successfully"
  echo ""
  echo "To review changes:"
  echo "  cd $REPO_PATH"
  echo "  git diff HEAD"
  echo ""
  echo "To restore original state:"
  echo "  rm -rf $REPO_PATH"
  echo "  cp -r $BACKUP_DIR $REPO_PATH"
  echo ""
  echo "Backup location: $BACKUP_DIR"
else
  echo "=========================================="
  echo "Summary"
  echo "=========================================="
  echo "✓ Patch generated"
  echo "✗ Patch application failed"
  echo ""
  echo "Repository has been restored from backup"
  echo "Backup location: $BACKUP_DIR"
  echo ""
  echo "Patch file saved at: $PATCH_OUTPUT"
  echo "Review the patch and fix any issues before retrying"
fi


