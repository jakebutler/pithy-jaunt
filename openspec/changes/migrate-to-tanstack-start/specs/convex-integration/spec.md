## MODIFIED Requirements

### Requirement: Convex Client Provider
The ConvexClientProvider SHALL be integrated with TanStack Start's root layout.

#### Scenario: Convex provider initialization
- **WHEN** the application loads
- **THEN** ConvexClientProvider wraps all routes in the root layout
- **AND** ConvexReactClient is initialized with the deployment URL
- **AND** Convex hooks are available to all client components

#### Scenario: Convex hooks in components
- **WHEN** a client component uses Convex hooks (useQuery, useMutation)
- **THEN** hooks work correctly with TanStack Start's React context
- **AND** real-time updates are received from Convex
- **AND** queries and mutations execute successfully

### Requirement: Convex Server Client
Server-side Convex operations SHALL use ConvexHttpClient in TanStack Start server functions and loaders.

#### Scenario: Convex query in loader
- **WHEN** a route loader needs to fetch data from Convex
- **THEN** the loader uses ConvexHttpClient to execute queries
- **AND** query results are returned to the component via loader data
- **AND** queries are type-safe using generated API types

#### Scenario: Convex mutation in server function
- **WHEN** a server route handler needs to mutate Convex data
- **THEN** the handler uses ConvexHttpClient to execute mutations
- **AND** mutations are type-safe using generated API types
- **AND** mutation results are returned in the API response

#### Scenario: User context in Convex operations
- **WHEN** a server function queries Convex for user-specific data
- **THEN** the function first retrieves the user from Supabase
- **AND** the Convex user record is fetched using Supabase user ID
- **AND** user-specific queries use the Convex user ID

### Requirement: Convex Type Generation
Convex TypeScript types SHALL be generated and used throughout the application.

#### Scenario: Type generation
- **WHEN** Convex schema or functions change
- **THEN** TypeScript types are regenerated in `convex/_generated/`
- **AND** types are imported and used in route loaders and handlers
- **AND** type safety is maintained across the application

#### Scenario: Type-safe Convex operations
- **WHEN** a developer uses Convex API in code
- **THEN** TypeScript validates query/mutation names and parameters
- **AND** return types are inferred from Convex function definitions
- **AND** type errors are caught at compile time

