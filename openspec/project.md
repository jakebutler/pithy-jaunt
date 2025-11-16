# Project Context

## Purpose

Pithy Jaunt is a mobile-first and web-enabled Agent-DevOps autopilot that turns natural language tasks into working pull requests. Users connect a public GitHub repo, request a feature or bug fix via mobile or web (typed or voice), and Pithy Jaunt:

1. Analyzes the repo using CodeRabbit
2. Creates Daytona workspaces to execute tasks using LLM-driven agents
3. Captures UI screenshots and tests with Browser Use
4. Creates PRs with screenshots and test results
5. Notifies users for approval and optionally merges

The hackathon MVP focuses on: repo connect → CodeRabbit analysis → Daytona execution → implement change → PR → notify user.

## Tech Stack

- **Frontend (Web)**: Next.js 15 (App Router), Tailwind CSS, ShadCN UI, Radix UI
  - Hosted on Vercel (production only for MVP)
  - Base URL: Vercel-provided URL
- **Frontend (Mobile)**: React Native (Expo managed workflow)
  - Built via Rork rapid prototyping
  - Target platforms: iOS (priority), Android
  - Minimum versions: TBD based on Expo SDK requirements
- **Backend**: Convex (serverless functions & realtime)
  - API versioning: Include version prefix for mobile compatibility (e.g., `/api/v1/`)
  - No rate limiting for MVP
- **Auth**: Supabase Auth (email/password, magic link), future WorkOS for SSO
- **CI/Environments**: Daytona for ephemeral execution environments
- **Repo Analysis**: CodeRabbit API
- **UI Testing**: Browser Use
- **Observability**: Galileo (traces & metrics)
- **LLM Providers**: OpenAI, Anthropic (injectable via .env, switchable per-request)
- **Notifications**: Resend (email) + Expo push notifications (mobile)

## Project Conventions

### Code Style

**TypeScript and Structure:**
- Write concise, technical TypeScript code with accurate examples
- Use TypeScript for all code; prefer interfaces over types
- Avoid enums; use maps instead
- Use functional components with TypeScript interfaces
- Functional and declarative programming patterns; avoid classes
- Prefer iteration and modularization over code duplication
- Use descriptive variable names with auxiliary verbs (isLoading, hasError)
- Structure files: exported component, subcomponents, helpers, static content, types

**Naming Conventions:**
- Use lowercase with dashes for directories (e.g., components/auth-wizard)
- Favor named exports for components

**Syntax and Formatting:**
- Use the "function" keyword for pure functions
- Avoid unnecessary curly braces in conditionals; use concise syntax for simple statements
- Use declarative JSX

**UI and Styling:**
- Use ShadCN UI, Radix, and Tailwind for components and styling
- Implement responsive design with Tailwind CSS; use a mobile-first approach
- Keep components small and composable
- Use atomic ShadCN primitives for forms, modals, toasts
- Reuse components across web & mobile with platform-specific renderers when needed

### Architecture Patterns

**Frontend Architecture:**
- Mobile-first design with web parity
- Minimize 'use client', 'useEffect', and 'setState'; favor React Server Components (RSC)
- Limit 'use client' to:
  - Web API access in small components only
  - Never for data fetching or state management
  - Favor server components and Next.js SSR
- Wrap client components in Suspense with fallback
- Use dynamic loading for non-critical components
- Use 'nuqs' for URL search parameter state management
- Optimize Web Vitals (LCP, CLS, FID)
- Optimize images: use WebP format, include size data, implement lazy loading
- Follow Next.js docs for Data Fetching, Rendering, and Routing

**Backend Architecture:**
- Serverless backend with Convex for realtime data
- Event-driven: SSE for log streaming, webhooks for CodeRabbit/GitHub events
- Ephemeral execution: Daytona workspaces (25min default, optional 15min extension)

**Complexity Guidelines:**
- Default to <100 lines of new code
- Single-file implementations until proven insufficient
- Choose boring, proven patterns over frameworks without clear justification
- Only add complexity with:
  - Performance data showing current solution too slow
  - Concrete scale requirements (>1000 users, >100MB data)
  - Multiple proven use cases requiring abstraction
- Architecture for moderate scale from day 1 (10 concurrent users MVP, ~100 workspaces)

**API Design:**
- Version prefix for mobile compatibility: `/api/v1/` for all endpoints
- Base URL: Vercel-provided (e.g., `https://pithy-jaunt.vercel.app/api/v1/`)
- No rate limiting for MVP
- Consistent JSON response format across all endpoints
- RESTful conventions where applicable

### Testing Strategy

**Automated Testing:**
- **E2E Tests**: Playwright for end-to-end browser testing of critical user flows
- **Unit Tests**: Vitest for unit and integration testing of API routes and utilities
- **Smoke Test Suite**: Covers critical paths (authentication, repository connection, task creation)
- **Test Coverage Goals**: 
  - MVP: Smoke tests for all critical user flows
  - Future: Expand to cover edge cases and error scenarios
- Browser Use for automated UI testing and screenshot capture (agent execution)
- Agents must ensure linting passes before creating PRs
- Prefer small, well-tested changes
- Tests run automatically on PRs via GitHub Actions
- See `docs/TESTING.md` for detailed testing guide

**Observability:**
- Galileo tracing for observability across the entire flow
- Instrument key flow points: repo.connect, task.create, task.execute, pr.create
- SSE log streaming for real-time execution feedback
- Log levels: info, warn, error, debug (best practices for MVP)

**Error Handling:**
- Follow best practices without over-engineering for MVP
- Error response format: consistent JSON structure (to be defined)
- User-facing vs. internal error logging: TBD during implementation

**Quality Gates:**
- If patch fails to apply, mark task as needs_review
- Agents should ask clarifying questions rather than guess on ambiguous specs
- Unified diff patches must apply cleanly with git apply

**Accessibility:**
- WCAG AA compliance required from day 1
- Test with screen readers and keyboard navigation
- Semantic HTML and proper ARIA labels

### Git Workflow

**Branch Strategy:**
- Automated branches: `pj/<taskId>` format
- PR title format: `"Pithy Jaunt: <taskTitle>"`
- Manual development: feature branches as appropriate

**Commit Conventions:**
- Keep commits atomic: commit only touched files, list paths explicitly
- Never amend commits without explicit approval
- For tracked files: `git commit -m "<scoped message>" -- path/to/file1 path/to/file2`
- For new files: `git restore --staged :/ && git add "path/to/file1" && git commit -m "<message>" -- path/to/file1`
- Always double-check `git status` before any commit
- Quote paths containing brackets or parentheses to avoid shell interpretation

**Git Operations:**
- When running `git rebase`, export `GIT_EDITOR=:` and `GIT_SEQUENCE_EDITOR=:` (or pass --no-edit)
- NEVER run destructive operations (reset --hard, force push to main/master) without explicit written approval
- Never use `git restore` to revert files authored by others—coordinate first
- Moving/renaming files is allowed; deleting others' in-progress work requires coordination

**Patch Management:**
- Patch format: unified diff output from agents
- Apply patches via `git apply`
- Failed patches → mark task as `needs_review`

## Domain Context

**Agent Behavior:**
- Pithy Jaunt acts as a "senior full-stack engineer" agent
- Agents have access to: task description, cloned repo, CodeRabbit analysis, testing commands
- Goal: produce minimal, safe, idiomatic code changes with tests
- Agents should ask clarifying questions rather than guess on ambiguous specs
- System prompt stored in `daytona/system-prompt.md`

**LLM Provider Configuration:**
- OpenAI: use `temperature=0.0` for deterministic edits where possible
- Anthropic: favor concise stepwise reasoning prompts, limit chain-of-thought
- Provider and model switchable per-request via task configuration

**Execution Flow:**
1. User connects repo → CodeRabbit analysis
2. User creates task (voice/text) → task queued
3. Task execution → Daytona workspace provisioned
4. Agent clones repo → creates branch → generates patch
5. Patch applied → tests run → Browser Use captures screenshots
6. PR created with screenshots → user notified
7. User approves → PR merges → workspace terminates

**Data Models:**
- **Repo**: `{ id, url, owner, name, analyzerStatus, lastAnalyzedAt }`
- **Task**: `{ id, repoId, title, description, status, createdAt, modelPreference, assignedWorkspaceId, prUrl }`
- **Workspace**: `{ id, template, status, createdAt, assignedTasks[] }`

## Important Constraints

**MVP Scope:**
- Public repositories only (no private repo support in hackathon MVP)
- Read-only repo access for analysis
- GitHub token with `repo:public_repo` scope for PR creation
- Production environment only (no staging for MVP)
- English-only interface
- WCAG AA accessibility compliance from day 1

**Workspace Limitations:**
- Default lifetime: 25 minutes
- Maximum extension: 15 minutes with `keepAlive` flag
- Automatic termination after completion unless `keepAlive` specified
- Automatic cleanup of old workspaces
- Max concurrent workspaces: ~100 (configurable)
- Max concurrent users for MVP: 10

**Data Retention:**
- Task logs retained for configurable duration (short term for MVP)
- Log retention period managed via environment variable
- Workspace cleanup runs automatically
- No long-term data retention requirements for hackathon scope

**Security Policies:**
- Never edit `.env` or environment variable files—user-managed only
- All API keys injectable via environment variables
- No hardcoded credentials in codebase
- Supabase Auth for MVP; WorkOS SSO planned for post-hackathon
- No GDPR/privacy considerations for hackathon scope

**Development Constraints:**
- Hackathon timeline: prioritize core flow over polish features
- Voice-to-task: stub implementation for demo
- Multi-task workspace reuse: nice-to-have, not MVP-critical
- Architecture for moderate scale from day 1

## External Dependencies

**Required Services:**
- **GitHub API**: repo cloning, PR creation, webhooks (future)
  - Required scope: `repo:public_repo`
  - Rate limits: standard GitHub API limits apply
- **CodeRabbit API**: repo analysis and task suggestion generation
  - Async webhook callbacks for analysis results
- **Daytona API**: workspace creation, management, and termination
  - Template: `pithy-jaunt-dev`
  - Dockerfile and execution scripts in `/daytona` directory
- **OpenAI API**: GPT-4o for code generation (primary)
  - Configurable via `MODEL_PROVIDER=openai` and `MODEL_NAME=gpt-4o`
- **Anthropic API**: Claude for code generation (alternative)
  - Configurable via `MODEL_PROVIDER=anthropic`
- **Supabase**: authentication, session management
  - Email/password and magic link flows
- **Galileo**: observability, tracing, and metrics
  - Instrument all major flow points
- **Resend**: email notifications for PR creation and approval
- **Browser Use**: UI testing and screenshot capture
  - Config file: `.browseruse.yml` in target repos
  - Screenshots saved to `/tmp/screens` in workspace
- **Expo**: mobile push notifications
  - Push tokens managed per-user device

**API Keys Required (.env):**
```
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
GITHUB_TOKEN=
DAYTONA_API_KEY=
GALILEO_API_KEY=
CODERABBIT_API_KEY=
RESEND_API_KEY=
MODEL_PROVIDER=openai
MODEL_NAME=gpt-4o

# Data retention & cleanup
LOG_RETENTION_DAYS=7
WORKSPACE_CLEANUP_ENABLED=true
WORKSPACE_MAX_CONCURRENT=100

# Scale constraints
MAX_CONCURRENT_USERS=10
```
