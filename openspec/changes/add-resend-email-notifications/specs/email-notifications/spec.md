# Email Notifications Specification

## ADDED Requirements

### Requirement: Resend Email Integration

The system SHALL integrate with Resend API to send transactional emails to users.

#### Scenario: Resend client initialization
- **WHEN** the application starts
- **THEN** the Resend client is initialized with `RESEND_API_KEY` from environment variables
- **AND** if the API key is missing, email sending functions fail gracefully with logged errors

#### Scenario: Email sending error handling
- **WHEN** an email fails to send (network error, invalid API key, etc.)
- **THEN** the error is logged
- **AND** the error does not block the calling operation (e.g., repository connection still succeeds)

### Requirement: CodeRabbit Not Installed Email Notification

The system SHALL send an email to users when they connect a repository that does not have CodeRabbit installed.

#### Scenario: Email sent on repository connection without CodeRabbit
- **WHEN** a user successfully connects a repository
- **AND** CodeRabbit configuration is not detected (`coderabbitDetected === false`)
- **THEN** an email is sent to the user's email address
- **AND** the email contains:
  - Subject line indicating CodeRabbit is not installed
  - Content explaining the benefits of CodeRabbit
  - Call-to-action button/link to `https://app.coderabbit.ai/login?free-trial`
  - Repository name for context

#### Scenario: Email not sent when CodeRabbit is installed
- **WHEN** a user successfully connects a repository
- **AND** CodeRabbit configuration is detected (`coderabbitDetected === true`)
- **THEN** no email is sent

#### Scenario: Email sending does not block repository connection
- **WHEN** a repository connection succeeds
- **AND** email sending fails (network error, invalid email, etc.)
- **THEN** the repository connection still completes successfully
- **AND** the email error is logged for debugging

### Requirement: Email Content

Email content SHALL be simple, playful, and actionable.

#### Scenario: CodeRabbit email content
- **WHEN** the CodeRabbit not installed email is sent
- **THEN** the email contains:
  - A friendly, playful tone
  - Clear explanation of CodeRabbit benefits (code quality, security, performance insights)
  - Prominent call-to-action to sign up for CodeRabbit
  - Repository name for personalization
  - From address that identifies Pithy Jaunt


