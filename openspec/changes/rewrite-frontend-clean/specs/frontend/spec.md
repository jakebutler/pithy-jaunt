## MODIFIED Requirements

### Requirement: Frontend Application Structure
The frontend application SHALL be rebuilt on Next.js App Router (TypeScript, React Server Components) using Tailwind CSS v4 for styling, and SHALL ensure CSS is properly loaded and applied in both development and production environments.

The application SHALL use Next.js layouts, server/client components, and Tailwind's CSS-based configuration to guarantee reliable SSR/SSG stylesheet injection without manual workarounds.

#### Scenario: CSS loads correctly on initial page load
- **WHEN** a user navigates to any page in the application
- **THEN** all styles are applied immediately (no FOUC)
- **AND** the stylesheet link is present in the HTML document head
- **AND** Tailwind CSS classes render with correct styling

#### Scenario: CSS works in development
- **WHEN** the Next.js dev server is running (`next dev` or `npm run dev`)
- **THEN** CSS changes are hot-reloaded
- **AND** all Tailwind classes apply correctly
- **AND** no console errors related to CSS loading

#### Scenario: CSS works in production
- **WHEN** the application is built and started (`next build && next start`)
- **THEN** all styles are included in the production bundle
- **AND** styles apply correctly on initial page load
- **AND** no unstyled content is visible

### Requirement: Design System Implementation
The frontend SHALL use a consistent design system following the guidelines in `/design`, with defined color palette, typography, spacing, and component patterns.

#### Scenario: Design tokens are available
- **WHEN** components use design system tokens
- **THEN** colors, spacing, and typography are consistent across the application
- **AND** tokens are defined in `src/globals.css` using Tailwind CSS v4's `@theme` directive
- **AND** brand colors are available: chestnut (#932F29), sky-blue (#73C5F3), charcoal (#565555), platinum (#EBEBEB)
- **AND** semantic colors are available: primary (sky-blue), secondary (chestnut), neutral (charcoal), success, warning, error, info

#### Scenario: Typography scale is consistent
- **WHEN** text is rendered in the application
- **THEN** it uses the defined typographic scale (H1: 40px/700, H2: 32px/700, H3: 24px/600, H4: 20px/600, Body: 16px/400, Small: 14px/400, Caption: 12px/400)
- **AND** uses Inter font family for body text and JetBrains Mono for code/logs

#### Scenario: Spacing is consistent
- **WHEN** spacing is applied between elements
- **THEN** it uses the 4px-based spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)

#### Scenario: Components use design system
- **WHEN** UI components are rendered
- **THEN** they use design system colors (chestnut, sky-blue, charcoal, platinum)
- **AND** they follow consistent spacing and typography patterns
- **AND** they support the defined component variants
- **AND** primary actions use Sky Blue (#73C5F3)
- **AND** destructive actions use Chestnut (#932F29)
- **AND** text uses Charcoal (#565555) or its variants

### Requirement: Component Architecture
The frontend SHALL use reusable UI components that follow the design system and work correctly with CSS styling.

#### Scenario: Base components render correctly
- **WHEN** base UI components (Button, Card, Input, Badge, Alert) are used
- **THEN** they render with correct styling
- **AND** they support all defined variants
- **AND** they are accessible (keyboard navigation, screen readers)

#### Scenario: Layout components work correctly
- **WHEN** layout components (Navigation, Layout, Breadcrumb, PageHeader) are used
- **THEN** they render with correct styling
- **AND** they are responsive across device sizes (mobile-first approach)
- **AND** they maintain consistent spacing and typography
- **AND** Navigation uses brand colors (Sky Blue for active states)

### Requirement: Brand Color Usage
The frontend SHALL use brand colors consistently throughout the application following the design guidelines.

#### Scenario: Primary actions use Sky Blue
- **WHEN** a primary action button or link is displayed
- **THEN** it uses Sky Blue (#73C5F3) as the primary color

#### Scenario: Destructive actions use Chestnut
- **WHEN** a destructive action (delete, cancel, error) is displayed
- **THEN** it uses Chestnut (#932F29) as the accent color

#### Scenario: Text uses Charcoal
- **WHEN** text is displayed
- **THEN** it uses Charcoal (#565555) or its variants for text colors

#### Scenario: Backgrounds use Platinum
- **WHEN** a subtle background is needed
- **THEN** it uses Platinum (#EBEBEB) or its variants

### Requirement: Accessibility Compliance
The frontend SHALL meet WCAG 2.1 AA accessibility standards.

#### Scenario: Focus states are visible
- **WHEN** a user navigates with keyboard
- **THEN** all interactive elements show visible focus states with Sky Blue focus rings

#### Scenario: Color contrast meets standards
- **WHEN** text is displayed on backgrounds
- **THEN** color contrast ratios meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)

#### Scenario: Keyboard navigation works
- **WHEN** a user navigates with keyboard only
- **THEN** all interactive elements are accessible
- **AND** tab order is logical

### Requirement: Animations and Transitions
The frontend SHALL provide smooth animations and transitions for better user experience, while respecting user preferences.

#### Scenario: Hover states provide feedback
- **WHEN** a user hovers over interactive elements
- **THEN** smooth transitions provide visual feedback
- **AND** animations respect prefers-reduced-motion preference

#### Scenario: Loading states are animated
- **WHEN** content is loading
- **THEN** loading indicators (spinners, skeletons) are animated smoothly
- **AND** animations respect prefers-reduced-motion preference

