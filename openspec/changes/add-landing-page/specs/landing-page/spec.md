# Landing Page Specification

## ADDED Requirements

### Requirement: Marketing Landing Page Display

The system SHALL display a marketing-focused landing page when unauthenticated users visit the root route.

#### Scenario: Landing page for unauthenticated users
- **WHEN** an unauthenticated user navigates to the root route (/)
- **THEN** the system displays a marketing landing page
- **AND** the page includes:
  - A hero section with the Pithy Jaunt brand image
  - Compelling marketing copy highlighting value propositions
  - Primary call-to-action buttons for "Sign Up" and "Sign In"
- **AND** the page is optimized for mobile-first responsive design

#### Scenario: Redirect authenticated users
- **WHEN** an authenticated user navigates to the root route (/)
- **THEN** the route's loader function checks authentication using server-side Supabase client
- **AND** the system redirects the user to the dashboard using TanStack Router's `redirect()`
- **AND** the landing page is not displayed

#### Scenario: Hero image display
- **WHEN** the landing page is displayed
- **THEN** the system shows an optimized hero image (pithy-jaunt.png)
- **AND** the image file size is optimized for web performance (< 200KB recommended)
- **AND** the image is properly formatted (WebP preferred, PNG fallback acceptable)
- **AND** the image includes appropriate alt text for accessibility

#### Scenario: Value proposition messaging
- **WHEN** the landing page is displayed
- **THEN** the system presents clear value propositions:
  - Capture ideas on-the-go (mobile-first workflow)
  - Let Pithy Jaunt build it for you (automated PR generation)
  - Continue getting inspiration while Pithy Jaunt does the hard work (asynchronous execution)
- **AND** the messaging is concise and compelling

#### Scenario: Call-to-action buttons
- **WHEN** the landing page is displayed
- **THEN** the system provides primary CTAs using TanStack Router `Link` components:
  - "Sign Up" button that navigates to /signup using `to="/signup"`
  - "Sign In" button that navigates to /login using `to="/login"`
- **AND** the buttons are prominently displayed and easily accessible
- **AND** the buttons are keyboard navigable and screen reader accessible
- **AND** navigation is type-safe and client-side

#### Scenario: Responsive design
- **WHEN** the landing page is displayed on different viewport sizes
- **THEN** the layout adapts appropriately for mobile, tablet, and desktop
- **AND** all content remains readable and accessible
- **AND** CTAs remain easily accessible on all screen sizes
- **AND** the hero image scales appropriately without distortion

#### Scenario: Loading state handling
- **WHEN** the system is checking authentication status in the route loader
- **THEN** TanStack Start handles the server-side authentication check before rendering
- **AND** prevents flash of incorrect content (landing page for authenticated users)
- **AND** redirects happen server-side before any content is sent to the client

