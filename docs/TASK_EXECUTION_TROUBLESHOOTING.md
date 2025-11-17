# Task Execution Troubleshooting Guide

This guide covers how to test, debug, and troubleshoot issues with task execution, particularly patch generation and application failures.

## Overview

Task execution involves several steps:
1. **Workspace Creation**: Daytona workspace is provisioned
2. **Repository Cloning**: Target repository is cloned
3. **Patch Generation**: AI agent generates a unified diff patch
4. **Patch Validation**: Patch format is validated
5. **Patch Application**: Patch is applied using `git apply`
6. **Commit & Push**: Changes are committed and pushed
7. **PR Creation**: Pull request is created via GitHub API

## Common Failure Points

### 1. Patch Generation Failures

**Symptoms:**
- Error: "AI agent failed to generate patch"
- Empty or missing patch file

**Causes:**
- LLM API errors (timeout, rate limit, invalid API key)
- Token limits exceeded
- Invalid task description

**Debugging:**
- Check execution logs for LLM API errors
- Verify API keys are set correctly
- Check token usage in logs
- Review task description clarity

### 2. Patch Format Errors

**Symptoms:**
- Error: "Patch validation failed"
- Error: "malformed patch"
- Missing diff markers (---, +++, @@)

**Causes:**
- LLM generated invalid diff format
- Markdown code blocks not properly extracted
- Missing context lines

**Debugging:**
- Review patch content in execution logs
- Use `git apply --check` to validate format
- Check system prompt adherence

### 3. Patch Application Failures (Most Common)

**Symptoms:**
- Error: "patch does not apply"
- Error: "context lines don't match"
- Error: "file does not exist"

**Causes:**
- Context lines in patch don't match actual file contents
- File paths are incorrect
- Whitespace/indentation mismatches
- Files were modified between patch generation and application

**Debugging:**
- Compare patch context lines with actual file contents
- Check file paths in patch match repository structure
- Verify whitespace matches exactly (tabs vs spaces)
- Review execution logs for full patch content

## Improvements Made

### 1. Enhanced Error Logging

**execution.sh:**
- Added detailed patch preview (first 50 and last 20 lines)
- Validates patch format before applying
- Captures full git apply output
- Attempts `--3way` fallback for conflict resolution
- Includes patch content in error webhooks

**agent-runner.py:**
- Enhanced patch format validation with specific error messages
- Validates hunk format, file headers, and context lines
- Provides detailed validation feedback

### 2. Improved System Prompt

**system-prompt.md:**
- Emphasizes EXACT context line matching
- Provides examples of correct vs incorrect usage
- Explains why context matching is critical
- Includes step-by-step instructions

**agent-runner.py user prompt:**
- Reinforces exact context matching requirements
- Specifies minimum context lines (3 before/after)
- Emphasizes character-for-character copying

### 3. Better Error Categorization

**webhook handler:**
- Categorizes errors (patch_context_mismatch, patch_file_not_found, etc.)
- Stores detailed error information in execution logs
- Distinguishes patch failures from other failures
- Sets appropriate task status (needs_review vs failed)

### 4. Testing Tools

**test-patch-generation.sh:**
- Local testing script for patch generation
- Validates patches before applying
- Creates backups for safe testing
- Provides detailed debugging output

## Testing Locally

### Using the Test Script

```bash
# Test patch generation on a local repository
./scripts/test-patch-generation.sh /path/to/repo "Update README.md to add installation instructions"

# With custom model
MODEL_PROVIDER=anthropic MODEL=claude-3-5-sonnet-20241022 \
  ./scripts/test-patch-generation.sh /path/to/repo "Your task description"
```

The script will:
1. Generate a patch using the AI agent
2. Display the patch content
3. Validate the patch format
4. Attempt to apply the patch
5. Show the changes made
6. Create a backup for restoration

### Manual Testing Steps

1. **Clone a test repository:**
   ```bash
   git clone https://github.com/your-org/test-repo /tmp/test-repo
   ```

2. **Generate a patch:**
   ```bash
   cd /path/to/pithy-jaunt
   python3 daytona/agent-runner.py \
     --prompt-file daytona/system-prompt.md \
     --task "Update README.md" \
     --repo-path /tmp/test-repo \
     --out /tmp/test-patch.diff \
     --provider openai \
     --model gpt-4o
   ```

3. **Validate the patch:**
   ```bash
   cd /tmp/test-repo
   git apply --check --verbose /tmp/test-patch.diff
   ```

4. **Apply the patch:**
   ```bash
   git apply --verbose /tmp/test-patch.diff
   # Or with conflict resolution:
   git apply --3way --verbose /tmp/test-patch.diff
   ```

## Debugging Failed Tasks

### 1. Check Execution Logs

View execution logs in the UI or via Convex:
- Look for error category (patch_context_mismatch, etc.)
- Review full error message and details
- Check patch preview if available

### 2. Analyze Patch Content

If patch is available in logs:
1. Copy the patch content
2. Save to a file: `/tmp/failed-patch.diff`
3. Validate format: `git apply --check /tmp/failed-patch.diff`
4. Compare context lines with actual file contents

### 3. Common Fixes

**Context Mismatch:**
- Agent didn't use exact lines from provided files
- File was modified between generation and application
- Whitespace differences (tabs vs spaces)

**File Not Found:**
- Incorrect file path in patch
- File doesn't exist in repository
- Path relative to wrong directory

**Malformed Patch:**
- Missing diff markers
- Invalid hunk format
- Unbalanced file headers

## Best Practices

### For Task Descriptions

- Be specific about which files to modify
- Include exact file paths when possible
- Describe the change clearly
- Avoid ambiguous requirements

### For System Prompt

- Emphasize exact context matching
- Provide clear examples
- Explain consequences of mismatches
- Reinforce requirements in user prompt

### For Patch Generation

- Always validate patch format before applying
- Use `git apply --check` for validation
- Try `--3way` for conflict resolution
- Capture full error output for debugging

## Monitoring

### Key Metrics to Track

- Patch generation success rate
- Patch application success rate
- Common error categories
- Average execution time
- Token usage per task

### Log Analysis

Look for patterns in failures:
- Which error categories are most common?
- Are certain file types more problematic?
- Do specific task types fail more often?
- Are there patterns in context mismatches?

## Next Steps

If tasks continue to fail:

1. **Review recent changes** to system prompt or agent-runner
2. **Test with simple tasks** first (e.g., README updates)
3. **Compare successful vs failed patches** to identify patterns
4. **Consider increasing context lines** in system prompt
5. **Add more file content** to relevant_files in agent-runner
6. **Experiment with different models** (GPT-4o vs Claude)

## Related Files

- `daytona/execution.sh` - Main execution script
- `daytona/agent-runner.py` - Patch generation logic
- `daytona/system-prompt.md` - AI agent instructions
- `app/api/webhook/daytona/route.ts` - Webhook handler
- `scripts/test-patch-generation.sh` - Local testing script


