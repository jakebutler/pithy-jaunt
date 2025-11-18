# Change: Rewrite Frontend with Clean CSS Foundation

## Why

We've spent significant time debugging CSS injection issues with TanStack Start's SSR. Despite multiple attempts using recommended approaches (`?url` imports, direct imports, manual injection), styles are not being applied. The HTML contains Tailwind classes but no stylesheet link is injected, indicating a fundamental issue with how TanStack Start handles CSS during SSR.

At this stage TanStack Start is still a young framework. We originally adopted it for a hackathon, but the tooling instability (CSS injection issues, missing build artifacts, limited ecosystem) is now blocking us. Instead of investing more time chasing framework-level bugs, we will rebuild the frontend on **Next.js (App Router, TypeScript, Tailwind)**—a mature, production-proven stack that gives us excellent SSR/SSG support, built-in routing, and strong ecosystem integrations (Supabase, Convex, Sentry, etc.).

Additionally, our current UI is dated and inconsistent. Following the design guidelines in `/design`, we need to implement a modern, cohesive design system that:
- Uses our brand color palette (Chestnut #932F29, Sky Blue #73C5F3, Charcoal #565555, Platinum #EBEBEB)
- Follows the "Warm Minimalism with Purposeful Color" aesthetic
- Implements all 34 global UI changes identified in the design analysis
- Integrates Aceternity UI components with our customizations
- Ensures WCAG 2.1 AA accessibility compliance

## What Changes

**BREAKING**: Complete rewrite of the frontend application using Next.js

- **New Foundation**: Scaffold a Next.js App Router project (TypeScript, Turbopack/Vite dev server, ESLint) with absolute imports and strict mode enabled
- **CSS Architecture**: Use Tailwind CSS v4 with `@tailwindcss/vite` plugin (or official Next.js Tailwind pipeline once GA) driven by CSS-based config, ensuring rock-solid SSR/SSG stylesheet injection
- **Design System**: Implement complete design token system following `/design` guidelines:
  - Semantic color tokens from palette (chestnut, sky-blue, charcoal, platinum)
  - Typographic scale (H1: 40px, H2: 32px, H3: 24px, H4: 20px, Body: 16px)
  - 4px base unit spacing system
  - Border radius system (4px, 8px, 12px, 16px)
  - Elevation/shadow system
- **Component Library**: Build base components following Aceternity UI patterns (ported to Next.js / React Server Components where appropriate):
  - Button (primary, secondary, outline, ghost, danger variants)
  - Card (default, elevated, outlined variants)
  - Input (text, textarea, select with proper states)
  - Badge (status variants with semantic colors)
  - Alert (success, error, warning, info)
  - Loading (spinner, skeleton, progress)
  - EmptyState (consistent empty state pattern)
- **Layout System**: Shared navigation, layout wrapper, breadcrumbs, page headers implemented as React Server Components for maximum performance
- **Brand Integration**: All components use brand colors (Sky Blue for primary, Chestnut for destructive, Charcoal for text, Platinum for backgrounds)
- **Application Features**: Rebuild every page (landing, auth, dashboard, repos, tasks, detail views) in Next.js using server/data fetching patterns compatible with Supabase + Convex
- **Clean Migration Path**: Keep backend APIs and data layer unchanged; only frontend presentation layer changes. Preserve existing routes/URLs via Next.js file-based routing.

## Impact

- **Affected specs**: `specs/frontend/spec.md` (complete rewrite)
- **Affected code**: 
  - All route components (`src/routes/*`)
  - All UI components (`src/components/ui/*`)
  - CSS configuration (`src/globals.css`)
  - Root layout (`src/routes/__root.tsx`)
  - Client entry (`src/client.tsx`)
- **Breaking changes**: 
  - Component APIs may change (internal implementation)
  - CSS class names will change to use new design system
  - No API changes - backend remains compatible

## Approach

Following the design guidelines in `/design` and the phased approach from the design analysis:

1. **Phase 1: Foundation** - Scaffold Next.js app, configure base tooling, set up Tailwind v4 design tokens (Changes 1-5, 17 from design analysis)
2. **Phase 2: Base Components** - Create shared component library with Aceternity patterns (Changes 6-12 from design analysis)
3. **Phase 3: Layout & Navigation** - Implement shared layout, navigation, breadcrumbs, headers (Changes 13-16, 18-20)
4. **Phase 4: Feature Pages** - Rebuild landing, auth, dashboard, repos, tasks pages with new components (Changes 21-25)
5. **Phase 5: Interactions & Feedback** - Add animations, loading states, feedback loops (Changes 26-29)
6. **Phase 6: Accessibility** - WCAG 2.1 AA compliance (Changes 30-33)
7. **Phase 7: Validation & Launch** - Testing, screenshots, production deploy readiness

## Success Criteria

- ✅ All styles apply correctly on initial page load (no FOUC)
- ✅ Tailwind CSS classes work in both dev and production
- ✅ All existing functionality preserved
- ✅ Design system components integrated following `/design` guidelines
- ✅ Brand colors used consistently (Sky Blue, Chestnut, Charcoal, Platinum)
- ✅ 90%+ component reuse across pages
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ Mobile-responsive design (mobile-first approach)
- ✅ Smooth animations and transitions (respecting prefers-reduced-motion)
- ✅ No CSS injection workarounds needed

