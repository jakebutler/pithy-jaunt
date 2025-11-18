# TanStack Start Migration Design

## Context

Pithy Jaunt is migrating from Next.js 15 App Router to TanStack Start for the hackathon. This is a comprehensive frontend framework migration that requires careful planning to maintain all existing functionality while modernizing the architecture.

**Constraints:**
- Hackathon timeline: Must be completed quickly and safely
- Must maintain all existing features (auth, Convex integration, API routes)
- Must preserve existing UI/UX
- Must work with existing Vercel deployment
- Must maintain compatibility with Convex and Supabase integrations

**Stakeholders:**
- Frontend developers
- Backend (Convex) - no changes required
- Deployment (Vercel) - configuration updates needed

## Goals / Non-Goals

**Goals:**
- Successfully migrate all pages from Next.js App Router to TanStack Router
- Convert all API routes to TanStack Server Routes
- Maintain Supabase Auth integration and middleware protection
- Maintain Convex client/server integration
- Preserve all existing functionality and UI
- Update build configuration for Vite
- Ensure Vercel deployment continues to work
- Complete migration in phases to minimize risk

**Non-Goals:**
- Rewriting business logic or data models
- Changing UI/UX design
- Migrating backend services (Convex, Supabase remain unchanged)
- Optimizing performance beyond what TanStack Start provides by default
- Adding new features during migration (focus on parity first)

## Decisions

### Decision 1: Phased Migration Strategy

**What:** Migrate in phases: infrastructure → API routes → pages → polish

**Why:**
- Reduces risk by validating each phase before proceeding
- Allows for incremental testing and validation
- Enables rollback at any phase if issues arise
- Hackathon timeline requires safe, fast progress

**Phases:**
1. **Phase 1: Infrastructure** - Setup Vite, TanStack Start, basic routing
2. **Phase 2: API Routes** - Convert all API routes to Server Routes
3. **Phase 3: Auth Pages** - Migrate login, signup, magic-link pages
4. **Phase 4: Protected Pages** - Migrate dashboard, repos, tasks pages
5. **Phase 5: Polish** - Fix edge cases, update tests, optimize

**Alternatives considered:**
- Big bang migration: Too risky for hackathon timeline
- Feature-by-feature: Too slow, would require maintaining two frameworks

### Decision 2: TanStack Router File-Based Routing

**What:** Use TanStack Router's file-based routing convention with `routes/` directory

**Why:**
- Familiar pattern for Next.js developers
- Type-safe routing with automatic code generation
- Better code splitting than Next.js
- Excellent TypeScript support

**Structure:**
```
routes/
├── __root.tsx          # Root layout (replaces app/layout.tsx)
├── index.tsx           # Home page (replaces app/page.tsx)
├── login.tsx           # Login page
├── signup.tsx          # Signup page
├── dashboard.tsx       # Dashboard page
├── repos.tsx           # Repos list page
├── repos.$repoId.tsx   # Repo detail page
├── tasks.tsx           # Tasks list page
├── tasks.$taskId.tsx   # Task detail page
└── api/
    ├── auth/
    │   ├── login.ts    # Server Route (replaces app/api/auth/login/route.ts)
    │   └── ...
    └── ...
```

**Migration mapping:**
- `app/page.tsx` → `routes/index.tsx`
- `app/(auth)/login/page.tsx` → `routes/login.tsx`
- `app/dashboard/page.tsx` → `routes/dashboard.tsx`
- `app/repos/[repoId]/page.tsx` → `routes/repos.$repoId.tsx`
- `app/api/auth/login/route.ts` → `routes/api/auth/login.ts`

### Decision 3: TanStack Server Routes for API Endpoints

**What:** Convert Next.js API route handlers to TanStack Server Routes

**Why:**
- Unified routing system (pages and API in same router)
- Type-safe request/response handling
- Better integration with TanStack Router
- Simpler deployment model

**Pattern:**
```typescript
// Before (Next.js)
// app/api/task/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ ... });
}

// After (TanStack Start)
// routes/api/task.ts
export const Route = createFileRoute('/api/task')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        return Response.json({ ... });
      }
    }
  }
});
```

**Key differences:**
- Use `Response.json()` instead of `NextResponse.json()`
- Request object available in handler context
- No need for separate route.ts files - handlers in route definition

### Decision 4: TanStack Start Middleware for Auth

**What:** Convert Next.js middleware to TanStack Start middleware

**Why:**
- Centralized auth logic
- Works with TanStack Router
- Better integration with server functions

**Pattern:**
```typescript
// Before (Next.js)
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && isProtectedRoute(request.url)) {
    return NextResponse.redirect('/login');
  }
}

// After (TanStack Start)
// middleware.ts or in route definitions
export const middleware = async ({ request, context }) => {
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && isProtectedRoute(request.url)) {
    return Response.redirect('/login');
  }
};
```

### Decision 5: Server Functions for Data Fetching

**What:** Use TanStack Start server functions and loaders instead of Next.js Server Components

**Why:**
- Better type safety with TanStack Router
- Automatic code splitting
- Simpler data fetching patterns

**Pattern:**
```typescript
// Before (Next.js Server Component)
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const data = await fetchData();
  return <Dashboard user={user} data={data} />;
}

// After (TanStack Start)
// routes/dashboard.tsx
export const Route = createFileRoute('/dashboard')({
  loader: async ({ context }) => {
    const user = await getCurrentUser(context);
    const data = await fetchData();
    return { user, data };
  },
  component: Dashboard,
});

function Dashboard() {
  const { user, data } = Route.useLoaderData();
  return <DashboardView user={user} data={data} />;
}
```

### Decision 6: Convex Integration Adaptation

**What:** Keep Convex client/server utilities but adapt usage for TanStack Start

**Why:**
- Convex SDK works with any React framework
- Minimal changes required
- Server functions can use ConvexHttpClient
- Client components can use ConvexReactClient

**Changes needed:**
- Wrap app with ConvexProvider in root layout (same as before)
- Use ConvexHttpClient in server functions/loaders (same as before)
- Use Convex hooks in client components (same as before)

### Decision 7: Supabase Auth Integration Adaptation

**What:** Keep Supabase Auth utilities but adapt for TanStack Start context

**Why:**
- Supabase SSR package works with any framework
- Minimal changes to auth logic
- Middleware pattern similar to Next.js

**Changes needed:**
- Update cookie handling for TanStack Start (similar to Next.js)
- Adapt middleware for TanStack Start request handling
- Keep AuthProvider context (works the same)

### Decision 8: Image Optimization with Unpic

**What:** Use `@unpic/react` for image optimization instead of `next/image`

**Why:**
- Framework-agnostic image optimization
- Similar API to `next/image`
- Works with TanStack Start
- Supports multiple CDN providers

**Pattern:**
```typescript
// Before
import Image from 'next/image';
<Image src="/logo.png" width={200} height={200} alt="Logo" />

// After
import { Image } from '@unpic/react';
<Image src="/logo.png" width={200} height={200} alt="Logo" />
```

**Alternative considered:**
- Standard `<img>` tags: Loses optimization benefits
- Other image libraries: Unpic is most similar to next/image

### Decision 9: Vite Configuration

**What:** Use Vite with TanStack Start plugin, Tailwind CSS plugin, and TypeScript path resolution

**Why:**
- TanStack Start requires Vite
- Tailwind CSS Vite plugin for better integration
- TypeScript path aliases for clean imports

**Configuration:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths(), // Resolves @/* imports
    tanstackStart({
      routesDirectory: 'routes',
    }),
    viteReact(),
  ],
})
```

### Decision 10: Vercel Deployment Configuration

**What:** Update Vercel configuration for Vite build output

**Why:**
- TanStack Start builds to `.output/` directory
- Vercel needs to know build command and output directory
- May need custom serverless function configuration

**Configuration:**
```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".output/public",
  "framework": null, // Not Next.js anymore
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/.output/server/index.mjs"
    }
  ]
}
```

**Alternative considered:**
- Deploy to other platforms: Vercel is already configured and working

## Risks / Trade-offs

### Risk 1: Breaking Changes in API Routes
**Impact:** High - All API routes need conversion
**Mitigation:** 
- Convert one route at a time
- Test each route after conversion
- Keep Next.js routes as backup until all converted

### Risk 2: Auth Middleware Compatibility
**Impact:** High - Auth is critical for app security
**Mitigation:**
- Test auth flows thoroughly after migration
- Keep Next.js middleware as reference
- Validate session handling works correctly

### Risk 3: Convex Integration Issues
**Impact:** Medium - Convex should work but needs validation
**Mitigation:**
- Test Convex queries/mutations in new setup
- Verify server/client separation still works
- Check for any Next.js-specific Convex usage

### Risk 4: Build/Deployment Issues
**Impact:** High - App must deploy successfully
**Mitigation:**
- Test build locally before deploying
- Update Vercel configuration carefully
- Have rollback plan (keep Next.js config as backup)

### Risk 5: TypeScript Path Resolution
**Impact:** Medium - Imports may break
**Mitigation:**
- Use `vite-tsconfig-paths` plugin
- Verify all `@/*` imports work
- Update tsconfig.json paths if needed

### Risk 6: E2E Test Failures
**Impact:** Medium - Tests may need updates
**Mitigation:**
- Update Playwright tests for new routing
- Test critical user flows after migration
- Fix test selectors if route structure changes

## Migration Plan

### Phase 1: Infrastructure Setup (Day 1, Morning)
1. Install TanStack Start dependencies
2. Create `vite.config.ts`
3. Update `package.json` scripts
4. Update `tsconfig.json` for Vite/ESM
5. Create basic `routes/__root.tsx` layout
6. Create `routes/index.tsx` home page
7. Test basic routing works

### Phase 2: API Routes Migration (Day 1, Afternoon)
1. Convert auth API routes (`/api/auth/*`)
2. Convert task API routes (`/api/task/*`)
3. Convert repo API routes (`/api/repo/*`)
4. Convert webhook routes (`/api/webhook/*`)
5. Convert admin/debug routes
6. Test all API routes work

### Phase 3: Auth Pages (Day 2, Morning)
1. Convert login page
2. Convert signup page
3. Convert magic-link page
4. Convert auth callback route
5. Update auth middleware
6. Test auth flows end-to-end

### Phase 4: Protected Pages (Day 2, Afternoon)
1. Convert dashboard page
2. Convert repos list page
3. Convert repo detail page
4. Convert tasks list page
5. Convert task detail page
6. Test all protected routes

### Phase 5: Polish & Deploy (Day 2, Evening)
1. Fix any remaining issues
2. Update E2E tests
3. Update Vercel configuration
4. Deploy to Vercel
5. Smoke test production deployment
6. Remove Next.js dependencies

## Open Questions

1. **Vercel Serverless Functions**: Does TanStack Start work with Vercel serverless functions, or do we need edge functions?
   - **Answer needed before Phase 2**: Check TanStack Start Vercel deployment docs

2. **Image Optimization**: Do we need CDN configuration for Unpic, or can we use it without?
   - **Answer needed before Phase 4**: Test Unpic with local images first

3. **Environment Variables**: Are there any differences in how TanStack Start handles env vars vs Next.js?
   - **Answer needed before Phase 1**: Check TanStack Start env var docs

4. **Static Assets**: How do we handle static assets (public folder) in TanStack Start?
   - **Answer needed before Phase 1**: Check TanStack Start static assets docs

5. **Build Output**: What's the exact build output structure for Vercel deployment?
   - **Answer needed before Phase 5**: Test build locally and inspect output

