# Change: Migrate Frontend to TanStack Start

## Why

Pithy Jaunt currently uses Next.js 15 App Router for the frontend. For the hackathon, we're migrating to **TanStack Start** (Vite-based) to leverage:

- **Better developer experience**: Faster HMR, simpler configuration, better TypeScript support
- **Modern routing**: TanStack Router provides type-safe routing with better code splitting
- **Flexible deployment**: Vite-based build enables deployment to multiple platforms (Vercel, Cloudflare, Node.js)
- **Performance**: Smaller bundle sizes and faster builds with Vite
- **Future-proofing**: TanStack ecosystem provides excellent React integration and tooling

This migration maintains all existing functionality (Convex backend, Supabase Auth, API routes) while modernizing the frontend architecture.

## What Changes

**BREAKING**: Complete frontend framework migration from Next.js to TanStack Start

- **Build System**: Replace Next.js with Vite + TanStack Start plugin
- **Routing**: Convert Next.js App Router pages to TanStack Router file-based routes
- **API Routes**: Convert Next.js API route handlers to TanStack Server Routes
- **Middleware**: Convert Next.js middleware to TanStack Start middleware
- **Server Components**: Adapt Next.js Server Components to TanStack Start server functions and loaders
- **Layouts**: Convert Next.js layouts to TanStack Router layouts
- **Links**: Replace `next/link` with `@tanstack/react-router` Link component
- **Images**: Replace `next/image` with `@unpic/react` Image component (or standard img tags)
- **Configuration**: Update `package.json`, `tsconfig.json`, add `vite.config.ts`, remove `next.config.ts`
- **Deployment**: Update Vercel configuration for Vite build output

**Non-Breaking**:
- Convex integration remains unchanged (client and server utilities)
- Supabase Auth integration remains unchanged (context, utilities)
- Component library (ShadCN UI, Radix) remains unchanged
- Tailwind CSS configuration remains unchanged
- All business logic and data models remain unchanged

## Impact

- **Affected specs**: 
  - `frontend` (new capability - routing, pages, layouts)
  - `api-routes` (modified - convert to TanStack Server Routes)
  - `auth` (modified - adapt middleware and route protection)
  - `convex-integration` (modified - adapt client/server usage patterns)

- **Affected code**:
  - `/app/**/*.tsx` - All pages converted to TanStack Router routes
  - `/app/api/**/*.ts` - All API routes converted to TanStack Server Routes
  - `/middleware.ts` - Converted to TanStack Start middleware
  - `/app/layout.tsx` - Converted to TanStack Start root layout
  - `/lib/convex/client.tsx` - May need updates for TanStack Start context
  - `/lib/auth/context.tsx` - May need updates for TanStack Start context
  - `/components/**/*.tsx` - Update Link imports, remove Next.js-specific code
  - `/package.json` - Update dependencies and scripts
  - `/tsconfig.json` - Update for Vite/ESM
  - `/next.config.ts` - **REMOVED**
  - `/vite.config.ts` - **ADDED**
  - `/vercel.json` - Update build configuration

- **Deployment**: Vercel configuration must be updated for Vite build output

- **Testing**: E2E tests (Playwright) may need updates for new routing structure

