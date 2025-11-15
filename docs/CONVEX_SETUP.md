# Convex Setup Guide

This guide helps you connect your Convex deployment to the Pithy Jaunt project.

## Your Convex Deployment

- **Deployment URL**: `https://rightful-chinchilla-44.convex.cloud`
- **HTTP Actions URL**: `https://rightful-chinchilla-44.convex.site`

## Step 1: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Convex Configuration
NEXT_PUBLIC_CONVEX_URL=https://rightful-chinchilla-44.convex.cloud
CONVEX_DEPLOYMENT=prod:rightful-chinchilla-44
```

## Step 2: Authenticate with Convex

You need to authenticate the Convex CLI with your deployment:

```bash
# Login to Convex
npx convex login

# This will open a browser window for authentication
```

## Step 3: Link Your Project

Link your local project to your Convex deployment:

```bash
# Link to your deployment
npx convex dev --configure

# When prompted:
# - Select "Use existing deployment"
# - Enter: https://rightful-chinchilla-44.convex.cloud
# - Or use the deployment name: rightful-chinchilla-44
```

Alternatively, you can manually create a `.env.local` entry:

```env
CONVEX_DEPLOYMENT=prod:rightful-chinchilla-44
```

## Step 4: Deploy Schema and Functions

Once linked, deploy your schema and functions:

```bash
# Deploy everything
npx convex deploy

# Or run in dev mode (watches for changes)
npx convex dev
```

This will:
- Deploy `convex/schema.ts` (creates database tables)
- Deploy `convex/users.ts` (user management functions)
- Generate TypeScript types in `convex/_generated/`

## Step 5: Verify Deployment

Check that everything is working:

```bash
# View your deployment
npx convex dashboard

# This opens the Convex dashboard in your browser
# You should see:
# - Tables: users, repos, tasks, workspaces
# - Functions: users.upsertUser, users.getUserBySupabaseId, etc.
```

## Step 6: Test the Connection

Create a simple test to verify the connection:

```bash
# Test a query
npx convex run users:getUserByEmail '{"email":"test@example.com"}'

# Should return null (no user exists yet)
```

## Troubleshooting

### Issue: "Not authenticated"

**Solution:**
```bash
npx convex login
```

### Issue: "Deployment not found"

**Solution:**
- Verify the deployment URL is correct
- Check you're logged into the correct Convex account
- Try: `npx convex dev --configure` again

### Issue: "Schema validation failed"

**Solution:**
- Check `convex/schema.ts` for syntax errors
- Ensure all table definitions are correct
- Run `npm run type-check` to verify TypeScript

### Issue: "Functions not deploying"

**Solution:**
- Check `convex/users.ts` for errors
- Verify all imports are correct
- Check Convex dashboard → Logs for errors

## Next Steps

Once Convex is set up:

1. **Test user sync**: Sign up a user and verify it appears in Convex
2. **Check dashboard**: Visit https://dashboard.convex.dev to see your data
3. **Monitor logs**: Watch for any errors during auth operations

## Production Deployment

For production, the same deployment URL works. Just ensure:

```env
NEXT_PUBLIC_CONVEX_URL=https://rightful-chinchilla-44.convex.cloud
CONVEX_DEPLOYMENT=prod:rightful-chinchilla-44
```

Are set in your production environment (Vercel, etc.).

## Resources

- [Convex Dashboard](https://dashboard.convex.dev)
- [Convex Documentation](https://docs.convex.dev)
- [Your Deployment](https://rightful-chinchilla-44.convex.cloud)

---

**Need help?** Check the Convex dashboard logs or open an issue in the repository.

