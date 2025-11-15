# Repository Connection Specification

## ADDED Requirements

### Requirement: Repository URL Connection

The system SHALL allow authenticated users to connect public GitHub repositories by providing a repository URL.

#### Scenario: Successful repository connection
- **WHEN** an authenticated user provides a valid public GitHub repository URL
- **THEN** the system validates the URL format
- **AND** verifies the repository is public and accessible
- **AND** creates a repository record in the database
- **AND** returns a repository ID and connection status
- **AND** initiates CodeRabbit analysis asynchronously

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

The system SHALL store repository metadata including URL, owner, name, branch, and analysis status.

#### Scenario: Repository record creation
- **WHEN** a repository is successfully connected
- **THEN** a record is created in the Convex database with:
  - Repository URL
  - Owner (username/organization)
  - Repository name
  - Default branch (or specified branch)
  - Connection timestamp
  - User ID (owner of the connection)
  - Analysis status (initially "pending")

#### Scenario: Repository metadata retrieval
- **WHEN** a user requests their connected repositories
- **THEN** the system returns a list of repositories with:
  - Repository ID
  - Repository name and owner
  - Connection date
  - Analysis status
  - Last analyzed timestamp (if available)

### Requirement: CodeRabbit Configuration Detection

The system SHALL detect if a repository already has CodeRabbit configuration before initiating analysis.

#### Scenario: CodeRabbit config detected
- **WHEN** a repository is connected
- **THEN** the system checks for `.coderabbit.yaml` file in the repository
- **AND** if found, marks `coderabbitDetected` as true
- **AND** uses existing configuration for analysis

#### Scenario: CodeRabbit config not found
- **WHEN** a repository is connected without CodeRabbit configuration
- **THEN** the system marks `coderabbitDetected` as false
- **AND** CodeRabbit API creates default configuration
- **AND** analysis proceeds with default settings

### Requirement: CodeRabbit Analysis Integration

The system SHALL integrate with CodeRabbit API to analyze connected repositories and generate task suggestions.

#### Scenario: Analysis initiation
- **WHEN** a repository is successfully connected
- **THEN** the system triggers CodeRabbit analysis asynchronously
- **AND** updates repository status to "analyzing"
- **AND** provides a webhook URL for analysis completion callback

#### Scenario: Analysis completion via webhook
- **WHEN** CodeRabbit completes analysis
- **THEN** CodeRabbit sends results to the webhook endpoint
- **AND** the system updates repository status to "completed"
- **AND** stores analysis report and suggested tasks
- **AND** updates `lastAnalyzedAt` timestamp

#### Scenario: Analysis failure
- **WHEN** CodeRabbit analysis fails
- **THEN** the system receives an error from CodeRabbit
- **AND** updates repository status to "failed"
- **AND** stores error details for user visibility
- **AND** allows user to retry analysis

### Requirement: Repository List View

The system SHALL provide a list view of all repositories connected by the authenticated user.

#### Scenario: Viewing repository list
- **WHEN** an authenticated user navigates to the repositories page
- **THEN** the system fetches all repositories for that user
- **AND** displays them in a list or grid layout
- **AND** shows repository name, owner, status, and last analyzed time
- **AND** provides a link to repository details

#### Scenario: Empty repository list
- **WHEN** a user has no connected repositories
- **THEN** the system displays an empty state
- **AND** shows a "Connect Repository" call-to-action
- **AND** provides instructions on how to connect a repository

#### Scenario: Repository list loading state
- **WHEN** repositories are being fetched
- **THEN** the system displays loading skeletons or spinners
- **AND** prevents user interaction until data is loaded

### Requirement: Repository Detail View

The system SHALL provide a detailed view of a connected repository including analysis results.

#### Scenario: Viewing repository details
- **WHEN** a user navigates to a repository detail page
- **THEN** the system fetches repository data and latest analysis
- **AND** displays repository metadata (name, owner, URL, branch)
- **AND** shows analysis status and results
- **AND** displays suggested tasks from CodeRabbit analysis

#### Scenario: Repository not found
- **WHEN** a user attempts to access a repository that doesn't exist
- **THEN** the system returns a 404 Not Found error
- **AND** displays a user-friendly error page
- **AND** provides a link back to repository list

#### Scenario: Unauthorized repository access
- **WHEN** a user attempts to access a repository they don't own
- **THEN** the system verifies ownership
- **AND** returns a 403 Forbidden error
- **AND** redirects to repository list

### Requirement: CodeRabbit Report Display

The system SHALL display CodeRabbit analysis results including summary and suggested tasks.

#### Scenario: Displaying analysis report
- **WHEN** analysis is completed for a repository
- **THEN** the system displays:
  - Analysis summary text
  - List of suggested tasks with titles and descriptions
  - Task priority or "roughness" level
  - Option to create tasks from suggestions

#### Scenario: Analysis in progress
- **WHEN** analysis is still in progress
- **THEN** the system displays a loading indicator
- **AND** shows "Analysis in progress" message
- **AND** provides estimated wait time if available

#### Scenario: Analysis failed
- **WHEN** analysis has failed
- **THEN** the system displays an error message
- **AND** shows the reason for failure (if available)
- **AND** provides a "Retry Analysis" button

### Requirement: Repository Connection Form

The system SHALL provide a form for users to connect repositories with validation and feedback.

#### Scenario: Form submission with valid URL
- **WHEN** a user enters a valid GitHub repository URL and submits
- **THEN** the form validates the URL format client-side
- **AND** shows loading state during submission
- **AND** displays success message on completion
- **AND** redirects to repository detail page or list

#### Scenario: Form validation errors
- **WHEN** a user enters an invalid URL
- **THEN** the form displays inline validation error
- **AND** highlights the input field
- **AND** prevents form submission
- **AND** provides helpful error message

#### Scenario: Form accessibility
- **WHEN** a user navigates the form with keyboard
- **THEN** all fields are accessible via Tab key
- **AND** error messages are announced to screen readers
- **AND** form submission works via Enter key
- **AND** proper ARIA labels are present

### Requirement: Webhook Handling for CodeRabbit

The system SHALL handle webhook callbacks from CodeRabbit with analysis results.

#### Scenario: Receiving analysis results
- **WHEN** CodeRabbit sends analysis results to the webhook endpoint
- **THEN** the system verifies webhook authenticity (if signatures provided)
- **AND** parses the analysis payload
- **AND** updates repository record with results
- **AND** creates task suggestions in the database
- **AND** returns 200 OK to CodeRabbit

#### Scenario: Invalid webhook payload
- **WHEN** the webhook receives an invalid payload
- **THEN** the system logs the error
- **AND** returns 400 Bad Request
- **AND** does not update repository status

#### Scenario: Webhook authentication failure
- **WHEN** webhook signature verification fails (if implemented)
- **THEN** the system rejects the request
- **AND** returns 401 Unauthorized
- **AND** logs security event

### Requirement: Error Handling and User Feedback

The system SHALL provide clear, actionable error messages for all failure scenarios.

#### Scenario: GitHub API errors
- **WHEN** GitHub API returns an error
- **THEN** the system handles common errors:
  - Rate limit: Show "Too many requests, please try again later"
  - Network error: Show "Connection failed, please check your internet"
  - Authentication error: Show "GitHub authentication failed"
- **AND** logs detailed error for debugging

#### Scenario: CodeRabbit API errors
- **WHEN** CodeRabbit API returns an error
- **THEN** the system displays user-friendly message
- **AND** allows user to retry analysis
- **AND** logs error details for support

#### Scenario: Database errors
- **WHEN** Convex database operations fail
- **THEN** the system displays "Service temporarily unavailable"
- **AND** logs error for investigation
- **AND** allows user to retry the operation

