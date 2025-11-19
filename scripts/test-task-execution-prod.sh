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

# Test scenarios (complexity levels) - using functions instead of associative arrays for compatibility
get_scenario_description() {
  case "$1" in
    simple)
      echo "Update the README.md file to add a 'Testing' section with instructions on how to run tests"
      ;;
    medium)
      echo "Add a new file called CONTRIBUTING.md with guidelines for contributors, including code style and PR process"
      ;;
    complex)
      echo "Create a new API endpoint /api/health that returns a JSON response with status: 'ok' and timestamp. Include proper error handling and add it to the main router."
      ;;
    *)
      echo ""
      ;;
  esac
}

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
  TASK_DESCRIPTION=$(get_scenario_description "$SCENARIO")
  if [ -z "$TASK_DESCRIPTION" ]; then
    echo -e "${RED}Error: Unknown scenario: $SCENARIO${NC}"
    echo "Available scenarios: simple, medium, complex"
    exit 1
  fi
  if [ -z "$TASK_TITLE" ]; then
    # Capitalize first letter of scenario
    SCENARIO_TITLE=$(echo "$SCENARIO" | sed 's/^./\U&/')
    TASK_TITLE="Test: ${SCENARIO_TITLE} scenario - $(date +%H:%M:%S)"
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
  local code_file="${4:-/tmp/api_http_code_$$}"
  
  log_verbose "API Request: $method $url" >&2
  if [ -n "$data" ]; then
    log_verbose "Request body: $data" >&2
  fi
  
  local http_code
  local curl_output
  
  if [ -n "$data" ]; then
    # Use -w to append HTTP code on new line, then split body and code
    curl_output=$(curl -s --max-time 30 -w "\n%{http_code}" -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      -d "$data" \
      "$url" 2>/dev/null)
  else
    curl_output=$(curl -s --max-time 30 -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
      "$url" 2>/dev/null)
  fi
  
  local curl_exit=$?
  
  # Split output: last line is HTTP code, everything else is body
  http_code=$(echo "$curl_output" | tail -n1 | tr -d '\r\n')
  local body=$(echo "$curl_output" | sed '$d' | tr -d '\0')
  
  # Save HTTP code to file for caller
  echo "$http_code" > "$code_file"
  
  # If curl failed, return error
  if [ $curl_exit -ne 0 ]; then
    log_verbose "Curl failed with exit code: $curl_exit" >&2
    echo "{\"error\":\"Request failed\"}"
    echo "500" > "$code_file"
    return 1
  fi
  
  # Validate HTTP code is numeric
  if ! echo "$http_code" | grep -qE '^[0-9]{3}$'; then
    log_verbose "Invalid HTTP code received: $http_code" >&2
    http_code="500"
    echo "$http_code" > "$code_file"
  fi
  
  log_verbose "Response code: $http_code" >&2
  log_verbose "Response body: $body" >&2
  
  # Output body only
  echo "$body"
  # Return 0 for success, 1 for error (bash return codes are 0-255)
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    return 0
  else
    return 1
  fi
}

function get_repo_id() {
  if [ -n "$REPO_ID" ]; then
    echo "$REPO_ID"
    return
  fi
  
  log "Looking up repository ID for: $REPO_URL" >&2
  
  # Get all repos for the user and find matching URL
  local code_file="/tmp/repo_http_code_$$"
  local response
  response=$(api_request "GET" "/api/repo" "" "$code_file")
  local api_exit=$?
  local http_code=$(cat "$code_file" 2>/dev/null || echo "500")
  rm -f "$code_file"
  
  if [ $api_exit -ne 0 ] || [ "$http_code" != "200" ]; then
    log_error "Failed to fetch repositories (HTTP $http_code)" >&2
    if [ -n "$response" ]; then
      log_error "Response: $response" >&2
    fi
    exit 1
  fi
  
  if [ -z "$response" ]; then
    log_error "Empty response from API" >&2
    exit 1
  fi
  
  # Check if response is valid JSON
  if ! echo "$response" | jq empty 2>/dev/null; then
    log_error "Invalid JSON response from API" >&2
    log_error "Response: $response" >&2
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
    log_success "Found repository ID: $repo_id" >&2
    echo "$repo_id"
    return
  fi
  
  log_error "Repository not found. Please connect the repository first or provide --repo-id" >&2
  log "Available repositories:" >&2
  if echo "$response" | jq -e '.repos' >/dev/null 2>&1; then
    echo "$response" | jq -r '.repos[]? | "  - \(.url) (ID: \(.id))"' 2>/dev/null || echo "  (No repositories found)" >&2
  else
    log_error "Unexpected response format:" >&2
    echo "$response" | jq . 2>/dev/null || echo "$response" >&2
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
  
  local code_file="/tmp/task_http_code_$$"
  local response
  response=$(api_request "POST" "/api/task" "$data" "$code_file")
  local api_exit=$?
  local http_code=$(cat "$code_file" 2>/dev/null || echo "500")
  rm -f "$code_file"
  
  if [ $api_exit -ne 0 ] || [ "$http_code" != "201" ]; then
    log_error "Failed to create task (HTTP $http_code)" >&2
    echo "$response" | jq -r '.error // .message // .details // .' 2>/dev/null || echo "$response" >&2
    exit 1
  fi
  
  local task_id=$(echo "$response" | jq -r '.taskId' 2>/dev/null || echo "")
  if [ -z "$task_id" ] || [ "$task_id" = "null" ]; then
    log_error "Invalid response from task creation" >&2
    echo "$response" >&2
    exit 1
  fi
  
  log_success "Task created: $task_id" >&2
  echo "$task_id"
}

function execute_task() {
  local task_id=$1
  
  log "Executing task: $task_id"
  
  local code_file="/tmp/execute_http_code_$$"
  local response
  response=$(api_request "POST" "/api/task/${task_id}/execute" '{}' "$code_file")
  local api_exit=$?
  local http_code=$(cat "$code_file" 2>/dev/null || echo "500")
  rm -f "$code_file"
  
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
  
  local code_file="/tmp/task_get_http_code_$$"
  local response
  response=$(api_request "GET" "/api/task/${task_id}" "" "$code_file")
  local api_exit=$?
  local http_code=$(cat "$code_file" 2>/dev/null || echo "500")
  rm -f "$code_file"
  
  if [ $api_exit -ne 0 ] || [ "$http_code" != "200" ]; then
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
      "completed"|"needs_review")
        # Task completed - check if PR was created
        if [ -n "$pr_url" ] && [ "$pr_url" != "null" ] && [ "$pr_url" != "" ]; then
          log_success "Task completed with PR: $pr_url"
          echo "$pr_url"
          return 0
        else
          if [ "$status" = "needs_review" ]; then
            log_warning "Task status is 'needs_review' but no PR URL found"
            log "This may indicate the PR creation failed or the webhook was sent incorrectly"
          else
            log_warning "Task completed but no PR URL found"
          fi
          # Still return success if task completed, but log the issue
          return 0
        fi
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

