# Authentication Setup Guide

This guide walks you through setting up authentication for Pithy Jaunt using Supabase and Convex.

## Prerequisites

- Supabase account (https://supabase.com)
- Convex account (https://convex.dev)
- Node.js 20+ installed
- npm or yarn

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in project details:
   - **Name**: pithy-jaunt (or your preferred name)
   - **Database Password**: Generate a secure password (save this!)
   - **Region**: Choose closest to your users
4. Wait for the project to finish setting up (~2 minutes)

### 1.2 Configure Authentication

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider (should be enabled by default)
3. Configure email settings:
   - Go to **Authentication** → **Email Templates**
   - Customize templates if desired (optional for MVP)
4. Set up redirect URLs:
   - Go to **Authentication** → **URL Configuration**
   - Add Site URL: `http://localhost:3000` (development)
   - Add Redirect URLs: `http://localhost:3000/auth/callback`

### 1.3 Get API Keys

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **Keep this secret!**

## Step 2: Convex Setup

### 2.1 Create a Convex Project

1. Go to https://dashboard.convex.dev
2. Click "Create a project"
3. Connect your GitHub repository or create manually
4. Name your project: `pithy-jaunt`

### 2.2 Initialize Convex Locally

```bash
# Install Convex CLI globally
npm install -g convex

# Initialize Convex in your project
npx convex dev

# Follow the prompts:
# - Select your project
# - Choose the default configuration
```

### 2.3 Deploy Convex Schema

```bash
# Deploy the schema and functions
npx convex deploy

# This will deploy:
# - convex/schema.ts (database tables)
# - convex/users.ts (user management functions)
```

### 2.4 Get Convex Deployment URL

After deployment, you'll see output like:
```
Convex URL: https://xxx.convex.cloud
```

Copy this URL - you'll need it for environment variables.

## Step 3: Environment Configuration

### 3.1 Create Environment File

Create a `.env.local` file in the project root:

```bash
# Copy the example file
cp .env.local.example .env.local
```

### 3.2 Fill in Supabase Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3.3 Fill in Convex Variables

```env
# Convex
CONVEX_DEPLOYMENT=prod:xxx
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
```

### 3.4 Add App URL (Optional)

```env
# App URL (for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 4: Install Dependencies

```bash
# Install all required packages
npm install

# Verify installation
npm list @supabase/supabase-js @supabase/ssr convex
```

## Step 5: Run the Application

### 5.1 Start Convex Development Server

In one terminal:

```bash
npx convex dev
```

This will:
- Watch for changes to Convex functions
- Auto-deploy on save
- Show logs in real-time

### 5.2 Start Next.js Development Server

In another terminal:

```bash
npm run dev
```

The app will be available at http://localhost:3000

## Step 6: Test Authentication

### 6.1 Test Signup Flow

1. Navigate to http://localhost:3000/signup
2. Enter an email and password (min 8 characters)
3. Click "Create account"
4. You should be redirected to the dashboard
5. Check Supabase dashboard → Authentication → Users to verify the user was created

### 6.2 Test Login Flow

1. Sign out (click "Sign out" in the dashboard)
2. Navigate to http://localhost:3000/login
3. Enter your credentials
4. Click "Sign in"
5. You should be redirected to the dashboard

### 6.3 Test Magic Link Flow

1. Sign out if logged in
2. Navigate to http://localhost:3000/magic-link
3. Enter your email
4. Click "Send magic link"
5. Check your email for the magic link
6. Click the link - you should be logged in automatically

### 6.4 Verify Convex Sync

1. After signing up, check your Convex dashboard
2. Go to **Data** → **users** table
3. You should see your user record with:
   - `supabaseUserId`
   - `email`
   - `createdAt` and `updatedAt` timestamps

## Troubleshooting

### Issue: "Invalid API key" error

**Solution**: 
- Verify your Supabase API keys in `.env.local`
- Make sure you're using the `anon public` key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart the dev server after changing environment variables

### Issue: Magic link not arriving

**Solution**:
- Check spam folder
- Verify email settings in Supabase dashboard
- Check Supabase logs: Authentication → Logs
- For development, consider using a service like Mailtrap or Mailhog

### Issue: "Authentication failed" after clicking magic link

**Solution**:
- Verify redirect URL is configured in Supabase
- Check that `NEXT_PUBLIC_APP_URL` is set correctly
- Ensure `/auth/callback` route is working

### Issue: User not syncing to Convex

**Solution**:
- Verify Convex is running (`npx convex dev`)
- Check Convex logs for errors
- Manually trigger sync by calling the `upsertUser` mutation
- Ensure schema is deployed (`npx convex deploy`)

### Issue: Session not persisting

**Solution**:
- Clear browser cookies
- Check middleware.ts is configured correctly
- Verify Supabase client is created with cookie options
- Check browser console for errors

## Production Deployment

### Update Supabase URLs

1. In Supabase dashboard → Authentication → URL Configuration
2. Add your production URL (e.g., `https://pithy-jaunt.vercel.app`)
3. Add production callback URL: `https://pithy-jaunt.vercel.app/auth/callback`

### Update Environment Variables

In your hosting platform (Vercel, etc.):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud
CONVEX_DEPLOYMENT=prod:xxx
NEXT_PUBLIC_APP_URL=https://your-production-url.com
```

### Deploy Convex to Production

```bash
# Deploy to production
npx convex deploy --prod

# Update CONVEX_DEPLOYMENT with the prod value
```

## Security Checklist

- [ ] Never commit `.env.local` to git
- [ ] Use service_role key only in server-side code
- [ ] Enable RLS (Row Level Security) in Supabase for production
- [ ] Set up rate limiting in production
- [ ] Enable email verification if required
- [ ] Configure proper CORS settings
- [ ] Use HTTPS in production
- [ ] Set secure cookie flags (already configured in middleware)

## Next Steps

- [ ] Customize email templates in Supabase
- [ ] Add OAuth providers (Google, GitHub)
- [ ] Implement password reset flow
- [ ] Add two-factor authentication
- [ ] Set up WorkOS for SSO (post-MVP)
- [ ] Implement rate limiting
- [ ] Add user profile management

## Support

If you encounter issues:

1. Check the [Supabase docs](https://supabase.com/docs/guides/auth)
2. Check the [Convex docs](https://docs.convex.dev)
3. Review middleware.ts and auth utilities
4. Check browser console and server logs
5. Open an issue in the repository

---

**Congratulations!** You now have a fully functional authentication system. 🎉

