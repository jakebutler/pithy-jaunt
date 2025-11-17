## 1. Image Optimization
- [ ] 1.1 Optimize pithy-jaunt.png for web (reduce file size, convert to WebP if appropriate)
- [ ] 1.2 Place optimized image in public assets directory
- [ ] 1.3 Verify image quality and file size meet performance requirements

## 2. Landing Page Implementation
- [ ] 2.1 Create landing page spec with requirements
- [ ] 2.2 Update index route using TanStack Start patterns:
  - Add `loader` function with server-side authentication check
  - Use `createClient` from `@/lib/auth/supabase-server-tanstack` in loader
  - Redirect authenticated users to `/dashboard` using `redirect()` from `@tanstack/react-router`
- [ ] 2.3 Implement hero section with optimized image
- [ ] 2.4 Write and implement marketing copy with value propositions
- [ ] 2.5 Add primary CTAs using TanStack Router `Link` components (Sign Up and Sign In buttons)
- [ ] 2.6 Implement responsive, mobile-first layout
- [ ] 2.7 Add proper semantic HTML and accessibility attributes
- [ ] 2.8 Style landing page with Tailwind CSS following project conventions

## 4. Testing
- [ ] 4.1 Test landing page displays correctly for unauthenticated users
- [ ] 4.2 Test authenticated users are redirected appropriately
- [ ] 4.3 Test responsive design on mobile and desktop viewports
- [ ] 4.4 Verify image loads and displays correctly
- [ ] 4.5 Test CTAs navigate to correct routes (/signup and /login)
- [ ] 4.6 Verify accessibility (keyboard navigation, screen readers)

