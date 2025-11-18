# Implementation Tasks

## Phase 1: Infrastructure Setup

### 1.1 Dependencies & Configuration
- [ ] 1.1.1 Uninstall Next.js dependencies: `npm uninstall next @tailwindcss/postcss`
- [ ] 1.1.2 Install TanStack Start dependencies: `npm install @tanstack/react-router @tanstack/react-start`
- [ ] 1.1.3 Install Vite and plugins: `npm install -D vite @vitejs/plugin-react @tailwindcss/vite vite-tsconfig-paths`
- [ ] 1.1.4 Install Unpic for images: `npm install @unpic/react`
- [ ] 1.1.5 Remove `next.config.ts`
- [ ] 1.1.6 Remove `postcss.config.mjs` (using Tailwind Vite plugin instead)
- [ ] 1.1.7 Create `vite.config.ts` with TanStack Start plugin, Tailwind, and path resolution
- [ ] 1.1.8 Update `package.json` scripts: `dev`, `build`, `start`
- [ ] 1.1.9 Update `tsconfig.json` for Vite/ESM (remove Next.js-specific config)
- [ ] 1.1.10 Update `tsconfig.json` paths if needed for `@/*` imports

### 1.2 Basic Routing Structure
- [ ] 1.2.1 Create `routes/` directory
- [ ] 1.2.2 Create `routes/__root.tsx` with root layout (migrate from `app/layout.tsx`)
- [ ] 1.2.3 Move ConvexClientProvider and AuthProvider to root layout
- [ ] 1.2.4 Create `routes/index.tsx` (migrate from `app/page.tsx`)
- [ ] 1.2.5 Update imports: replace `next/link` with `@tanstack/react-router` Link
- [ ] 1.2.6 Test basic routing: home page loads correctly

### 1.3 Build & Dev Server
- [ ] 1.3.1 Test `npm run dev` starts Vite dev server
- [ ] 1.3.2 Verify HMR works
- [ ] 1.3.3 Test `npm run build` creates output in `.output/`
- [ ] 1.3.4 Verify build output structure

## Phase 2: API Routes Migration

### 2.1 Auth API Routes
- [ ] 2.1.1 Create `routes/api/auth/login.ts` (migrate from `app/api/auth/login/route.ts`)
- [ ] 2.1.2 Create `routes/api/auth/signup.ts` (migrate from `app/api/auth/signup/route.ts`)
- [ ] 2.1.3 Create `routes/api/auth/logout.ts` (migrate from `app/api/auth/logout/route.ts`)
- [ ] 2.1.4 Create `routes/api/auth/magic-link.ts` (migrate from `app/api/auth/magic-link/route.ts`)
- [ ] 2.1.5 Create `routes/api/auth/session.ts` (migrate from `app/api/auth/session/route.ts`)
- [ ] 2.1.6 Test all auth API routes work (use curl/Postman)

### 2.2 Task API Routes
- [ ] 2.2.1 Create `routes/api/task.ts` (migrate from `app/api/task/route.ts`)
- [ ] 2.2.2 Create `routes/api/task.$taskId.ts` (migrate from `app/api/task/[taskId]/route.ts`)
- [ ] 2.2.3 Create `routes/api/task.$taskId.execute.ts` (migrate from `app/api/task/[taskId]/execute/route.ts`)
- [ ] 2.2.4 Create `routes/api/task.$taskId.approve.ts` (migrate from `app/api/task/[taskId]/approve/route.ts`)
- [ ] 2.2.5 Create `routes/api/task.$taskId.cancel.ts` (migrate from `app/api/task/[taskId]/cancel/route.ts`)
- [ ] 2.2.6 Create `routes/api/task.$taskId.logs.ts` (migrate from `app/api/task/[taskId]/logs/route.ts`)
- [ ] 2.2.7 Create `routes/api/task.$taskId.sync-status.ts` (migrate from `app/api/task/[taskId]/sync-status/route.ts`)
- [ ] 2.2.8 Test all task API routes work

### 2.3 Repo API Routes
- [ ] 2.3.1 Create `routes/api/repo.ts` (migrate from `app/api/repo/route.ts`)
- [ ] 2.3.2 Create `routes/api/repo.connect.ts` (migrate from `app/api/repo/connect/route.ts`)
- [ ] 2.3.3 Create `routes/api/repo.gitingest-callback.ts` (migrate from `app/api/repo/gitingest-callback/route.ts`)
- [ ] 2.3.4 Create `routes/api/repo.$repoId.ts` (migrate from `app/api/repo/[repoId]/route.ts`)
- [ ] 2.3.5 Create `routes/api/repo.$repoId.report.ts` (migrate from `app/api/repo/[repoId]/report/route.ts`)
- [ ] 2.3.6 Create `routes/api/repo.$repoId.gitingest-report.ts` (migrate from `app/api/repo/[repoId]/gitingest-report/route.ts`)
- [ ] 2.3.7 Test all repo API routes work

### 2.4 Webhook Routes
- [ ] 2.4.1 Create `routes/api/webhook.github.ts` (migrate from `app/api/webhook/github/route.ts`)
- [ ] 2.4.2 Create `routes/api/webhook.coderabbit.ts` (migrate from `app/api/webhook/coderabbit/route.ts`)
- [ ] 2.4.3 Create `routes/api/webhook.daytona.ts` (migrate from `app/api/webhook/daytona/route.ts`)
- [ ] 2.4.4 Test all webhook routes work

### 2.5 Workspace API Routes
- [ ] 2.5.1 Create `routes/api/workspace.ts` (migrate from `app/api/workspace/route.ts`)
- [ ] 2.5.2 Create `routes/api/workspace.$workspaceId.ts` (migrate from `app/api/workspace/[workspaceId]/route.ts`)
- [ ] 2.5.3 Test workspace API routes work

### 2.6 Admin & Debug Routes
- [ ] 2.6.1 Create `routes/api/admin.cancel-task.$taskId.ts` (migrate from `app/api/admin/cancel-task/[taskId]/route.ts`)
- [ ] 2.6.2 Create `routes/api/admin.reset-db.ts` (migrate from `app/api/admin/reset-db/route.ts`)
- [ ] 2.6.3 Create `routes/api/debug.convex-info.ts` (migrate from `app/api/debug/convex-info/route.ts`)
- [ ] 2.6.4 Create `routes/api/debug.delete-all-tasks.ts` (migrate from `app/api/debug/delete-all-tasks/route.ts`)
- [ ] 2.6.5 Create `routes/api/debug.task.$taskId.ts` (migrate from `app/api/debug/task/[taskId]/route.ts`)
- [ ] 2.6.6 Create `routes/api/debug.verify-gitingest-function.ts` (migrate from `app/api/debug/verify-gitingest-function/route.ts`)
- [ ] 2.6.7 Create `routes/api/debug.webhook-test.ts` (migrate from `app/api/debug/webhook-test/route.ts`)
- [ ] 2.6.8 Test admin/debug routes work

### 2.7 Maintenance & Cron Routes
- [ ] 2.7.1 Create `routes/api/maintenance.workspaces.cleanup.ts` (migrate from `app/api/maintenance/workspaces/cleanup/route.ts`)
- [ ] 2.7.2 Create `routes/api/cron.workspace-cleanup.ts` (migrate from `app/api/cron/workspace-cleanup/route.ts`)
- [ ] 2.7.3 Test maintenance/cron routes work

## Phase 3: Auth Pages & Middleware

### 3.1 Auth Middleware
- [ ] 3.1.1 Create TanStack Start middleware (migrate from `middleware.ts`)
- [ ] 3.1.2 Adapt Supabase cookie handling for TanStack Start
- [ ] 3.1.3 Test protected route redirection works
- [ ] 3.1.4 Test auth route redirection (logged in users redirected from login)

### 3.2 Auth Pages
- [ ] 3.2.1 Create `routes/login.tsx` (migrate from `app/(auth)/login/page.tsx`)
- [ ] 3.2.2 Create `routes/signup.tsx` (migrate from `app/(auth)/signup/page.tsx`)
- [ ] 3.2.3 Create `routes/magic-link.tsx` (migrate from `app/(auth)/magic-link/page.tsx`)
- [ ] 3.2.4 Create `routes/auth.callback.tsx` (migrate from `app/auth/callback/route.ts`)
- [ ] 3.2.5 Update all Link components to use `@tanstack/react-router`
- [ ] 3.2.6 Test login flow end-to-end
- [ ] 3.2.7 Test signup flow end-to-end
- [ ] 3.2.8 Test magic link flow end-to-end

### 3.3 Auth Components
- [ ] 3.3.1 Update `components/auth/AuthButton.tsx` - replace Next.js Link
- [ ] 3.3.2 Update `components/auth/ProtectedRoute.tsx` - adapt for TanStack Router
- [ ] 3.3.3 Test auth components work in new routing

## Phase 4: Protected Pages

### 4.1 Dashboard Page
- [ ] 4.1.1 Create `routes/dashboard.tsx` (migrate from `app/dashboard/page.tsx`)
- [ ] 4.1.2 Convert Server Component to loader + component pattern
- [ ] 4.1.3 Update Convex queries to use loader
- [ ] 4.1.4 Update all Link components
- [ ] 4.1.5 Test dashboard loads and displays data correctly

### 4.2 Repos Pages
- [ ] 4.2.1 Create `routes/repos.tsx` (migrate from `app/repos/page.tsx`)
- [ ] 4.2.2 Create `routes/repos.$repoId.tsx` (migrate from `app/repos/[repoId]/page.tsx`)
- [ ] 4.2.3 Convert Server Components to loader + component pattern
- [ ] 4.2.4 Update Convex queries to use loaders
- [ ] 4.2.5 Update all Link components
- [ ] 4.2.6 Test repos list page
- [ ] 4.2.7 Test repo detail page

### 4.3 Tasks Pages
- [ ] 4.3.1 Create `routes/tasks.tsx` (migrate from `app/tasks/page.tsx`)
- [ ] 4.3.2 Create `routes/tasks.$taskId.tsx` (migrate from `app/tasks/[taskId]/page.tsx`)
- [ ] 4.3.3 Convert Server Components to loader + component pattern
- [ ] 4.3.4 Update Convex queries to use loaders
- [ ] 4.3.5 Update all Link components
- [ ] 4.3.6 Test tasks list page
- [ ] 4.3.7 Test task detail page

### 4.4 Component Updates
- [ ] 4.4.1 Update `components/repos/RepoCard.tsx` - replace Next.js Link
- [ ] 4.4.2 Update `components/repos/RepoConnectForm.tsx` - check for Next.js dependencies
- [ ] 4.4.3 Update `components/tasks/TaskCard.tsx` - replace Next.js Link
- [ ] 4.4.4 Update `components/tasks/TaskCreateForm.tsx` - check for Next.js dependencies
- [ ] 4.4.5 Update `components/tasks/TaskActions.tsx` - check for Next.js dependencies
- [ ] 4.4.6 Update `components/tasks/TaskLogs.tsx` - check for Next.js dependencies
- [ ] 4.4.7 Update `components/ui/ExternalLink.tsx` - check for Next.js dependencies
- [ ] 4.4.8 Test all components work correctly

## Phase 5: Images & Assets

### 5.1 Image Migration
- [ ] 5.1.1 Search codebase for `next/image` imports
- [ ] 5.1.2 Replace with `@unpic/react` Image component
- [ ] 5.1.3 Update image props (width/height as numbers, not strings)
- [ ] 5.1.4 Test images load correctly

### 5.2 Static Assets
- [ ] 5.2.1 Verify `public/` folder structure works with TanStack Start
- [ ] 5.2.2 Test static assets (favicon, images) load correctly
- [ ] 5.2.3 Update any hardcoded asset paths if needed

## Phase 6: Testing & Validation

### 6.1 Manual Testing
- [ ] 6.1.1 Test all auth flows (login, signup, magic link, logout)
- [ ] 6.1.2 Test all protected routes (dashboard, repos, tasks)
- [ ] 6.1.3 Test all API routes (use Postman/curl)
- [ ] 6.1.4 Test webhook endpoints
- [ ] 6.1.5 Test Convex integration (queries, mutations)
- [ ] 6.1.6 Test Supabase Auth integration
- [ ] 6.1.7 Test navigation between pages
- [ ] 6.1.8 Test form submissions
- [ ] 6.1.9 Test error handling

### 6.2 E2E Test Updates
- [ ] 6.2.1 Update Playwright tests for new routing structure
- [ ] 6.2.2 Update test selectors if route structure changed
- [ ] 6.2.3 Run E2E test suite: `npm run test:e2e`
- [ ] 6.2.4 Fix any failing tests

### 6.3 Unit Test Updates
- [ ] 6.3.1 Update unit tests for new imports/routing
- [ ] 6.3.2 Run unit test suite: `npm run test`
- [ ] 6.3.3 Fix any failing tests

## Phase 7: Deployment

### 7.1 Vercel Configuration
- [ ] 7.1.1 Update `vercel.json` for TanStack Start build output
- [ ] 7.1.2 Configure build command: `npm run build`
- [ ] 7.1.3 Configure output directory: `.output/public`
- [ ] 7.1.4 Configure rewrites for server routes
- [ ] 7.1.5 Test build locally matches Vercel expectations

### 7.2 Environment Variables
- [ ] 7.2.1 Verify all environment variables work in TanStack Start
- [ ] 7.2.2 Check Vercel environment variables are set correctly
- [ ] 7.2.3 Test environment variable access in server functions

### 7.3 Production Deployment
- [ ] 7.3.1 Deploy to Vercel preview environment
- [ ] 7.3.2 Smoke test preview deployment
- [ ] 7.3.3 Test critical user flows in preview
- [ ] 7.3.4 Deploy to production
- [ ] 7.3.5 Smoke test production deployment
- [ ] 7.3.6 Monitor for errors

## Phase 8: Cleanup

### 8.1 Remove Next.js Code
- [ ] 8.1.1 Remove `app/` directory (all pages migrated)
- [ ] 8.1.2 Remove `next-env.d.ts`
- [ ] 8.1.3 Remove any remaining Next.js-specific code
- [ ] 8.1.4 Clean up unused dependencies

### 8.2 Documentation
- [ ] 8.2.1 Update README with new dev commands
- [ ] 8.2.2 Update deployment docs if needed
- [ ] 8.2.3 Document any TanStack Start-specific patterns used

### 8.3 Final Validation
- [ ] 8.3.1 Run full test suite
- [ ] 8.3.2 Verify no TypeScript errors
- [ ] 8.3.3 Verify no linting errors
- [ ] 8.3.4 Verify build succeeds
- [ ] 8.3.5 Verify production deployment works

