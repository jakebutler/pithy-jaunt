# Design: Rewrite Frontend with Clean CSS Foundation

## Context

We've encountered persistent CSS injection issues with TanStack Start's SSR. Despite following recommended approaches, styles are not being applied. The HTML contains Tailwind classes but no stylesheet link is injected into the document head.

This is a known issue in the TanStack Start community. Rather than continue debugging framework-level problems, we're rewriting the frontend with a clean foundation on **Next.js App Router** which provides mature SSR/SSG tooling, stable CSS handling, and first-class ecosystem integrations.

## Goals

- **Primary**: Ensure CSS loads and applies correctly in both dev and production
- **Secondary**: Implement complete design system following `/design` guidelines:
  - "Warm Minimalism with Purposeful Color" aesthetic
  - Brand color palette (Chestnut, Sky Blue, Charcoal, Platinum)
  - All 34 global UI changes from design analysis
  - Aceternity UI component patterns with customizations
- **Tertiary**: Maintain all existing functionality while improving UI/UX
- **Accessibility**: Achieve WCAG 2.1 AA compliance

## Non-Goals

- Changing backend APIs or data layer
- Modifying authentication or business logic
- Adding new features (focus on UI rewrite only)

## Decisions

### Decision 1: Rebuild Frontend on Next.js App Router
**Rationale**: Next.js is a mature framework with battle-tested SSR, routing, and CSS tooling. It integrates seamlessly with Supabase, Convex, Sentry, and Vercel (if desired). App Router aligns with React Server Components which fits our data-heavy dashboard.

**Alternatives Considered**:
- Stay on TanStack Start: blocked by CSS issues, limited ecosystem
- Remix: solid option but less adoption internally and requires more manual configuration
- Pure Vite SPA: would lose SSR/SEO benefits

### Decision 2: Use Tailwind CSS v4 with Next.js
**Rationale**: Tailwind v4's CSS-first config works well within Next.js. We can import via `@tailwindcss/vite` or the upcoming official Next.js integration while keeping design tokens in CSS.

**Approach**:
- Use `@import 'tailwindcss'` in `globals.css`
- Define design tokens in `@theme` directive following `/design` guidelines:
  - Brand colors: chestnut (#932F29), sky-blue (#73C5F3), charcoal (#565555), platinum (#EBEBEB)
  - Semantic colors: primary (sky-blue), secondary (chestnut), neutral (charcoal)
  - Typographic scale: H1 (40px), H2 (32px), H3 (24px), H4 (20px), Body (16px)
  - Spacing system: 4px base unit (4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px)
  - Border radius: 4px, 8px, 12px, 16px
  - Elevation/shadow system
- Ensure Vite processes CSS correctly for SSR

### Decision 3: Use App Router Layouts for Shared UI
**Rationale**: Next.js App Router layouts give us nested layouts and server components, perfect for shared navigation, layout wrappers, and page shells.

**Approach**:
- `app/layout.tsx` for global providers + global CSS import
- Nested layouts under `(auth)` and `(dashboard)` segments for auth vs. main app experiences
- Use Server Components for read-heavy UI (dashboard, repos) and Client Components only where interactivity/state is needed

### Decision 4: Follow Design Guidelines from /design Folder
**Rationale**: We have comprehensive design guidelines that define our aesthetic, color palette, typography, spacing, and component patterns. We must follow these to ensure consistency.

**Approach**:
- Use brand colors: Sky Blue (#73C5F3) for primary actions, Chestnut (#932F29) for destructive, Charcoal (#565555) for text, Platinum (#EBEBEB) for backgrounds
- Follow "Warm Minimalism with Purposeful Color" aesthetic
- Implement all 34 global UI changes from design analysis
- Use Aceternity UI as inspiration but customize with our brand colors
- Follow typographic scale and spacing system from design guidelines

### Decision 5: Verify CSS + Data Integrations Early
**Rationale**: Before porting complex pages we must ensure base CSS and data providers (Supabase/Convex) work in Next.js.

**Approach**:
- Create minimal page using Tailwind tokens
- Implement Supabase SSR helper and test authenticated fetch
- Wire Convex client on client components
- Only proceed once foundation is stable

## Risks / Trade-offs

### Risk 1: CSS Still Doesn't Work
**Mitigation**: 
- Research TanStack Start community solutions more thoroughly
- Consider using a community template as starting point
- Have fallback plan to use client-side CSS injection if needed

### Risk 2: Breaking Existing Functionality
**Mitigation**:
- Migrate one page at a time
- Test each migration step
- Keep old code until new code is verified working

### Risk 3: Time Investment
**Mitigation**:
- Focus on getting CSS working first (highest priority)
- Reuse existing component logic, only change styling
- Use design system components we've already built

## Migration Plan

### Phase 1: Foundation (Day 1)
1. Create clean CSS setup
2. Verify CSS loads correctly
3. Test with minimal page

### Phase 2: Design System (Day 1-2)
1. Implement design tokens
2. Create base components
3. Test components render correctly

### Phase 3: Page Migration (Day 2-3)
1. Migrate authentication pages
2. Migrate dashboard and core pages
3. Test each page thoroughly

### Phase 4: Validation (Day 3)
1. Full browser testing
2. Screenshot verification
3. Production build testing

## Open Questions

- Should we use a community template as starting point?
- Do we need to modify Vite configuration for CSS processing?
- Should we implement CSS-in-JS as fallback if Tailwind doesn't work?

