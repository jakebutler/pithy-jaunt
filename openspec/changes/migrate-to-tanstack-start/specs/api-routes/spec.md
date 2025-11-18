## ADDED Requirements

### Requirement: TanStack Server Routes
All API endpoints SHALL be implemented as TanStack Server Routes with type-safe request/response handling.

#### Scenario: Server route definition
- **WHEN** an API endpoint is created
- **THEN** it uses `createFileRoute()` with server handlers
- **AND** handlers are defined in the `server.handlers` object
- **AND** the route file is located in `routes/api/` directory

#### Scenario: HTTP method handling
- **WHEN** a server route receives a request
- **THEN** the appropriate handler (GET, POST, PUT, DELETE) is executed
- **AND** the handler receives request context with typed parameters
- **AND** responses use standard `Response.json()` instead of Next.js `NextResponse`

#### Scenario: Dynamic route parameters
- **WHEN** an API route uses dynamic parameters (e.g., `routes/api/task.$taskId.ts`)
- **THEN** parameters are accessible via `Route.useParams()` in handlers
- **AND** parameters are type-safe based on route file name

#### Scenario: Request body parsing
- **WHEN** a POST/PUT request is received
- **THEN** the request body is parsed from the request object
- **AND** body parsing uses standard `request.json()` method
- **AND** validation is performed before processing

#### Scenario: Error handling
- **WHEN** an error occurs in a server route handler
- **THEN** an appropriate HTTP error response is returned
- **AND** error responses use standard `Response.json()` with status codes
- **AND** errors are logged for debugging

### Requirement: Authentication in Server Routes
Protected API routes SHALL verify authentication using Supabase Auth before processing requests.

#### Scenario: Authenticated request
- **WHEN** a protected API route receives a request
- **THEN** the handler verifies the user's session using Supabase
- **AND** if authenticated, the request is processed
- **AND** if not authenticated, a 401 Unauthorized response is returned

#### Scenario: User context in handlers
- **WHEN** a server route handler needs user information
- **THEN** the handler retrieves the user from Supabase session
- **AND** the user is used to query Convex for user data
- **AND** user-specific operations are performed with proper authorization

### Requirement: API Route Structure
API routes SHALL follow TanStack Router file-based routing conventions.

#### Scenario: Flat route structure
- **WHEN** an API route is created
- **THEN** nested paths use dot notation (e.g., `routes/api/task.$taskId.execute.ts`)
- **AND** route files are organized logically in the `routes/api/` directory
- **AND** route paths match the file structure

#### Scenario: Route path mapping
- **WHEN** a route file is `routes/api/task.$taskId.ts`
- **THEN** the route path is `/api/task/:taskId`
- **AND** the taskId parameter is accessible in handlers

