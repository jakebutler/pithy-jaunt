# Change: Add Marketing Landing Page

## Why

Currently, unauthenticated users see a basic homepage with minimal information. We need an effective landing page that communicates Pithy Jaunt's value proposition, encourages sign-ups, and provides a professional first impression. The landing page should highlight the key benefits: capturing ideas on-the-go, letting Pithy Jaunt build features automatically, and continuing to get inspiration while the system does the hard work.

## What Changes

- Create a marketing-focused landing page for unauthenticated users using **TanStack Start** patterns:
  - Use `createFileRoute` from `@tanstack/react-router`
  - Implement server-side `loader` function to check authentication state
  - Redirect authenticated users to dashboard using TanStack Router's `redirect()`
  - Use `Link` component from `@tanstack/react-router` for navigation
- Optimize and integrate the pithy-jaunt.png image as a hero image
- Write compelling marketing copy highlighting value propositions:
  - Capture ideas on-the-go (mobile-first workflow)
  - Let Pithy Jaunt build it for you (automated PR generation)
  - Continue getting inspiration while Pithy Jaunt does the hard work (asynchronous execution)
- Add primary CTAs for "Sign Up" and "Sign In" using TanStack Router Links
- Ensure the landing page only displays when user is not authenticated (handled in loader)
- Implement responsive, mobile-first design with Tailwind CSS
- Optimize hero image file size for web performance

## Impact

- **Affected specs**: `landing-page` (new capability)
- **Affected code**:
  - `/src/routes/index.tsx` - Replace basic homepage with marketing landing page using TanStack Start patterns:
    - Add `loader` function with server-side authentication check using `createClient` from `@/lib/auth/supabase-server-tanstack`
    - Redirect authenticated users to `/dashboard` using TanStack Router's `redirect()`
    - Update component to use TanStack Router `Link` components
  - `/public/` - Add optimized hero image asset
  - Image optimization script or process for pithy-jaunt.png

