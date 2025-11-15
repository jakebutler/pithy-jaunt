# Quick Start Guide

Get Pithy Jaunt running in 5 minutes!

## Prerequisites

✅ You have:
- Supabase project set up
- Convex deployment: `https://rightful-chinchilla-44.convex.cloud`
- `.env.local` file with all API keys

## Step 1: Verify Environment Variables

Make sure your `.env.local` includes:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Convex
NEXT_PUBLIC_CONVEX_URL=https://rightful-chinchilla-44.convex.cloud
CONVEX_DEPLOYMENT=prod:rightful-chinchilla-44

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 2: Link Convex Deployment

```bash
# Authenticate with Convex (opens browser)
npx convex login

# Link to your deployment
npx convex dev --configure

# When prompted:
# - Select "Use existing deployment"
# - Enter: rightful-chinchilla-44
# OR use the URL: https://rightful-chinchilla-44.convex.cloud
```

## Step 3: Deploy Convex Schema

```bash
# Deploy schema and functions
npx convex deploy

# This creates:
# - users table
# - repos table  
# - tasks table
# - workspaces table
# - User management functions
```

## Step 4: Start Development Servers

**Terminal 1 - Convex (watches for changes):**
```bash
npx convex dev
```

**Terminal 2 - Next.js:**
```bash
npm run dev
```

## Step 5: Test Authentication

1. Open http://localhost:3000
2. Click "Get Started" or go to http://localhost:3000/signup
3. Create an account
4. You should be redirected to the dashboard
5. Check Convex dashboard → Data → users table to see your user

## Verify Everything Works

### Check Supabase
- Go to Supabase dashboard → Authentication → Users
- You should see your new user

### Check Convex
- Go to https://dashboard.convex.dev
- Navigate to your deployment
- Check Data → users table
- Your user should be synced there

### Test Login
1. Sign out from the dashboard
2. Go to http://localhost:3000/login
3. Log in with your credentials
4. You should be redirected to the dashboard

## Troubleshooting

### Convex not connecting?
```bash
# Verify deployment URL
echo $NEXT_PUBLIC_CONVEX_URL

# Should output: https://rightful-chinchilla-44.convex.cloud

# Re-link if needed
npx convex dev --configure
```

### User not syncing to Convex?
- Check Convex is running: `npx convex dev`
- Check browser console for errors
- Verify schema is deployed: `npx convex deploy`
- Check Convex dashboard → Logs

### Authentication errors?
- Verify Supabase keys in `.env.local`
- Restart Next.js dev server after changing env vars
- Clear browser cookies
- Check Supabase dashboard → Authentication → Logs

## Next Steps

- ✅ Authentication is working!
- 📖 Read `docs/AUTH_SETUP.md` for detailed setup
- 📖 Read `docs/CONVEX_SETUP.md` for Convex details
- 📖 Read `docs/DEVELOPMENT.md` for development guide

## Need Help?

- Check the troubleshooting sections in the docs
- Review Convex dashboard logs
- Review Supabase dashboard logs
- Open an issue on GitHub

---

**You're all set!** 🎉 Start building features!

