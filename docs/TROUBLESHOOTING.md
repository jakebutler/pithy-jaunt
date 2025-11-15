# Troubleshooting Guide

## Common Issues and Solutions

### 404 Errors for `app-pages-internals.js`

**Symptoms:**
- Browser console shows: `Failed to load resource: 404 (Not Found)` for `app-pages-internals.js`
- App may not load or have broken functionality

**Solutions:**

1. **Clear Browser Cache:**
   - Chrome/Edge: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Or hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

2. **Clear Next.js Cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Restart Dev Server:**
   ```bash
   # Stop the server
   kill $(cat /tmp/nextjs-dev.pid)
   
   # Clear cache and restart
   rm -rf .next
   npm run dev
   ```

4. **Clear Node Modules (if persistent):**
   ```bash
   rm -rf .next node_modules
   npm install
   npm run dev
   ```

### Environment Variable Issues

**Symptoms:**
- "Missing NEXT_PUBLIC_SUPABASE_URL" errors
- Authentication not working

**Solutions:**

1. **Verify `.env.local` exists:**
   ```bash
   ls -la .env.local
   ```

2. **Check variable names:**
   - Must have `NEXT_PUBLIC_` prefix for client-side variables
   - Example: `NEXT_PUBLIC_SUPABASE_URL` (not `SUPABASE_URL`)

3. **Restart server after changing env vars:**
   ```bash
   # Stop and restart
   kill $(cat /tmp/nextjs-dev.pid)
   npm run dev
   ```

### Convex Connection Issues

**Symptoms:**
- "Missing NEXT_PUBLIC_CONVEX_URL" errors
- User sync not working

**Solutions:**

1. **Verify Convex is running:**
   ```bash
   ps aux | grep "convex dev"
   ```

2. **Check Convex deployment:**
   ```bash
   npx convex dashboard
   ```

3. **Redeploy schema:**
   ```bash
   npx convex deploy
   ```

### Port Already in Use

**Symptoms:**
- "Port 3000 is already in use" error

**Solutions:**

1. **Find and kill process:**
   ```bash
   lsof -ti:3000 | xargs kill
   ```

2. **Or use a different port:**
   ```bash
   PORT=3001 npm run dev
   ```

### TypeScript/JSX Errors

**Symptoms:**
- "Expected '>', got 'client'" errors
- JSX not parsing correctly

**Solutions:**

1. **Ensure JSX files use `.tsx` extension:**
   - Files with JSX must be `.tsx`, not `.ts`

2. **Check `tsconfig.json`:**
   - `"jsx": "preserve"` should be set

3. **Clear cache and restart:**
   ```bash
   rm -rf .next
   npm run dev
   ```

### Authentication Not Working

**Symptoms:**
- Login/signup fails
- Redirects not working

**Solutions:**

1. **Check Supabase configuration:**
   - Verify URLs in Supabase dashboard
   - Check redirect URLs are configured

2. **Verify middleware:**
   - Check `middleware.ts` is in root directory
   - Verify protected routes are correct

3. **Check browser console:**
   - Look for CORS errors
   - Check network tab for failed requests

### Build Errors

**Symptoms:**
- `npm run build` fails
- Type errors during build

**Solutions:**

1. **Type check:**
   ```bash
   npm run type-check
   ```

2. **Check for missing dependencies:**
   ```bash
   npm install
   ```

3. **Clear all caches:**
   ```bash
   rm -rf .next node_modules
   npm install
   ```

## Quick Fixes

### Full Reset (Nuclear Option)
```bash
# Stop all servers
pkill -f "next dev"
pkill -f "convex dev"

# Clear everything
rm -rf .next node_modules

# Reinstall
npm install

# Restart
npx convex dev &
npm run dev
```

### Check Server Status
```bash
# Next.js
ps aux | grep "next dev" | grep -v grep

# Convex
ps aux | grep "convex dev" | grep -v grep

# Check ports
lsof -i :3000
lsof -i :3001
```

## Getting Help

If issues persist:

1. Check logs:
   ```bash
   tail -f /tmp/nextjs-dev.log
   tail -f /tmp/convex-dev.log
   ```

2. Check browser console for client-side errors

3. Check network tab for failed requests

4. Review error messages carefully

5. Open an issue on GitHub with:
   - Error messages
   - Steps to reproduce
   - Logs (with sensitive info removed)

---

**Last updated**: $(date)

