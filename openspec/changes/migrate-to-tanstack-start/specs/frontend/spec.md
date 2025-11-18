## ADDED Requirements

### Requirement: TanStack Router File-Based Routing
The frontend SHALL use TanStack Router for type-safe, file-based routing with automatic code generation.

#### Scenario: Route definition
- **WHEN** a developer creates a route file in the `routes/` directory
- **THEN** TanStack Router automatically generates type-safe route definitions
- **AND** the route is accessible via its file path structure

#### Scenario: Type-safe navigation
- **WHEN** a component uses the Link component from `@tanstack/react-router`
- **THEN** TypeScript validates the route path at compile time
- **AND** navigation is type-safe with autocomplete support

#### Scenario: Dynamic route parameters
- **WHEN** a route file uses `$param` syntax (e.g., `routes/repos.$repoId.tsx`)
- **THEN** route parameters are accessible via `Route.useParams()` hook
- **AND** parameters are type-safe based on route definition

### Requirement: TanStack Start Root Layout
The application SHALL have a root layout component that wraps all routes and provides global providers.

#### Scenario: Root layout initialization
- **WHEN** the application loads
- **THEN** the root layout (`routes/__root.tsx`) initializes
- **AND** ConvexClientProvider and AuthProvider are available to all child routes

#### Scenario: Global styles
- **WHEN** the root layout loads
- **THEN** global CSS styles from `app/globals.css` are applied
- **AND** Tailwind CSS is configured and working

### Requirement: Page Route Components
All page routes SHALL use TanStack Router's loader pattern for data fetching.

#### Scenario: Page with data loading
- **WHEN** a user navigates to a page route
- **THEN** the route's loader function executes on the server
- **AND** data is fetched before the component renders
- **AND** the component accesses data via `Route.useLoaderData()` hook

#### Scenario: Protected page access
- **WHEN** a user navigates to a protected route without authentication
- **THEN** the middleware redirects to the login page
- **AND** the return URL is preserved for post-login redirect

### Requirement: Link Component Usage
All internal navigation SHALL use TanStack Router's Link component instead of Next.js Link.

#### Scenario: Internal link navigation
- **WHEN** a component renders a Link to an internal route
- **THEN** the Link uses `to` prop instead of `href`
- **AND** navigation is client-side with type safety
- **AND** the Link component is imported from `@tanstack/react-router`

### Requirement: Image Optimization
The application SHALL use `@unpic/react` Image component for optimized image rendering.

#### Scenario: Image rendering
- **WHEN** a component renders an image
- **THEN** the Image component from `@unpic/react` is used
- **AND** width and height props are numbers (not strings)
- **AND** images are optimized for performance

