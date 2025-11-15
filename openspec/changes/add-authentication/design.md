# Authentication System Design

## Context

Pithy Jaunt requires authentication to secure API endpoints, manage user sessions, and provide personalized experiences. We're implementing this as the foundational system for the MVP, which will be used by both web (Next.js) and mobile (React Native/Expo) clients.

**Constraints:**
- MVP scope: production environment only, no staging
- Max 10 concurrent users initially
- Must support both web and mobile clients
- WCAG AA accessibility required
- English-only interface

**Stakeholders:**
- End users (web and mobile)
- Backend API (Convex functions)
- Future WorkOS SSO integration

## Goals / Non-Goals

**Goals:**
- Implement secure, production-ready authentication using Supabase Auth
- Support email/password and magic link (passwordless) flows
- Synchronize auth state between Supabase and Convex
- Provide reusable authentication hooks and components
- Ensure WCAG AA compliance on all auth UI
- Enable seamless session management across page refreshes
- Support both web and mobile clients with same backend

**Non-Goals:**
- OAuth providers (Google, GitHub) - post-MVP
- WorkOS SSO - post-MVP
- Two-factor authentication - post-MVP
- Rate limiting - post-MVP (noted for future)
- Advanced password policies (complexity rules) - keep simple for MVP
- Account deletion/GDPR compliance - hackathon scope excludes this

## Decisions

### Decision 1: Supabase Auth as Primary Provider

**What:** Use Supabase Auth for all authentication operations rather than building custom auth.

**Why:**
- Battle-tested security implementation
- Built-in session management and token refresh
- Email service integration for magic links
- SDKs for both web and React Native
- Reduces implementation time for MVP
- Future-proof for WorkOS integration (Supabase can coexist)

**Alternatives considered:**
- NextAuth.js: Good for web but more complex for React Native
- Custom auth with Convex: Would require significant security work and time
- Clerk: Great option but adds another paid service; prefer Supabase + Convex stack

### Decision 2: Dual Database Strategy (Supabase + Convex)

**What:** Store auth credentials in Supabase, sync user profiles to Convex for application data.

**Why:**
- Supabase Auth requires Supabase database for auth tables
- Convex is our primary backend for realtime features and business logic
- Separation of concerns: auth vs. application data
- Convex queries are more ergonomic for React components
- Enables fast user lookups without crossing systems for every request

**Implementation:**
- On signup: Create Supabase user → webhook/callback → create Convex user record
- Store minimal data in Convex: `{ _id, supabaseUserId, email, createdAt, updatedAt }`
- Use Supabase user ID as the foreign key

**Trade-offs:**
- Slight complexity in keeping data synchronized
- Risk: data inconsistency if sync fails (mitigate with retry logic)

### Decision 3: Server-Side Session Validation with Middleware

**What:** Use Next.js middleware to validate sessions on protected routes.

**Why:**
- Prevents unauthorized access before page renders
- Centralizes auth logic
- Better performance than client-side checks
- Works with Next.js App Router and Server Components
- Enables redirect with return URL preservation

**Implementation:**
```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session && isProtectedRoute(request.url)) {
    return NextResponse.redirect('/login?returnTo=' + request.url)
  }
}
```

### Decision 4: HTTP-Only Cookies for Token Storage

**What:** Store session tokens in HTTP-only, Secure, SameSite=Lax cookies.

**Why:**
- Prevents XSS attacks (JavaScript can't access tokens)
- Supabase SSR package handles this automatically
- Works across both API routes and Server Components
- Mobile app will use secure storage (different approach)

**Mobile difference:**
- React Native uses Expo SecureStore for token persistence
- Same Supabase client, different storage adapter

### Decision 5: Optimistic UI with Loading States

**What:** Show immediate feedback on auth actions with proper loading states.

**Why:**
- Better UX, especially on slower connections
- Prevents double submissions
- Required for accessibility (users know action is processing)
- Aligns with mobile-first design principles

**Implementation:**
- Disable form inputs during submission
- Show spinner on submit button
- Display toast notifications for success/error
- Use Suspense boundaries for auth state loading

## Risks / Trade-offs

### Risk: Supabase-Convex Sync Failures
**Mitigation:**
- Implement retry logic with exponential backoff
- Log sync failures to Galileo for monitoring
- Provide manual sync repair endpoint for admin
- Consider idempotency: sync should be safe to retry

### Risk: Session Token Refresh on Mobile
**Mitigation:**
- Supabase SDK handles refresh automatically
- Test thoroughly on mobile with network interruptions
- Implement graceful degradation (force re-login if refresh fails)

### Risk: Magic Link Deliverability
**Mitigation:**
- Use Supabase's built-in email service for MVP
- Clear user instructions: check spam folder
- Show clear success message after requesting link
- Consider Resend integration post-MVP for better deliverability

### Risk: Scale Beyond 10 Users
**Trade-off:** MVP optimized for 10 concurrent users, but architecture supports growth
- Supabase free tier: 50,000 monthly active users
- Convex free tier: sufficient for early growth
- If we exceed limits: upgrade or add rate limiting

## Migration Plan

**Initial Setup:**
1. Configure Supabase project and enable email auth
2. Set up email templates for magic links
3. Create Convex users schema
4. Deploy auth middleware and API routes
5. Test with multiple devices/browsers

**Rollback:**
- If auth system fails in production, roll back to previous commit
- Users won't have accounts yet (MVP), so no data loss risk
- Keep old .env config for quick restoration

**Post-MVP Enhancements:**
1. Add OAuth providers (Google, GitHub)
2. Integrate WorkOS for SSO
3. Add rate limiting on auth endpoints
4. Implement two-factor authentication
5. Add account deletion and GDPR compliance

## Open Questions

1. **Email template customization**: Should we customize Supabase email templates now or use defaults?
   - **Decision**: Use defaults for MVP, customize post-launch

2. **Password reset flow**: Include in MVP or defer?
   - **Decision**: Include basic password reset (tasks.md item 3.5-3.6)

3. **Remember me checkbox**: Extend session duration?
   - **Decision**: Default 7-day sessions for all users; defer "remember me" to post-MVP

4. **Mobile push notification tokens**: Store in Convex user record?
   - **Decision**: Yes, add `pushTokens: string[]` field to user schema (one user can have multiple devices)

## File Structure

```
/app
  /api/auth
    /signup/route.ts
    /login/route.ts
    /magic-link/route.ts
    /logout/route.ts
    /session/route.ts
    /callback/route.ts
  /(auth)
    /login/page.tsx
    /signup/page.tsx
    /magic-link/page.tsx
    /reset-password/page.tsx

/components/auth
  LoginForm.tsx
  SignupForm.tsx
  MagicLinkForm.tsx
  AuthButton.tsx
  ProtectedRoute.tsx

/lib/auth
  supabase-server.ts    # Server-side client
  supabase-client.ts    # Client-side client
  middleware.ts         # Auth middleware
  hooks.ts              # useAuth, useUser hooks
  context.tsx           # AuthProvider

/convex
  users.ts              # User schema and queries
  _generated/          # Convex generated types

middleware.ts           # Next.js middleware (root)
```

## API Endpoint Summary

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/auth/signup` | POST | Create new user | No |
| `/api/auth/login` | POST | Login with email/password | No |
| `/api/auth/magic-link` | POST | Request magic link | No |
| `/api/auth/callback` | GET | OAuth/magic link callback | No |
| `/api/auth/logout` | POST | End user session | Yes |
| `/api/auth/session` | GET | Get current user | Yes |

## Success Metrics

- All 8 auth scenarios pass manual testing
- WCAG AA compliance verified with axe DevTools
- Session persists across page refresh
- Magic link email arrives within 30 seconds
- Login/signup completes in <2 seconds (95th percentile)
- Zero security vulnerabilities in Supabase integration

