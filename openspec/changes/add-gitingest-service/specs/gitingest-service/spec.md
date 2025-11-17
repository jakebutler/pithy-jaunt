# GitIngest Service Specification

## ADDED Requirements

### Requirement: GitIngest Service Endpoint

The system SHALL provide a Python microservice deployed on Render that generates LLM-friendly repository reports using the GitIngest library.

#### Scenario: Successful report generation request
- **WHEN** the Next.js app sends a POST request to `/ingest` with valid repository URL and authentication
- **THEN** the service validates the API key from Authorization header
- **AND** accepts the request with status 202 Accepted
- **AND** initiates asynchronous report generation
- **AND** returns a job ID and estimated completion time

#### Scenario: Unauthorized request
- **WHEN** a request is made without valid API key
- **THEN** the service returns 401 Unauthorized
- **AND** does not process the request

#### Scenario: Invalid repository URL
- **WHEN** a request contains an invalid or inaccessible repository URL
- **THEN** the service returns 400 Bad Request
- **AND** includes an error message describing the issue

#### Scenario: Report generation timeout
- **WHEN** report generation exceeds the maximum timeout (5 minutes)
- **THEN** the service cancels the operation
- **AND** sends webhook callback with status "failed"
- **AND** includes timeout error message

### Requirement: Repository Report Generation

The GitIngest service SHALL generate comprehensive, structured reports about repository structure, patterns, and context suitable for LLM consumption.

#### Scenario: Report structure generation
- **WHEN** a repository is successfully analyzed
- **THEN** the report includes:
  - Summary: High-level overview of the repository
  - Structure: Directory layout, file counts, languages, entry points
  - Patterns: Framework, architecture style, testing approach, build tools
  - Dependencies: Runtime and development dependencies, package manager
  - LLM Context: Formatted context string optimized for LLM agents

#### Scenario: Large repository handling
- **WHEN** analyzing a repository with many files (>1000 files)
- **THEN** the service processes the repository efficiently
- **AND** generates a report within timeout limits
- **AND** includes representative samples if full analysis is not feasible

#### Scenario: Multi-language repository
- **WHEN** analyzing a repository with multiple programming languages
- **THEN** the report identifies all languages present
- **AND** provides context for each major language
- **AND** identifies the primary language and framework

### Requirement: Webhook Callback Delivery

The GitIngest service SHALL deliver report results to the Next.js app via webhook callback.

#### Scenario: Successful callback delivery
- **WHEN** report generation completes successfully
- **THEN** the service sends POST request to the callback URL
- **AND** includes the complete report in the payload
- **AND** includes job ID and repository URL for correlation
- **AND** sets status to "completed"

#### Scenario: Callback delivery failure
- **WHEN** webhook callback fails (network error, timeout, 5xx response)
- **THEN** the service retries the callback up to 3 times with exponential backoff
- **AND** logs the failure for monitoring
- **AND** stores the report for manual retrieval if all retries fail

#### Scenario: Callback payload format
- **WHEN** sending webhook callback
- **THEN** the payload includes:
  - jobId: Unique identifier for the job
  - repoUrl: Repository URL that was analyzed
  - branch: Branch that was analyzed
  - status: "completed" or "failed"
  - report: Complete report object (if successful)
  - error: Error message (if failed)

### Requirement: Service Authentication

The GitIngest service SHALL authenticate requests using a shared API key.

#### Scenario: Valid API key authentication
- **WHEN** a request includes `Authorization: Bearer <valid-api-key>` header
- **THEN** the service validates the key against configured `INGEST_API_KEY`
- **AND** processes the request if key matches

#### Scenario: Missing API key
- **WHEN** a request does not include Authorization header
- **THEN** the service returns 401 Unauthorized
- **AND** includes error message "Missing authorization header"

#### Scenario: Invalid API key
- **WHEN** a request includes an invalid API key
- **THEN** the service returns 401 Unauthorized
- **AND** does not reveal whether the key format is correct (security best practice)

### Requirement: Error Handling and Logging

The GitIngest service SHALL handle errors gracefully and log operations for monitoring.

#### Scenario: Repository access error
- **WHEN** the repository cannot be accessed (private, deleted, network error)
- **THEN** the service sends webhook callback with status "failed"
- **AND** includes descriptive error message
- **AND** logs the error with appropriate level

#### Scenario: GitIngest library error
- **WHEN** the GitIngest library raises an exception during analysis
- **THEN** the service catches the exception
- **AND** sends webhook callback with status "failed"
- **AND** logs the full error stack trace
- **AND** includes user-friendly error message in callback

#### Scenario: Service logging
- **WHEN** any operation occurs (request received, report generated, callback sent)
- **THEN** the service logs the event with appropriate level (info, warn, error)
- **AND** includes relevant context (job ID, repo URL, timing)
- **AND** follows structured logging format for easy parsing

### Requirement: Local Development Support

The GitIngest service SHALL support local development with hot-reload and easy setup.

#### Scenario: Local service startup
- **WHEN** developer runs `uvicorn main:app --reload --port 8001`
- **THEN** the service starts on localhost:8001
- **AND** auto-reloads on code changes
- **AND** uses local environment variables or defaults

#### Scenario: Local testing
- **WHEN** testing locally with Next.js app
- **THEN** Next.js app can connect to local GitIngest service
- **AND** uses `GIT_INGEST_BASE_URL=http://localhost:8001` in `.env.local`
- **AND** uses shared local API key for authentication

