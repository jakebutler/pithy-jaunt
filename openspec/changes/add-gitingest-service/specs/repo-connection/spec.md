# Repository Connection Specification - GitIngest Integration

## MODIFIED Requirements

### Requirement: Repository URL Connection

The system SHALL allow authenticated users to connect public GitHub repositories by providing a repository URL. Upon successful connection, the system SHALL trigger GitIngest report generation to create an LLM-friendly analysis of the repository.

#### Scenario: Successful repository connection with GitIngest
- **WHEN** an authenticated user provides a valid public GitHub repository URL
- **THEN** the system validates the URL format
- **AND** verifies the repository is public and accessible
- **AND** creates a repository record in the database
- **AND** triggers GitIngest report generation asynchronously
- **AND** sets `gitingestReportStatus` to "processing"
- **AND** returns a repository ID and connection status
- **AND** initiates CodeRabbit analysis asynchronously (existing behavior)

#### Scenario: Repository connection with GitIngest service unavailable
- **WHEN** GitIngest service is unavailable or times out during repository connection
- **THEN** the repository connection still succeeds
- **AND** `gitingestReportStatus` is set to "pending"
- **AND** user can manually trigger report generation later
- **AND** error is logged for monitoring

#### Scenario: Invalid repository URL format
- **WHEN** a user provides an invalid repository URL
- **THEN** the system returns a 400 Bad Request error
- **AND** displays a clear error message indicating the URL format is invalid
- **AND** suggests the correct GitHub URL format

#### Scenario: Private repository connection attempt
- **WHEN** a user attempts to connect a private repository
- **THEN** the system detects the repository is private
- **AND** returns a 403 Forbidden error
- **AND** displays a message indicating only public repositories are supported in MVP

#### Scenario: Duplicate repository connection
- **WHEN** a user attempts to connect a repository they have already connected
- **THEN** the system detects the duplicate
- **AND** returns a 409 Conflict error
- **AND** provides a link to the existing repository record

#### Scenario: Non-existent repository
- **WHEN** a user provides a URL for a repository that does not exist
- **THEN** the system attempts to fetch repository metadata from GitHub
- **AND** receives a 404 Not Found from GitHub
- **AND** returns a 404 error with a clear message

### Requirement: Repository Metadata Storage

The system SHALL store repository metadata including URL, owner, name, branch, analysis status, and GitIngest report information.

#### Scenario: Repository record creation with GitIngest fields
- **WHEN** a repository is successfully connected
- **THEN** a record is created in the Convex database with:
  - Repository URL
  - Owner (username/organization)
  - Repository name
  - Default branch (or specified branch)
  - Connection timestamp
  - User ID (owner of the connection)
  - Analysis status (initially "pending")
  - GitIngest report status (initially "processing" or "pending")
  - GitIngest report (null initially)
  - GitIngest report generated timestamp (null initially)

#### Scenario: Repository metadata retrieval with GitIngest report
- **WHEN** a user requests their connected repositories
- **THEN** the system returns a list of repositories with:
  - Repository ID
  - Repository name and owner
  - Connection date
  - Analysis status
  - Last analyzed timestamp (if available)
  - GitIngest report status
  - GitIngest report availability indicator

## ADDED Requirements

### Requirement: GitIngest Report Generation Trigger

The system SHALL trigger GitIngest report generation when a repository is connected.

#### Scenario: Automatic report generation on connection
- **WHEN** a repository is successfully connected
- **THEN** the system calls the GitIngest service `/ingest` endpoint
- **AND** includes repository URL, branch, and webhook callback URL
- **AND** authenticates using `GIT_INGEST_API_KEY`
- **AND** handles the request asynchronously (non-blocking)

#### Scenario: Report generation request failure handling
- **WHEN** GitIngest service request fails (network error, timeout, 5xx response)
- **THEN** the system logs the error
- **AND** sets `gitingestReportStatus` to "pending"
- **AND** does not fail the repository connection
- **AND** allows manual retry via UI

#### Scenario: Report generation timeout
- **WHEN** GitIngest service request exceeds timeout (30 seconds)
- **THEN** the system cancels the request
- **AND** sets `gitingestReportStatus` to "pending"
- **AND** logs timeout error
- **AND** allows manual retry

### Requirement: GitIngest Report Webhook Handling

The system SHALL handle webhook callbacks from the GitIngest service with report results.

#### Scenario: Receiving successful report
- **WHEN** GitIngest service sends report results to webhook endpoint
- **THEN** the system verifies the request (optional: webhook signature)
- **AND** parses the report payload
- **AND** updates repository record with:
  - `gitingestReport`: Complete report object
  - `gitingestReportStatus`: "completed"
  - `gitingestReportGeneratedAt`: Current timestamp
- **AND** clears any previous error messages
- **AND** returns 200 OK to GitIngest service

#### Scenario: Receiving failed report
- **WHEN** GitIngest service sends failure notification to webhook endpoint
- **THEN** the system updates repository record with:
  - `gitingestReportStatus`: "failed"
  - `gitingestReportError`: Error message from service
- **AND** logs the failure for monitoring
- **AND** returns 200 OK to acknowledge receipt

#### Scenario: Invalid webhook payload
- **WHEN** the webhook receives an invalid or malformed payload
- **THEN** the system logs the error
- **AND** returns 400 Bad Request
- **AND** does not update repository status

#### Scenario: Webhook for non-existent repository
- **WHEN** webhook callback references a repository that doesn't exist
- **THEN** the system logs the error
- **AND** returns 404 Not Found
- **AND** does not create a new repository record

### Requirement: GitIngest Report Display

The system SHALL display GitIngest reports in the repository detail view.

#### Scenario: Displaying completed report
- **WHEN** a user views a repository with a completed GitIngest report
- **THEN** the system displays:
  - Report summary section
  - Repository structure overview
  - Detected patterns and frameworks
  - Dependencies list
  - LLM context section (formatted for readability)
  - Report generation timestamp

#### Scenario: Displaying report generation in progress
- **WHEN** a user views a repository with `gitingestReportStatus` of "processing"
- **THEN** the system displays a loading indicator
- **AND** shows "Generating repository report..." message
- **AND** provides estimated wait time if available

#### Scenario: Displaying failed report generation
- **WHEN** a user views a repository with `gitingestReportStatus` of "failed"
- **THEN** the system displays an error message
- **AND** shows the error reason if available
- **AND** provides a "Retry Report Generation" button

#### Scenario: Displaying pending report generation
- **WHEN** a user views a repository with `gitingestReportStatus` of "pending"
- **THEN** the system displays a message indicating report is pending
- **AND** provides a "Generate Report" button to manually trigger

### Requirement: Manual Report Generation

The system SHALL allow users to manually trigger GitIngest report generation.

#### Scenario: Manual report generation request
- **WHEN** a user clicks "Generate Report" or "Retry Report Generation"
- **THEN** the system calls the GitIngest service `/ingest` endpoint
- **AND** updates `gitingestReportStatus` to "processing"
- **AND** shows loading state in UI
- **AND** handles errors gracefully

#### Scenario: Manual generation while already processing
- **WHEN** a user attempts to generate a report while one is already processing
- **THEN** the system prevents duplicate requests
- **AND** displays a message indicating report is already being generated
- **AND** does not make additional service calls

### Requirement: GitIngest Report API Endpoint

The system SHALL provide an API endpoint to fetch or trigger GitIngest reports.

#### Scenario: Fetching existing report
- **WHEN** a GET request is made to `/api/repo/[repoId]/gitingest-report`
- **THEN** the system verifies user owns the repository
- **AND** returns the report if available
- **AND** includes report status and generation timestamp

#### Scenario: Triggering report generation
- **WHEN** a POST request is made to `/api/repo/[repoId]/gitingest-report`
- **THEN** the system verifies user owns the repository
- **AND** triggers GitIngest service call
- **AND** returns status indicating report generation started
- **AND** updates repository status to "processing"

#### Scenario: Unauthorized report access
- **WHEN** a user attempts to access a report for a repository they don't own
- **THEN** the system returns 403 Forbidden
- **AND** does not reveal whether the repository exists

