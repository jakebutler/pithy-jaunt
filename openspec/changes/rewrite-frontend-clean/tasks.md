# Tasks: Rewrite Frontend with Clean CSS Foundation

## 1. Investigation & Planning
- [ ] 1.1 Audit current frontend routes/components to capture data requirements
- [ ] 1.2 Document Supabase + Convex integration points used by the frontend
- [ ] 1.3 Define migration plan from TanStack directory structure to Next.js App Router
- [ ] 1.4 Back up current `src/` (for reference) before starting rewrite

## 2. Next.js Foundation Setup
- [ ] 2.1 Scaffold Next.js App Router project (`npx create-next-app@latest --ts --eslint --tailwind`)
- [ ] 2.2 Configure absolute imports/aliases (`@/*`) via `tsconfig.json`
- [ ] 2.3 Enable strict mode, SWC minify, React server actions as needed
- [ ] 2.4 Configure `.env.local` support and load existing environment variables
- [ ] 2.5 Add required dependencies: Supabase client/SSR helpers, Convex client, Sentry SDK, Aceternity UI deps, nuqs
- [ ] 2.6 Set up linting/formatting (ESLint, Prettier) to match project standards

## 3. Tailwind + Design Tokens (Following /design Guidelines)
- [ ] 3.1 Configure Tailwind CSS v4 with `@tailwindcss/vite` (or Next.js plugin) and CSS-based theme
- [ ] 3.2 Implement semantic color tokens in `app/globals.css` using `@theme` directive:
  - Brand colors: chestnut (#932F29), sky-blue (#73C5F3), charcoal (#565555), platinum (#EBEBEB)
  - Semantic colors: primary (sky-blue), secondary (chestnut), neutral (charcoal), success, warning, error, info
  - Color variants (50-900 scale) for each brand color
- [ ] 3.3 Implement typographic scale:
  - Font families: Inter (body), JetBrains Mono (code)
  - H1 40px/700, H2 32px/700, H3 24px/600, H4 20px/600, Body 16px/400, Small 14px/400, Caption 12px/400
- [ ] 3.4 Implement 4px spacing system and export utilities
- [ ] 3.5 Implement border radius (4/8/12/16px) and elevation/shadow tokens
- [ ] 3.6 Add base styles: smooth scroll, focus-visible rings, prefers-reduced-motion overrides
- [ ] 3.7 Validate CSS loads correctly in dev (`next dev`) and prod (`next build && next start`)

## 4. Core Infrastructure & Providers
- [ ] 4.1 Configure Supabase SSR helpers inside Next.js (Server Components + Route Handlers)
- [ ] 4.2 Configure Convex client/provider for client-side realtime data
- [ ] 4.3 Configure Sentry (client + server) via `sentry.client.config.ts` / `sentry.server.config.ts`
- [ ] 4.4 Implement auth context/provider compatible with Next.js App Router
- [ ] 4.5 Port existing API routes (if any) to `/app/api/*` or keep backend endpoints untouched
- [ ] 4.6 Ensure environment variables load correctly during build/deploy

## 5. Base Component Library (Aceternity-inspired)
- [ ] 5.1 Create Button component (Server-friendly, supports `asChild`, RSC compatibility)
- [ ] 5.2 Create Card component (default/elevated/outlined)
- [ ] 5.3 Create Input/Textarea/Select components with labels, help text, error state
- [ ] 5.4 Create Badge component (status variants)
- [ ] 5.5 Create Alert component (dismissible, animated)
- [ ] 5.6 Create Loading primitives (Spinner, Skeleton, Progress)
- [ ] 5.7 Create EmptyState component
- [ ] 5.8 Create Toast system using Next.js client component + portal
- [ ] 5.9 Ensure components use palette tokens, spacing scale, focus states

## 6. Layout & Navigation Components
- [ ] 6.1 Create shared Navigation component:
  - Responsive header with mobile menu
  - Logo/brand mark
  - User menu dropdown
  - Active state indicators (Sky Blue)
  - Uses brand colors
- [ ] 6.2 Create shared Layout component:
  - Wraps all pages
  - Includes navigation
  - Consistent container widths and padding (max-w-7xl, responsive padding)
- [ ] 6.3 Create Breadcrumb component:
  - For detail pages (repo, task)
  - Shows navigation path
  - Clickable segments
  - Uses Charcoal for text, Sky Blue for active
- [ ] 6.4 Create PageHeader component:
  - Title, description, actions
  - Consistent spacing and typography
  - Uses H1/H2 typography scale
- [ ] 6.5 Create App shell layout (App Router `app/(dashboard)/layout.tsx` etc.) for authenticated pages

## 7. Authentication & Marketing Pages
- [ ] 7.1 Landing page (`app/page.tsx`): rebuild hero + sections using new components
- [ ] 7.2 Login (`app/(auth)/login/page.tsx`): integrate Supabase auth, new form components
- [ ] 7.3 Signup (`app/(auth)/signup/page.tsx`): include password strength UI, error states
- [ ] 7.4 Magic link (`app/(auth)/magic-link/page.tsx`)
- [ ] 7.5 Auth layouts: shared split layout, success/error messages
- [ ] 7.6 Validate full auth flow end-to-end on Next.js (server + client)

## 8. Dashboard & Core Application Pages
- [ ] 8.1 Dashboard (`app/(dashboard)/dashboard/page.tsx`): stat cards, repo summary, tasks, quick actions
- [ ] 8.2 Repos list (`app/(dashboard)/repos/page.tsx`): repo grid, connect form, empty states
- [ ] 8.3 Repo detail (`app/(dashboard)/repos/[repoId]/page.tsx`): breadcrumbs, reports, tasks
- [ ] 8.4 Tasks list (`app/(dashboard)/tasks/page.tsx`): task grid w/ filters (nuqs for query params)
- [ ] 8.5 Task detail (`app/(dashboard)/tasks/[taskId]/page.tsx`): workspace status, logs, actions
- [ ] 8.6 Task creation form (if separate route): use new Input/Button components
- [ ] 8.7 Ensure data fetching uses appropriate Next.js patterns (Server Components + client hooks where needed)
- [ ] 8.8 Implement loading/suspense states per route segment

## 9. Feature Components Migration
- [ ] 9.1 Re-implement RepoCard, TaskCard, WorkspaceStatus using new design system
- [ ] 9.2 Update GitIngestReport, CodeRabbitReport components for new layout
- [ ] 9.3 Port TaskLogs with JetBrains Mono styling, dark terminal theme
- [ ] 9.4 Port TaskActions with new Button variants + confirmation flows
- [ ] 9.5 Port RepoConnectForm with improved validation UI
- [ ] 9.6 Ensure all feature components are tree-shakeable and RSC friendly

## 10. Interactions & Feedback
- [ ] 10.1 Add hover states to all interactive elements (200ms transitions, scale/elevation)
- [ ] 10.2 Implement loading states (skeletons, button spinners, Suspense fallbacks)
- [ ] 10.3 Add Toast notifications + inline alerts for success/error
- [ ] 10.4 Add page/segment transition animations respecting prefers-reduced-motion
- [ ] 10.5 Implement micro-interactions (badge pulse, card hover, CTA emphasis)

## 11. Accessibility & Performance
- [ ] 11.1 Ensure focus styles (Sky Blue rings) on all interactive elements
- [ ] 11.2 Audit ARIA labels, roles, and announcements for dynamic content
- [ ] 11.3 Validate color contrast (4.5:1) for all text/background combinations
- [ ] 11.4 Confirm keyboard navigation (tab order, skip links, modals focus trap)
- [ ] 11.5 Test screen readers (VoiceOver/NVDA) on critical flows
- [ ] 11.6 Optimize images (Next/Image with proper sizes, WebP)
- [ ] 11.7 Monitor Core Web Vitals (LCP, CLS, FID) using Next.js analytics/Sentry

## 12. Validation & Launch Readiness
- [ ] 12.1 Run full test pass (`next lint`, `next test` if applicable)
- [ ] 12.2 Manual QA in multiple browsers/devices (Chrome, Safari, Firefox, mobile)
- [ ] 12.3 Capture screenshots for every page/viewport for stakeholder review
- [ ] 12.4 Verify production build (`next build && next start`) works with real env vars
- [ ] 12.5 Verify Supabase + Convex integration in production preview
- [ ] 12.6 Ensure 90%+ component reuse across pages (audit)
- [ ] 12.7 Update documentation (README, onboarding, design system notes)
- [ ] 12.8 Remove legacy TanStack code and dependencies
- [ ] 12.9 Prepare migration guide for engineers (new app structure, patterns)
- [ ] 12.10 Plan deployment (Vercel or existing infra) and cutover strategy

