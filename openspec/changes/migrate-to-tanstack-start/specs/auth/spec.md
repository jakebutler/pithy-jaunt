## MODIFIED Requirements

### Requirement: Authentication Middleware
The authentication middleware SHALL use TanStack Start middleware pattern instead of Next.js middleware.

#### Scenario: Middleware execution
- **WHEN** a request is made to any route
- **THEN** TanStack Start middleware executes before route handlers
- **AND** Supabase session is verified using server-side client
- **AND** protected routes redirect unauthenticated users to login

#### Scenario: Protected route access
- **WHEN** an unauthenticated user accesses a protected route
- **THEN** the middleware redirects to `/login`
- **AND** the original URL is preserved in `returnTo` query parameter
- **AND** after login, the user is redirected to the original URL

#### Scenario: Authenticated user on auth pages
- **WHEN** an authenticated user accesses login/signup pages
- **THEN** the middleware redirects to `/dashboard`
- **AND** the user cannot access auth pages while logged in

### Requirement: Supabase Auth Integration
Supabase Auth SHALL be integrated with TanStack Start using server-side cookie handling.

#### Scenario: Session management
- **WHEN** a user logs in
- **THEN** Supabase creates a session and stores it in HTTP-only cookies
- **AND** cookies are accessible in TanStack Start middleware and server functions
- **AND** session is verified on each request

#### Scenario: Cookie handling
- **WHEN** Supabase session is created or refreshed
- **THEN** cookies are set using TanStack Start's cookie API
- **AND** cookies are HTTP-only, Secure, and SameSite=Lax
- **AND** cookies work across server functions and middleware

### Requirement: Auth Context Provider
The AuthProvider SHALL work with TanStack Start's React context system.

#### Scenario: Auth context availability
- **WHEN** the application loads
- **THEN** AuthProvider is mounted in the root layout
- **AND** auth context is available to all client components
- **AND** auth state updates trigger re-renders correctly

#### Scenario: Session restoration
- **WHEN** the application loads
- **THEN** AuthProvider checks for existing session
- **AND** if session exists, user state is restored
- **AND** if no session, user state is null

