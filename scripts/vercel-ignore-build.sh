#!/bin/bash
# Vercel Ignore Build Step
# 
# This script determines if Vercel should build the Next.js app.
# Returns 1 (build) if files outside apps/gitingest/ changed
# Returns 0 (skip build) if only apps/gitingest/ files changed
#
# Configure in Vercel: Settings → Git → Ignore Build Step
# Command: ./scripts/vercel-ignore-build.sh

set -e

# Get the commit range
# For pull requests, Vercel provides VERCEL_GIT_COMMIT_REF
# For pushes, we compare with the previous commit
if [ -n "$VERCEL_GIT_COMMIT_REF" ]; then
  # Pull request - compare with base branch
  BASE_REF="${VERCEL_GIT_COMMIT_SHA:-HEAD~1}"
  HEAD_REF="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
else
  # Push - compare with previous commit
  BASE_REF="${VERCEL_GIT_COMMIT_SHA~1:-HEAD~1}"
  HEAD_REF="${VERCEL_GIT_COMMIT_SHA:-HEAD}"
fi

# Get list of changed files
CHANGED_FILES=$(git diff --name-only "$BASE_REF" "$HEAD_REF" 2>/dev/null || echo "")

# If no changes detected, build (safety default)
if [ -z "$CHANGED_FILES" ]; then
  echo "No changed files detected, building..."
  exit 1  # Exit 1 = build needed
fi

# Check if any files outside apps/gitingest/ changed
NON_GITINGEST_CHANGES=$(echo "$CHANGED_FILES" | grep -v "^apps/gitingest/" || true)

# If there are changes outside apps/gitingest/, build
if [ -n "$NON_GITINGEST_CHANGES" ]; then
  echo "Changes detected outside apps/gitingest/, building..."
  echo "Changed files:"
  echo "$NON_GITINGEST_CHANGES" | head -10
  exit 1  # Exit 1 = build needed
fi

# Only GitIngest files changed, skip build
echo "Only apps/gitingest/ files changed, skipping Vercel build..."
echo "Changed files:"
echo "$CHANGED_FILES"
exit 0  # Exit 0 = skip build

