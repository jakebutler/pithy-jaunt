#!/usr/bin/env bash
# Test all scenarios in production
# This script runs all test scenarios sequentially and reports results
# Usage: ./scripts/test-all-scenarios-prod.sh [options]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_SCRIPT="$SCRIPT_DIR/test-task-execution-prod.sh"

# Default values
REPO_URL="${REPO_URL:-}"
REPO_ID="${REPO_ID:-}"
MODEL_PROVIDER="${MODEL_PROVIDER:-openrouter}"
MODEL="${MODEL:-moonshotai/kimi-k2-0905}"
PROD_URL="${PROD_URL:-https://pithy-jaunt.vercel.app}"
MAX_WAIT="${MAX_WAIT:-600}"
SKIP_PR_CHECK="${SKIP_PR_CHECK:-false}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --repo-url)
      REPO_URL="$2"
      shift 2
      ;;
    --repo-id)
      REPO_ID="$2"
      shift 2
      ;;
    --provider)
      MODEL_PROVIDER="$2"
      shift 2
      ;;
    --model)
      MODEL="$2"
      shift 2
      ;;
    --prod-url)
      PROD_URL="$2"
      shift 2
      ;;
    --max-wait)
      MAX_WAIT="$2"
      shift 2
      ;;
    --skip-pr-check)
      SKIP_PR_CHECK="true"
      shift
      ;;
    --help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --repo-url <url>      GitHub repository URL"
      echo "  --repo-id <id>        Repository ID"
      echo "  --provider <name>     Model provider (default: openrouter)"
      echo "  --model <name>        Model name (default: moonshotai/kimi-k2-0905)"
      echo "  --prod-url <url>      Production URL"
      echo "  --max-wait <sec>      Max wait time per test (default: 600)"
      echo "  --skip-pr-check       Skip PR URL verification"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

if [ -z "$REPO_URL" ] && [ -z "$REPO_ID" ]; then
  echo -e "${RED}Error: Either --repo-url or --repo-id is required${NC}"
  exit 1
fi

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo -e "${RED}Error: SUPABASE_ACCESS_TOKEN environment variable is required${NC}"
  exit 1
fi

# Test scenarios
SCENARIOS=("simple" "medium" "complex")
RESULTS=()

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Running All Test Scenarios${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Build base command
BASE_CMD="$TEST_SCRIPT"
if [ -n "$REPO_URL" ]; then
  BASE_CMD="$BASE_CMD --repo-url \"$REPO_URL\""
fi
if [ -n "$REPO_ID" ]; then
  BASE_CMD="$BASE_CMD --repo-id \"$REPO_ID\""
fi
BASE_CMD="$BASE_CMD --provider \"$MODEL_PROVIDER\""
BASE_CMD="$BASE_CMD --model \"$MODEL\""
BASE_CMD="$BASE_CMD --prod-url \"$PROD_URL\""
BASE_CMD="$BASE_CMD --max-wait \"$MAX_WAIT\""
if [ "$SKIP_PR_CHECK" = "true" ]; then
  BASE_CMD="$BASE_CMD --skip-pr-check"
fi

# Run each scenario
for scenario in "${SCENARIOS[@]}"; do
  echo -e "${BLUE}----------------------------------------${NC}"
  echo -e "${BLUE}Testing: ${scenario^} scenario${NC}"
  echo -e "${BLUE}----------------------------------------${NC}"
  echo ""
  
  CMD="$BASE_CMD --scenario \"$scenario\""
  
  if eval "$CMD"; then
    RESULTS+=("$scenario: PASSED")
    echo -e "${GREEN}✓ ${scenario^} scenario PASSED${NC}"
  else
    RESULTS+=("$scenario: FAILED")
    echo -e "${RED}✗ ${scenario^} scenario FAILED${NC}"
  fi
  
  echo ""
  echo "Waiting 10 seconds before next test..."
  sleep 10
  echo ""
done

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

PASSED=0
FAILED=0

for result in "${RESULTS[@]}"; do
  if [[ "$result" == *"PASSED"* ]]; then
    echo -e "${GREEN}✓ $result${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ $result${NC}"
    ((FAILED++))
  fi
done

echo ""
echo -e "Total: ${#RESULTS[@]} tests"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests PASSED!${NC}"
  exit 0
else
  echo -e "${RED}Some tests FAILED${NC}"
  exit 1
fi

