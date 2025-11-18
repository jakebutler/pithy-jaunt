# Change: Add Toast Notifications and Improve Logout UX

## Why

Currently, when users sign out, they see a JSON response from the logout API endpoint instead of a user-friendly experience. The application lacks a toast notification system for providing feedback to users after actions like logout. Users should be redirected to the homepage with a clear success message indicating they've been signed out.

## What Changes

- **Toast Notification System**: Implement a global toast notification system with a React context provider and hook
- **Toast Component Enhancement**: Enhance existing toast component with Aceternity UI styling and animations
- **Logout Flow Update**: Update logout behavior to redirect users to the homepage with a success toast message
- **Toast Provider Integration**: Add toast provider to the app's provider tree
- **Homepage Toast Support**: Update homepage to display toast messages from URL parameters or context

## Impact

- **Affected specs**: `auth` (logout behavior), `frontend` (new toast notification capability)
- **Affected code**:
  - `components/ui/toast.tsx` - Enhance with Aceternity styling
  - `lib/toast/context.tsx` - New toast context provider
  - `lib/auth/context.tsx` - Update signOut to handle redirect and toast
  - `components/auth/AuthButton.tsx` - Update to use new logout flow
  - `components/ui/navigation.tsx` - Update form logout to use new flow
  - `app/api/auth/logout/route.ts` - Update to handle redirects
  - `app/providers.tsx` - Add ToastProvider
  - `app/page.tsx` - Add toast display support

