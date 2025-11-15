# Authentication Specification

## ADDED Requirements

### Requirement: User Registration with Email and Password

The system SHALL allow new users to register using an email address and password.

#### Scenario: Successful registration
- **WHEN** a user provides a valid email and password (minimum 8 characters)
- **THEN** a new user account is created in Supabase
- **AND** the user record is synced to Convex users table
- **AND** a session token is generated and returned
- **AND** the user is automatically logged in

#### Scenario: Registration with existing email
- **WHEN** a user attempts to register with an email that already exists
- **THEN** the system returns a 409 Conflict error
- **AND** an appropriate error message is displayed

#### Scenario: Registration with invalid email
- **WHEN** a user provides an invalid email format
- **THEN** the system returns a 400 Bad Request error
- **AND** client-side validation prevents submission

#### Scenario: Registration with weak password
- **WHEN** a user provides a password shorter than 8 characters
- **THEN** the system returns a 400 Bad Request error
- **AND** password strength requirements are displayed

### Requirement: User Login with Email and Password

The system SHALL allow registered users to authenticate using their email and password.

#### Scenario: Successful login
- **WHEN** a user provides valid credentials
- **THEN** the system generates a session token
- **AND** the token is stored in a secure HTTP-only cookie
- **AND** the user is redirected to the dashboard

#### Scenario: Login with incorrect password
- **WHEN** a user provides an incorrect password
- **THEN** the system returns a 401 Unauthorized error
- **AND** no information about account existence is revealed

#### Scenario: Login with non-existent email
- **WHEN** a user provides an email that doesn't exist
- **THEN** the system returns a 401 Unauthorized error
- **AND** the response is identical to incorrect password case (security)

### Requirement: Passwordless Authentication with Magic Link

The system SHALL provide a passwordless authentication option via email magic links.

#### Scenario: Magic link request
- **WHEN** a user requests a magic link with a valid email
- **THEN** an email is sent with a unique authentication link
- **AND** the link expires after 15 minutes
- **AND** a success message is displayed regardless of email existence (security)

#### Scenario: Magic link redemption
- **WHEN** a user clicks a valid magic link
- **THEN** the user is authenticated automatically
- **AND** a session is created
- **AND** the user is redirected to the dashboard

#### Scenario: Expired magic link
- **WHEN** a user clicks a magic link after 15 minutes
- **THEN** the system returns an error
- **AND** the user is prompted to request a new link

### Requirement: Session Management

The system SHALL maintain user sessions securely across requests.

#### Scenario: Session persistence
- **WHEN** an authenticated user refreshes the page
- **THEN** the session is maintained
- **AND** the user remains logged in
- **AND** user data is available without re-authentication

#### Scenario: Session expiration
- **WHEN** a session token expires (after 7 days of inactivity)
- **THEN** the user is logged out automatically
- **AND** protected routes redirect to login
- **AND** the expired token is cleared

#### Scenario: Token refresh
- **WHEN** a session is active but the access token is near expiration
- **THEN** the system automatically refreshes the token
- **AND** the session continues without interruption

### Requirement: User Logout

The system SHALL allow authenticated users to terminate their session.

#### Scenario: Successful logout
- **WHEN** an authenticated user initiates logout
- **THEN** the session token is revoked in Supabase
- **AND** all session cookies are cleared
- **AND** the user is redirected to the login page

#### Scenario: Logout from all devices
- **WHEN** a user chooses to logout from all devices (future enhancement)
- **THEN** all active sessions are revoked
- **AND** the user must re-authenticate on all devices

### Requirement: Protected Routes

The system SHALL restrict access to authenticated routes based on session validity.

#### Scenario: Accessing protected route while authenticated
- **WHEN** an authenticated user accesses a protected route
- **THEN** the page content is displayed
- **AND** the user data is available in the component

#### Scenario: Accessing protected route while unauthenticated
- **WHEN** an unauthenticated user attempts to access a protected route
- **THEN** the user is redirected to the login page
- **AND** the original destination is preserved for post-login redirect

#### Scenario: Session validation on API requests
- **WHEN** a client makes an API request to a protected endpoint
- **THEN** the session token is validated
- **AND** requests without valid tokens receive a 401 Unauthorized response

### Requirement: Authentication State Management

The system SHALL provide React context and hooks for accessing authentication state.

#### Scenario: Using auth context in components
- **WHEN** a component needs to access user information
- **THEN** it can use the `useUser()` hook
- **AND** the hook provides user data, loading state, and error state

#### Scenario: Conditional rendering based on auth state
- **WHEN** a component needs to render differently for authenticated users
- **THEN** it can check authentication status via `useAuth()`
- **AND** loading states are handled gracefully

### Requirement: User Data Synchronization

The system SHALL synchronize user data between Supabase Auth and Convex database.

#### Scenario: User creation sync
- **WHEN** a new user registers in Supabase
- **THEN** a corresponding user record is created in Convex
- **AND** the Convex record includes userId, email, and createdAt timestamp

#### Scenario: User data consistency
- **WHEN** user profile information is updated
- **THEN** changes are reflected in both Supabase and Convex
- **AND** data remains consistent across both systems

### Requirement: Authentication UI Components

The system SHALL provide accessible, mobile-first authentication forms.

#### Scenario: Form accessibility
- **WHEN** a user navigates an authentication form with keyboard
- **THEN** all fields are reachable via Tab key
- **AND** form submission works via Enter key
- **AND** proper ARIA labels are present

#### Scenario: Form validation feedback
- **WHEN** a user enters invalid data and attempts submission
- **THEN** inline error messages appear
- **AND** the first invalid field receives focus
- **AND** error messages are announced to screen readers

#### Scenario: Loading states
- **WHEN** an authentication request is in progress
- **THEN** form inputs are disabled
- **AND** a loading indicator is displayed
- **AND** the submit button shows loading state

### Requirement: Security Best Practices

The system SHALL implement security best practices for authentication.

#### Scenario: Secure cookie configuration
- **WHEN** a session token is stored
- **THEN** it uses HTTP-only cookies
- **AND** SameSite=Lax is set
- **AND** Secure flag is enabled in production

#### Scenario: Password handling
- **WHEN** passwords are transmitted
- **THEN** they are sent over HTTPS only
- **AND** passwords are never logged or exposed in errors
- **AND** Supabase handles hashing and storage

#### Scenario: CSRF protection
- **WHEN** a form submission occurs
- **THEN** CSRF tokens are validated (via Next.js built-in protection)
- **AND** requests from unauthorized origins are rejected

