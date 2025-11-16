# Repository Connection Specification

## MODIFIED Requirements

### Requirement: Repository URL Connection

The system SHALL allow authenticated users to connect public GitHub repositories by providing a repository URL. After successful connection, the system SHALL automatically generate a git ingest digest for the repository.

#### Scenario: Successful repository connection with git ingest
- **WHEN** an authenticated user provides a valid public GitHub repository URL
- **THEN** the system validates the URL format
- **AND** verifies the repository is public and accessible
- **AND** creates a repository record in the database
- **AND** returns a repository ID and connection status
- **AND** initiates CodeRabbit analysis asynchronously
- **AND** initiates git ingest processing asynchronously
- **AND** updates repository record with git ingest status "processing"

#### Scenario: Repository connection with git ingest failure
- **WHEN** a repository is successfully connected
- **AND** git ingest processing fails (timeout, network error, etc.)
- **THEN** the repository connection still succeeds
- **AND** git ingest status is set to "failed"
- **AND** error is logged for debugging
- **AND** user can still use the repository normally

#### Scenario: Git ingest processing completion
- **WHEN** git ingest processing completes successfully
- **THEN** the system stores the git ingest content in the repository record
- **AND** updates git ingest status to "completed"
- **AND** sets gitIngestGeneratedAt timestamp
- **AND** git ingest content is available for future use by coding agents

### Requirement: Repository Metadata Storage

The system SHALL store repository metadata including URL, owner, name, branch, analysis status, and git ingest content.

#### Scenario: Repository record creation with git ingest fields
- **WHEN** a repository is successfully connected
- **THEN** a record is created in the Convex database with:
  - Repository URL
  - Owner (username/organization)
  - Repository name
  - Default branch (or specified branch)
  - Connection timestamp
  - User ID (owner of the connection)
  - Analysis status (initially "pending")
  - Git ingest status (initially "pending")
  - Git ingest content (initially null)
  - Git ingest generated timestamp (initially null)

#### Scenario: Git ingest content retrieval
- **WHEN** a user or agent requests git ingest content for a repository
- **THEN** the system returns the stored git ingest content if available
- **AND** returns git ingest status and timestamp
- **AND** returns null if git ingest has not been generated or failed

## ADDED Requirements

### Requirement: Git Ingest Automation

The system SHALL automatically generate a git ingest digest for each connected repository using GitIngest.com via browser automation.

#### Scenario: Automatic git ingest generation
- **WHEN** a repository is successfully connected
- **THEN** the system automatically triggers git ingest processing
- **AND** uses browser-use to navigate to GitIngest.com
- **AND** enters the repository URL
- **AND** waits for processing to complete
- **AND** downloads the generated digest file
- **AND** stores the content in the repository record

#### Scenario: Git ingest processing states
- **WHEN** git ingest processing is initiated
- **THEN** the repository git ingest status is set to "processing"
- **WHEN** git ingest processing completes successfully
- **THEN** the status is updated to "completed"
- **WHEN** git ingest processing fails
- **THEN** the status is updated to "failed"
- **WHEN** git ingest has not been initiated
- **THEN** the status remains "pending"

#### Scenario: Git ingest timeout handling
- **WHEN** git ingest processing exceeds the timeout limit (5 minutes)
- **THEN** the system cancels the processing
- **AND** updates git ingest status to "failed"
- **AND** logs the timeout error
- **AND** repository connection remains successful

#### Scenario: Git ingest retry on transient failure
- **WHEN** git ingest processing fails with a transient error (network timeout, temporary service unavailability)
- **THEN** the system retries the processing once
- **AND** if retry succeeds, updates status to "completed"
- **AND** if retry also fails, updates status to "failed"
- **AND** logs both attempts for debugging

### Requirement: Git Ingest Content Storage

The system SHALL store the git ingest digest content in the repository record for use by coding agents.

#### Scenario: Git ingest content storage
- **WHEN** git ingest processing completes successfully
- **THEN** the system stores the full digest text content in the repository record
- **AND** the content is stored in the `gitIngestContent` field
- **AND** the content is available for immediate use by coding agents
- **AND** the content persists even if GitIngest.com becomes unavailable

#### Scenario: Git ingest content access
- **WHEN** a coding agent needs repository context
- **THEN** the system can retrieve the stored git ingest content
- **AND** the content provides codebase structure and file summaries
- **AND** the content helps agents understand the repository before making changes

### Requirement: Git Ingest Error Handling

The system SHALL handle git ingest processing errors gracefully without impacting repository connection.

#### Scenario: Network error during git ingest
- **WHEN** a network error occurs during git ingest processing
- **THEN** the system logs the error
- **AND** updates git ingest status to "failed"
- **AND** repository connection remains successful
- **AND** user can still use the repository

#### Scenario: Browser automation failure
- **WHEN** browser automation fails (browser crash, page load timeout, etc.)
- **THEN** the system logs the error with details
- **AND** updates git ingest status to "failed"
- **AND** repository connection remains successful
- **AND** error details are available for debugging

#### Scenario: Invalid repository URL for git ingest
- **WHEN** git ingest processing receives an invalid repository URL
- **THEN** the system detects the error
- **AND** updates git ingest status to "failed"
- **AND** logs the validation error
- **AND** repository connection remains successful (URL was valid for connection)
