# Development Guide

Quick reference for common development tasks.

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in your API keys (see AUTH_SETUP.md)

# Start Convex dev server (terminal 1)
npx convex dev

# Start Next.js dev server (terminal 2)
npm run dev
```

Visit http://localhost:3000

## Project Structure

```
pithy-jaunt/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup, magic-link)
│   ├── api/auth/          # Auth API routes
│   ├── auth/callback/     # OAuth callback handler
│   ├── dashboard/         # Protected dashboard
│   ├── layout.tsx         # Root layout with AuthProvider
│   └── page.tsx           # Homepage
├── components/            # React components
│   └── auth/              # Auth-specific components
├── convex/                # Convex backend
│   ├── schema.ts          # Database schema
│   └── users.ts           # User management
├── lib/                   # Utilities
│   └── auth/              # Auth utilities (clients, context, hooks)
├── middleware.ts          # Next.js middleware (auth protection)
├── openspec/              # OpenSpec documentation
│   ├── changes/           # Active change proposals
│   └── specs/             # Deployed specifications
└── docs/                  # Documentation
```

## Common Commands

### Development

```bash
# Start development servers
npm run dev                 # Next.js dev server
npx convex dev             # Convex dev server (separate terminal)

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
npm start
```

### Convex

```bash
# Deploy schema and functions
npx convex deploy

# Watch for changes
npx convex dev

# Run a query
npx convex run users:getUserByEmail '{"email":"user@example.com"}'

# View data
npx convex data
```

### Git Workflow

```bash
# Check status
git status

# Stage files
git add path/to/file

# Commit (atomic commits)
git commit -m "feat(scope): description"

# Push to remote
git push origin main
```

## OpenSpec Workflow

### Check Existing Specs

```bash
# List active changes
openspec list

# List deployed specs
openspec list --specs

# Show specific change
openspec show add-authentication
```

### Create a New Change Proposal

```bash
# 1. Create directory structure
mkdir -p openspec/changes/add-feature-name/specs/capability-name

# 2. Create proposal.md, tasks.md, design.md (if needed)
# See openspec/AGENTS.md for templates

# 3. Create spec deltas
# Use ## ADDED|MODIFIED|REMOVED|RENAMED Requirements

# 4. Validate
openspec validate add-feature-name --strict

# 5. Commit
git add openspec/changes/add-feature-name/
git commit -m "feat(openspec): add feature-name proposal"
```

### Implement a Change

Follow the tasks.md checklist:

1. Read proposal.md
2. Read design.md (if exists)
3. Implement each task sequentially
4. Update tasks.md as you complete items
5. Commit regularly

### Archive a Change

After deployment:

```bash
# Archive the change
openspec archive add-authentication --yes

# Or with spec updates
openspec archive add-feature-name

# Validate
openspec validate --strict

# Commit
git add openspec/
git commit -m "chore(openspec): archive add-authentication"
```

## Authentication Testing

### Test API Endpoints

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Get session
curl http://localhost:3000/api/auth/session \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

### Manual UI Testing

1. **Signup Flow**: /signup → Enter email/password → Dashboard
2. **Login Flow**: /login → Enter credentials → Dashboard
3. **Magic Link**: /magic-link → Enter email → Check inbox → Click link
4. **Protected Routes**: Try accessing /dashboard without login
5. **Logout**: Dashboard → Click "Sign out" → Redirected to login

## Code Style

### TypeScript

- Use interfaces over types
- Avoid enums; use maps or unions
- Use functional components
- Prefer named exports

### React

- Minimize `use client` directives
- Favor Server Components
- Use Suspense for loading states
- Keep components small and focused

### Naming

- Directories: `kebab-case`
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

## Debugging

### View Logs

```bash
# Next.js logs
# Shown in terminal running `npm run dev`

# Convex logs
# Shown in terminal running `npx convex dev`

# Browser console
# Open DevTools → Console
```

### Common Issues

**Authentication not working?**
- Check `.env.local` has correct values
- Restart dev servers after env changes
- Clear browser cookies
- Check Supabase dashboard for errors

**Convex not syncing?**
- Ensure `npx convex dev` is running
- Check Convex dashboard → Logs
- Verify schema is deployed
- Check user permissions

**Type errors?**
- Run `npm run type-check`
- Regenerate Convex types: `npx convex codegen`
- Check imports are correct

## Deployment

### Vercel (Recommended for Web)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

Set environment variables in Vercel dashboard:
- All `NEXT_PUBLIC_*` variables
- Supabase service role key
- Convex deployment URL

### Convex Production

```bash
# Deploy to production
npx convex deploy --prod

# Update environment variables with prod values
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OpenSpec Guide](../openspec/AGENTS.md)

## Quick Links

- **Local App**: http://localhost:3000
- **Convex Dashboard**: https://dashboard.convex.dev
- **Supabase Dashboard**: https://app.supabase.com
- **Repository**: https://github.com/jakebutler/pithy-jaunt

## Getting Help

1. Check this guide first
2. Review `docs/AUTH_SETUP.md` for auth issues
3. Check `openspec/project.md` for conventions
4. Search existing issues on GitHub
5. Open a new issue with details

---

Happy coding! 🚀

