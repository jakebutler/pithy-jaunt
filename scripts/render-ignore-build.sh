#!/bin/bash
# Render Ignore Build Step
# 
# This script determines if Render should build the GitIngest service.
# Returns 0 (build) if files in apps/gitingest/ changed
# Returns 1 (skip build) if only files outside apps/gitingest/ changed
#
# Configure in Render: Settings → Build & Deploy → Build Command
# Replace build command with: ./scripts/render-ignore-build.sh && pip install --upgrade pip && pip install -r requirements.txt

set -e

# Get the commit range
# Render provides RENDER_GIT_COMMIT_SHA for the current commit
# Compare with previous commit
if [ -n "$RENDER_GIT_COMMIT_SHA" ]; then
  BASE_REF="${RENDER_GIT_COMMIT_SHA~1:-HEAD~1}"
  HEAD_REF="${RENDER_GIT_COMMIT_SHA:-HEAD}"
else
  # Fallback if RENDER_GIT_COMMIT_SHA not set
  BASE_REF="HEAD~1"
  HEAD_REF="HEAD"
fi

# Get list of changed files
CHANGED_FILES=$(git diff --name-only "$BASE_REF" "$HEAD_REF" 2>/dev/null || echo "")

# If no changes detected, build (safety default)
if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected, building..."
  exit 0
fi

# Check if any files in apps/gitingest/ changed
GITINGEST_CHANGES=$(echo "$CHANGED_FILES" | grep "^apps/gitingest/" || true)

# If there are changes in apps/gitingest/, build
if [ -n "$GITINGEST_CHANGES" ]; then
  echo "Changes detected in apps/gitingest/, building..."
  echo "Changed files:"
  echo "$GITINGEST_CHANGES" | head -10
  exit 0
fi

# Only files outside apps/gitingest/ changed, skip build
echo "No changes in apps/gitingest/, skipping Render build..."
echo "Changed files (outside GitIngest):"
echo "$CHANGED_FILES" | head -10
exit 1

