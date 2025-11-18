#!/usr/bin/env bash
# Production Task Execution Test Script
# This script tests task execution in production by creating tasks, executing them, and verifying PR creation
# Usage: ./scripts/test-task-execution-prod.sh [options]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROD_URL="${PROD_URL:-https://pithy-jaunt.vercel.app}"
MAX_WAIT_TIME="${MAX_WAIT_TIME:-600}"  # 10 minutes max wait
POLL_INTERVAL="${POLL_INTERVAL:-5}"    # Poll every 5 seconds
VERBOSE="${VERBOSE:-false}"

# Test scenarios (complexity levels)
declare -A TEST_SCENARIOS
TEST_SCENARIOS[simple]="Update the README.md file to add a 'Testing' section with instructions on how to run tests"
TEST_SCENARIOS[medium]="Add a new file called CONTRIBUTING.md with guidelines for contributors, including code style and PR process"
TEST_SCENARIOS[complex]="Create a new API endpoint /api/health that returns a JSON response with status: 'ok' and timestamp. Include proper error handling and add it to the main router."

# Parse arguments
SCENARIO=""
REPO_URL=""
REPO_ID=""
TASK_TITLE=""
TASK_DESCRIPTION=""
MODEL_PROVIDER="${MODEL_PROVIDER:-openrouter}"
MODEL="${MODEL:-moonshotai/kimi-k2-0905}"
SKIP_PR_CHECK="${SKIP_PR_CHECK:-false}"

function usage() {
  cat << EOF
Usage: $0 [options]

Options:
  --scenario <name>        Test scenario: simple, medium, or complex (default: simple)
  --repo-url <url>         GitHub repository URL (required if --repo-id not provided)
  --repo-id <id>           Repository ID from database (required if --repo-url not provided)
  --title <title>          Custom task title (optional)
  --description <desc>     Custom task description (optional)
  --provider <name>        Model provider: openai, anthropic, or openrouter (default: openrouter)
  --model <name>           Model name (default: moonshotai/kimi-k2-0905)
  --prod-url <url>         Production URL (default: https://pithy-jaunt.vercel.app)
  --max-wait <seconds>     Maximum wait time for task completion (default: 600)
  --poll-interval <sec>    Polling interval in seconds (default: 5)
  --skip-pr-check          Skip PR URL verification
  --verbose                Enable verbose output
  --help                   Show this help message

Environment Variables:
  SUPABASE_ACCESS_TOKEN    Supabase access token for authentication (required)
  PROD_URL                 Production URL (default: https://pithy-jaunt.vercel.app)

Examples:
  # Test simple scenario with default repo
  $0 --scenario simple --repo-url https://github.com/owner/repo

  # Test with custom task
  $0 --repo-url https://github.com/owner/repo --title "Add feature" --description "Add new feature X"

  # Test with OpenAI
  $0 --scenario medium --repo-url https://github.com/owner/repo --provider openai --model gpt-4o

EOF
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --scenario)
      SCENARIO="$2"
      shift 2
      ;;
    --repo-url)
      REPO_URL="$2"
      shift 2
      ;;
    --repo-id)
      REPO_ID="$2"
      shift 2
      ;;
    --title)
      TASK_TITLE="$2"
      shift 2
      ;;
    --description)
      TASK_DESCRIPTION="$2"
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
      MAX_WAIT_TIME="$2"
      shift 2
      ;;
    --poll-interval)
      POLL_INTERVAL="$2"
      shift 2
      ;;
    --skip-pr-check)
      SKIP_PR_CHECK="true"
      shift
      ;;
    --verbose)
      VERBOSE="true"
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      usage
      exit 1
      ;;
  esac
done

# Validate required environment variables
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo -e "${RED}Error: SUPABASE_ACCESS_TOKEN environment variable is required${NC}"
  echo "Get your access token from Supabase dashboard or browser dev tools"
  exit 1
fi

# Validate scenario or custom task
if [ -z "$SCENARIO" ] && [ -z "$TASK_DESCRIPTION" ]; then
  SCENARIO="simple"
  echo -e "${YELLOW}No scenario or description specified, using default: simple${NC}"
fi

# Set task details from scenario or custom
if [ -n "$SCENARIO" ]; then
  if [ -z "${TEST_SCENARIOS[$SCENARIO]:-}" ]; then
    echo -e "${RED}Error: Unknown scenario: $SCENARIO${NC}"
    echo "Available scenarios: ${!TEST_SCENARIOS[*]}"
    exit 1
  fi
  TASK_DESCRIPTION="${TEST_SCENARIOS[$SCENARIO]}"
  if [ -z "$TASK_TITLE" ]; then
    TASK_TITLE="Test: ${SCENARIO^} scenario - $(date +%H:%M:%S)"
  fi
fi

if [ -z "$TASK_TITLE" ]; then
  TASK_TITLE="Test Task - $(date +%H:%M:%S)"
fi

# Validate repo URL or ID
if [ -z "$REPO_URL" ] && [ -z "$REPO_ID" ]; then
  echo -e "${RED}Error: Either --repo-url or --repo-id is required${NC}"
  usage
  exit 1
fi

# Helper functions
function log() {
  echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

function log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

function log_error() {
  echo -e "${RED}✗${NC} $1"
}

function log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

function log_verbose() {
  if [ "$VERBOSE" = "true" ]; then
    echo -e "${CYAN}[VERBOSE]${NC} $1"
  fi
}

function api_request() {
  local method=$1
  local endpoint=$2
  local data="${3:-}"
  local url="${PROD_URL}${endpoint}"
  
  log_verbose "API Request: $method $url"
  if [ -n "$data" ]; then
    log_verbose "Request body: $data"
  fi
  
  # Create temp file for response
  local temp_file=$(mktemp)
  local http_code
  
  if [ -n "$data" ]; then
    http_code=$(curl -s -w "%{http_code}" -o "$temp_file" -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      -d "$data" \
      "$url")
  else
    http_code=$(curl -s -w "%{http_code}" -o "$temp_file" -X "$method" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      "$url")
  fi
  
  local body=$(cat "$temp_file")
  rm -f "$temp_file"
  
  log_verbose "Response code: $http_code"
  log_verbose "Response body: $body"
  
  # Output body and return HTTP code
  echo "$body"
  return $http_code
}

function get_repo_id() {
  if [ -n "$REPO_ID" ]; then
    echo "$REPO_ID"
    return
  fi
  
  log "Looking up repository ID for: $REPO_URL"
  
  # Get all repos for the user and find matching URL
  local response
  response=$(api_request "GET" "/api/repo" 2>&1)
  local http_code=$?
  
  if [ $http_code -ne 200 ]; then
    log_error "Failed to fetch repositories (HTTP $http_code)"
    if [ -n "$response" ]; then
      log_error "Response: $response"
    fi
    exit 1
  fi
  
  if [ -z "$response" ]; then
    log_error "Empty response from API"
    exit 1
  fi
  
  # Check if response is valid JSON
  if ! echo "$response" | jq empty 2>/dev/null; then
    log_error "Invalid JSON response from API"
    log_error "Response: $response"
    exit 1
  fi
  
  # Normalize URL for comparison (remove trailing slash, .git suffix)
  local normalized_url=$(echo "$REPO_URL" | sed 's|/$||' | sed 's|\.git$||')
  
  # Find matching repo
  local repo_id=$(echo "$response" | jq -r --arg url "$normalized_url" '
    .repos[]? | 
    select((.url | gsub("/$"; "") | gsub("\\.git$"; "")) == $url) | 
    .id
  ' 2>/dev/null || echo "")
  
  if [ -n "$repo_id" ] && [ "$repo_id" != "null" ] && [ "$repo_id" != "" ]; then
    log_success "Found repository ID: $repo_id"
    echo "$repo_id"
    return
  fi
  
  log_error "Repository not found. Please connect the repository first or provide --repo-id"
  log "Available repositories:"
  if echo "$response" | jq -e '.repos' >/dev/null 2>&1; then
    echo "$response" | jq -r '.repos[]? | "  - \(.url) (ID: \(.id))"' 2>/dev/null || echo "  (No repositories found)"
  else
    log_error "Unexpected response format:"
    echo "$response" | jq . 2>/dev/null || echo "$response"
  fi
  exit 1
}

function create_task() {
  local repo_id=$1
  local title=$2
  local description=$3
  local provider=$4
  local model=$5
  
  log "Creating task..."
  log "  Title: $title"
  log "  Description: $description"
  log "  Model: $provider/$model"
  
  local data=$(jq -n \
    --arg repoId "$repo_id" \
    --arg title "$title" \
    --arg description "$description" \
    --arg provider "$provider" \
    --arg model "$model" \
    '{
      repoId: $repoId,
      title: $title,
      description: $description,
      priority: "normal",
      modelPreference: {
        provider: $provider,
        model: $model
      }
    }')
  
  local response
  response=$(api_request "POST" "/api/task" "$data" 2>&1)
  local http_code=$?
  
  if [ $http_code -ne 201 ]; then
    log_error "Failed to create task (HTTP $http_code)"
    echo "$response" | jq -r '.error // .message // .' 2>/dev/null || echo "$response"
    exit 1
  fi
  
  local task_id=$(echo "$response" | jq -r '.taskId' 2>/dev/null || echo "")
  if [ -z "$task_id" ] || [ "$task_id" = "null" ]; then
    log_error "Invalid response from task creation"
    echo "$response"
    exit 1
  fi
  
  log_success "Task created: $task_id"
  echo "$task_id"
}

function execute_task() {
  local task_id=$1
  
  log "Executing task: $task_id"
  
  local response
  response=$(api_request "POST" "/api/task/${task_id}/execute" '{}' 2>&1)
  local http_code=$?
  
  if [ $http_code -ne 202 ]; then
    log_error "Failed to execute task (HTTP $http_code)"
    echo "$response" | jq -r '.error // .message // .details // .' 2>/dev/null || echo "$response"
    exit 1
  fi
  
  local status=$(echo "$response" | jq -r '.status' 2>/dev/null || echo "")
  local workspace_id=$(echo "$response" | jq -r '.workspaceId // empty' 2>/dev/null || echo "")
  
  log_success "Task execution started"
  log "  Status: $status"
  if [ -n "$workspace_id" ]; then
    log "  Workspace ID: $workspace_id"
  fi
}

function get_task_status() {
  local task_id=$1
  
  local response
  response=$(api_request "GET" "/api/task/${task_id}" 2>&1)
  local http_code=$?
  
  if [ $http_code -ne 200 ]; then
    log_error "Failed to get task status (HTTP $http_code)"
    return 1
  fi
  
  echo "$response"
}

function wait_for_completion() {
  local task_id=$1
  local start_time=$(date +%s)
  local last_status=""
  
  log "Waiting for task completion (max ${MAX_WAIT_TIME}s)..."
  
  while true; do
    local elapsed=$(($(date +%s) - start_time))
    
    if [ $elapsed -ge $MAX_WAIT_TIME ]; then
      log_error "Task did not complete within ${MAX_WAIT_TIME} seconds"
      return 1
    fi
    
    local task_data=$(get_task_status "$task_id" 2>/dev/null || echo "")
    if [ -z "$task_data" ]; then
      log_warning "Failed to get task status, retrying..."
      sleep $POLL_INTERVAL
      continue
    fi
    
    local status=$(echo "$task_data" | jq -r '.status' 2>/dev/null || echo "")
    local pr_url=$(echo "$task_data" | jq -r '.prUrl // empty' 2>/dev/null || echo "")
    local error=$(echo "$task_data" | jq -r '.error // empty' 2>/dev/null || echo "")
    
    if [ "$status" != "$last_status" ]; then
      log "Status: $status"
      last_status="$status"
    fi
    
    case "$status" in
      "completed")
        log_success "Task completed!"
        if [ -n "$pr_url" ] && [ "$pr_url" != "null" ]; then
          log_success "PR created: $pr_url"
          echo "$pr_url"
        else
          log_warning "Task completed but no PR URL found"
        fi
        return 0
        ;;
      "failed")
        log_error "Task failed"
        if [ -n "$error" ] && [ "$error" != "null" ]; then
          log_error "Error: $error"
        fi
        # Try to get more details
        local message=$(echo "$task_data" | jq -r '.message // empty' 2>/dev/null || echo "")
        if [ -n "$message" ] && [ "$message" != "null" ]; then
          log_error "Details: $message"
        fi
        return 1
        ;;
      "cancelled")
        log_error "Task was cancelled"
        return 1
        ;;
      "queued"|"running")
        # Still in progress
        if [ $((elapsed % 30)) -eq 0 ]; then
          log "Still ${status}... (${elapsed}s elapsed)"
        fi
        ;;
      *)
        log_warning "Unknown status: $status"
        ;;
    esac
    
    sleep $POLL_INTERVAL
  done
}

# Main execution
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Production Task Execution Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
log "Production URL: $PROD_URL"
log "Scenario: ${SCENARIO:-custom}"
log "Model: $MODEL_PROVIDER/$MODEL"
echo ""

# Get repository ID
REPO_ID=$(get_repo_id)
log_success "Repository ID: $REPO_ID"
echo ""

# Create task
TASK_ID=$(create_task "$REPO_ID" "$TASK_TITLE" "$TASK_DESCRIPTION" "$MODEL_PROVIDER" "$MODEL")
echo ""

# Execute task
execute_task "$TASK_ID"
echo ""

# Wait for completion
PR_URL=$(wait_for_completion "$TASK_ID" || echo "")

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
log "Task ID: $TASK_ID"
log "Task URL: ${PROD_URL}/tasks/${TASK_ID}"

if [ -n "$PR_URL" ] && [ "$PR_URL" != "null" ]; then
  log_success "PR created successfully"
  log "PR URL: $PR_URL"
  echo ""
  echo -e "${GREEN}✓ Test PASSED${NC}"
  exit 0
elif [ "$SKIP_PR_CHECK" = "true" ]; then
  log_warning "Skipping PR check"
  echo ""
  echo -e "${YELLOW}⚠ Test completed (PR check skipped)${NC}"
  exit 0
else
  log_error "No PR URL found"
  echo ""
  echo -e "${RED}✗ Test FAILED${NC}"
  exit 1
fi

