# Security Considerations for Production Test Scripts

## Current Issue

The production test script attempts to use a `SUPABASE_ACCESS_TOKEN` with Bearer authentication, but:

1. **API doesn't support Bearer tokens**: The API routes use cookie-based authentication via `createClient()` which reads from cookies, not Authorization headers.

2. **Security risks of exposing tokens**:
   - **User session tokens**: If using a user's session token (JWT), it grants full access to that user's account
     - Can create/delete tasks
     - Can access all user's repositories
     - Can execute tasks on behalf of the user
     - Tokens are typically long-lived (days/weeks)
     - If exposed in logs, environment, or script output, could be misused
   
   - **Service role keys**: Even more dangerous - bypass all security
     - Should NEVER be used in scripts
     - Only for server-to-server communication
     - If exposed, grants admin access to entire Supabase project

## Recommended Solutions

### Option 1: Add Bearer Token Support (Recommended for Testing)

Modify API routes to support Bearer tokens for authenticated requests, but with proper validation:

**Pros:**
- Works with scripts
- Can validate token expiration
- Can revoke tokens if compromised

**Cons:**
- Adds complexity
- Need to handle token validation
- Still need to protect tokens

**Implementation:**
- Extract token from Authorization header
- Validate with Supabase Auth
- Use validated user for authorization

### Option 2: Use Dedicated API Keys

Create a separate API key system for automation/testing:

**Pros:**
- Can be scoped to specific operations
- Can be rotated independently
- Can be revoked without affecting user sessions

**Cons:**
- Requires building API key management
- More infrastructure

### Option 3: Use Test User Account

Create a dedicated test user account with limited permissions:

**Pros:**
- Isolates test data
- Can be reset easily
- Lower risk if compromised

**Cons:**
- Still uses session tokens
- Need to manage test account
- Tokens still sensitive

### Option 4: Use Cookies (Current Approach)

Extract cookies from browser and use them in script:

**Pros:**
- Works with current API
- No code changes needed

**Cons:**
- More complex for scripts
- Cookies expire
- Still sensitive if exposed

## Best Practices

1. **Never commit tokens to git**
   - Use environment variables
   - Add to `.gitignore` if storing locally
   - Use secret management for CI/CD

2. **Use short-lived tokens**
   - Prefer session tokens over service role keys
   - Rotate regularly
   - Revoke if compromised

3. **Limit token scope**
   - Use test user accounts
   - Restrict permissions where possible
   - Monitor token usage

4. **Protect token in scripts**
   - Don't log tokens
   - Don't echo tokens
   - Use secure storage

5. **Use separate test environment**
   - Isolate test data
   - Use test user accounts
   - Don't test against production user data

## Current Recommendation

For now, the safest approach is:

1. **Use a dedicated test user account** (not your main account)
2. **Extract the session token** from browser DevTools
3. **Set as environment variable** (not in script)
4. **Add Bearer token support** to API routes with proper validation
5. **Monitor token usage** and rotate regularly

This balances security with usability for testing.

