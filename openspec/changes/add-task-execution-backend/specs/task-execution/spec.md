## ADDED Requirements

### Requirement: Task Execution Initialization

The system SHALL accept a task execution request for a queued task and initiate code generation in an isolated execution environment.

#### Scenario: Execute queued task

- **WHEN** an authenticated user requests execution for a task with status "queued"
- **AND** the associated repository is connected and valid
- **THEN** the system SHALL change task status to "running"
- **AND** trigger the execution backend (GitHub Actions workflow)
- **AND** return a success response immediately without waiting for completion

#### Scenario: Reject execution of non-queued task

- **WHEN** an authenticated user requests execution for a task with status other than "queued"
- **THEN** the system SHALL return an error
- **AND** not trigger any execution

#### Scenario: Reject execution without valid repository

- **WHEN** an authenticated user requests execution for a task
- **AND** the associated repository is not connected or invalid
- **THEN** the system SHALL return an error indicating repository connection required
- **AND** not trigger any execution

### Requirement: AI Agent Code Generation

The system SHALL use an AI agent to generate code patches that fulfill the task description in an idiomatic and maintainable way.

#### Scenario: Generate code patch successfully

- **WHEN** the AI agent receives a task with a clear description
- **AND** the repository structure is analyzed
- **THEN** the agent SHALL generate a unified diff patch
- **AND** the patch SHALL contain valid syntax for the target language
- **AND** the patch SHALL include necessary imports and dependencies
- **AND** the patch SHALL follow the project's existing code style

#### Scenario: Include CodeRabbit analysis in context

- **WHEN** CodeRabbit analysis is available for the repository
- **THEN** the agent SHALL include analysis results in the generation context
- **AND** prioritize suggested improvements from the analysis

#### Scenario: Handle ambiguous task descriptions

- **WHEN** the AI agent cannot confidently determine the required changes
- **THEN** the execution SHALL fail with status "needs_clarification"
- **AND** store a message requesting more details from the user

#### Scenario: Respect token limits

- **WHEN** the AI agent processes a task
- **THEN** the system SHALL track token usage
- **AND** fail if token usage exceeds configured limits
- **AND** log token usage for cost monitoring

### Requirement: Patch Application and Validation

The system SHALL apply generated code patches to the repository using git operations with proper validation and error handling.

#### Scenario: Apply valid patch successfully

- **WHEN** a valid unified diff patch is generated
- **THEN** the system SHALL create a new branch with format `pj/<taskId>`
- **AND** apply the patch using git apply
- **AND** commit the changes with message "Pithy Jaunt: <taskTitle>"
- **AND** push the branch to the remote repository

#### Scenario: Handle failed patch application

- **WHEN** a patch fails to apply cleanly
- **THEN** the system SHALL change task status to "needs_review"
- **AND** store the error message and failed patch for review
- **AND** not create a PR
- **AND** send notification to user about the failure

#### Scenario: Validate patch format before application

- **WHEN** a patch is generated
- **THEN** the system SHALL validate it is a proper unified diff format
- **AND** reject malformed patches before attempting git apply

### Requirement: Pull Request Creation

The system SHALL create a GitHub pull request containing the generated changes with proper metadata and formatting.

#### Scenario: Create PR successfully

- **WHEN** changes are committed and pushed to a branch
- **THEN** the system SHALL create a pull request using the GitHub API
- **AND** set PR title to "Pithy Jaunt: <taskTitle>"
- **AND** set PR body to include task description and execution metadata
- **AND** set base branch to "main" (or configured default branch)
- **AND** store the PR URL in the task record

#### Scenario: Handle PR creation failure

- **WHEN** PR creation fails due to API error or rate limiting
- **THEN** the system SHALL retry up to 3 times with exponential backoff
- **AND** if all retries fail, mark task as "failed"
- **AND** store error message for user visibility

#### Scenario: Add CodeRabbit configuration if missing

- **WHEN** creating a PR for a repository without `.coderabbit.yaml`
- **THEN** the system SHALL include a CodeRabbit configuration file in the changes
- **AND** document this addition in the PR body
- **AND** trigger automatic CodeRabbit analysis of the PR

### Requirement: Execution Completion Webhook

The system SHALL receive and process webhook notifications from the execution environment indicating task completion or failure.

#### Scenario: Process successful completion webhook

- **WHEN** a webhook is received with type "task.completed"
- **AND** webhook signature is valid
- **AND** taskId matches an existing running task
- **THEN** the system SHALL update task status to "completed"
- **AND** store the PR URL from the webhook payload
- **AND** store completion timestamp
- **AND** trigger email notification to the user

#### Scenario: Process failure webhook

- **WHEN** a webhook is received with type "task.failed"
- **AND** webhook signature is valid
- **AND** taskId matches an existing running task
- **THEN** the system SHALL update task status to "failed"
- **AND** store the error message from the webhook payload
- **AND** trigger email notification to the user with error details

#### Scenario: Reject webhook with invalid signature

- **WHEN** a webhook is received with invalid or missing signature
- **THEN** the system SHALL reject the webhook with 401 Unauthorized
- **AND** log the attempted webhook for security monitoring
- **AND** not update any task status

#### Scenario: Ignore webhook for non-existent task

- **WHEN** a webhook is received for a taskId that doesn't exist
- **THEN** the system SHALL log a warning
- **AND** return 404 Not Found
- **AND** not create or modify any task

### Requirement: Execution Logs and Streaming

The system SHALL capture execution logs from the execution environment and provide real-time streaming to users viewing the task detail page.

#### Scenario: Stream logs in real-time

- **WHEN** a task is executing
- **AND** a user is viewing the task detail page
- **THEN** the system SHALL stream execution logs via Server-Sent Events
- **AND** update the UI with new log entries within 5 seconds of generation
- **AND** preserve log order

#### Scenario: Store logs persistently

- **WHEN** execution logs are generated
- **THEN** the system SHALL store them in the database
- **AND** associate them with the correct task
- **AND** retain logs for at least 7 days (configurable)
- **AND** automatically clean up logs older than retention period

#### Scenario: Display historical logs

- **WHEN** a user views a completed or failed task
- **THEN** the system SHALL display the full execution log history
- **AND** paginate logs if they exceed 1000 lines
- **AND** provide download option for full logs

#### Scenario: Handle log ingestion from webhook

- **WHEN** a completion webhook includes execution logs
- **THEN** the system SHALL parse and store the logs
- **AND** make them immediately available for viewing
- **AND** handle logs up to 100KB in size

### Requirement: Execution Timeout Handling

The system SHALL enforce execution timeouts to prevent hung tasks and manage resource usage.

#### Scenario: Timeout long-running execution

- **WHEN** a task execution exceeds 10 minutes (configurable)
- **THEN** the execution environment SHALL terminate the process
- **AND** send a failure webhook with timeout error
- **AND** the system SHALL mark task as "failed" with timeout message

#### Scenario: Apply LLM timeout

- **WHEN** an LLM API call exceeds 180 seconds
- **THEN** the agent SHALL cancel the request
- **AND** fail the execution with timeout error
- **AND** log the timeout for monitoring

### Requirement: Execution Error Handling

The system SHALL handle execution errors gracefully and provide clear feedback to users about failure causes.

#### Scenario: Handle LLM API error

- **WHEN** the LLM API returns an error (rate limit, service error, authentication)
- **THEN** the system SHALL mark task as "failed"
- **AND** store the specific error message
- **AND** notify user with actionable error details

#### Scenario: Handle GitHub API error

- **WHEN** GitHub API operations fail (authentication, rate limit, permissions)
- **THEN** the system SHALL mark task as "failed"
- **AND** store the GitHub error response
- **AND** log the error for monitoring
- **AND** retry transient errors up to 3 times

#### Scenario: Handle repository analysis failure

- **WHEN** the agent cannot analyze the repository structure
- **THEN** the system SHALL mark task as "failed"
- **AND** store error message indicating repository issues
- **AND** suggest potential fixes (check repository URL, permissions, etc.)

### Requirement: Multi-Provider LLM Support

The system SHALL support multiple LLM providers (OpenAI, Anthropic) with runtime selection based on configuration.

#### Scenario: Use configured primary provider

- **WHEN** a task execution begins
- **THEN** the system SHALL use the LLM provider specified in MODEL_PROVIDER environment variable
- **AND** use the model specified in MODEL_NAME environment variable

#### Scenario: Fallback to secondary provider

- **WHEN** the primary LLM provider fails with a service error
- **AND** a secondary provider is configured
- **THEN** the system SHALL retry with the secondary provider
- **AND** log the provider fallback

#### Scenario: Support provider-specific parameters

- **WHEN** using OpenAI
- **THEN** the system SHALL use temperature=0.0 for deterministic output
- **WHEN** using Anthropic
- **THEN** the system SHALL include clear step-by-step reasoning prompts

### Requirement: Execution Environment Isolation

The system SHALL execute tasks in isolated environments to prevent interference between concurrent executions.

#### Scenario: Execute multiple tasks concurrently

- **WHEN** multiple tasks are triggered simultaneously
- **THEN** each execution SHALL run in a separate environment
- **AND** executions SHALL not share filesystem or process state
- **AND** executions SHALL not interfere with each other

#### Scenario: Clean up execution environment

- **WHEN** task execution completes (success or failure)
- **THEN** the execution environment SHALL be terminated
- **AND** temporary files and resources SHALL be cleaned up
- **AND** no state SHALL persist between executions

### Requirement: Cost and Usage Monitoring

The system SHALL track and report LLM API usage and costs for monitoring and budget management.

#### Scenario: Track token usage per task

- **WHEN** an LLM API call completes
- **THEN** the system SHALL record total tokens used (prompt + completion)
- **AND** associate token usage with the task
- **AND** log usage for cost analysis

#### Scenario: Alert on high token usage

- **WHEN** a single task uses more than 50,000 tokens
- **THEN** the system SHALL log a warning
- **AND** include the task description for review

#### Scenario: Provide usage analytics

- **WHEN** an administrator views execution metrics
- **THEN** the system SHALL display total token usage per time period
- **AND** estimated costs based on provider pricing
- **AND** success/failure rates
- **AND** average execution time

