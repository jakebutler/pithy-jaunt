## MODIFIED Requirements

### Requirement: User Logout

The system SHALL allow authenticated users to terminate their session.

#### Scenario: Successful logout
- **WHEN** an authenticated user initiates logout
- **THEN** the session token is revoked in Supabase
- **AND** all session cookies are cleared
- **AND** the user is redirected to the homepage
- **AND** a success toast message is displayed indicating the user has been signed out

#### Scenario: Logout from all devices
- **WHEN** a user chooses to logout from all devices (future enhancement)
- **THEN** all active sessions are revoked
- **AND** the user must re-authenticate on all devices

