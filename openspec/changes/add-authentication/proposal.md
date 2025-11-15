# Change: Add Authentication System

## Why

Pithy Jaunt requires a secure authentication system to manage user accounts, protect API endpoints, and enable personalized experiences across web and mobile platforms. The MVP needs email/password authentication and magic link support via Supabase Auth, with session management for both Next.js web app and mobile clients.

## What Changes

- Implement Supabase Auth integration for user registration and login
- Create email/password authentication flow
- Add magic link (passwordless) authentication option
- Build session management and token handling
- Protect API routes with authentication middleware
- Create authentication UI components (login, signup, password reset)
- Add authentication state management
- Implement logout functionality
- Create user profile data model in Convex

## Impact

- **Affected specs**: `auth` (new capability)
- **Affected code**: 
  - `/app/api/auth/*` - Authentication API routes
  - `/app/(auth)/*` - Authentication pages (login, signup, magic-link)
  - `/components/auth/*` - Authentication UI components
  - `/lib/auth/*` - Authentication utilities and middleware
  - `/convex/users.ts` - User data model and queries
  - Environment configuration for Supabase credentials

