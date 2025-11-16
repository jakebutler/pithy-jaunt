# UI Inventory - Pithy Jaunt

Complete list of all screens, fields, and components for designer reference.

---

## Screens (Pages)

### 1. Home Page (`/`)
**Route:** `app/page.tsx`

**Fields:**
- None (static content)

**Components:**
- None (inline content)

**Content:**
- Heading: "Pithy Jaunt"
- Subheading: "Transform natural language into working pull requests"
- Button: "Get Started" (links to `/login`)
- Button: "View on GitHub" (external link)

---

### 2. Login Page (`/login`)
**Route:** `app/(auth)/login/page.tsx`

**Fields:**
- Email (text input, required, email type)
- Password (password input, required)

**Components:**
- None (inline form)

**Content:**
- Heading: "Sign in to Pithy Jaunt"
- Link: "create a new account" (to `/signup`)
- Link: "Use magic link instead" (to `/magic-link`)
- Link: "Forgot password?" (placeholder)
- Error message display (conditional)
- Submit button: "Sign in" / "Signing in..." (loading state)

---

### 3. Signup Page (`/signup`)
**Route:** `app/(auth)/signup/page.tsx`

**Fields:**
- Email (text input, required, email type)
- Password (password input, required, min 8 characters)
- Confirm Password (password input, required)

**Components:**
- None (inline form)

**Content:**
- Heading: "Create your account"
- Link: "Sign in" (to `/login`)
- Error message display (conditional)
- Password requirements list:
  - "At least 8 characters long"
- Submit button: "Create account" / "Creating account..." (loading state)

---

### 4. Magic Link Page (`/magic-link`)
**Route:** `app/(auth)/magic-link/page.tsx`

**Fields:**
- Email (text input, required, email type)

**Components:**
- None (inline form)

**Content:**
- Heading: "Sign in with magic link"
- Description: "No password needed. We'll send you a link to sign in."
- Link: "use password instead" (to `/login`)
- Error message display (conditional)
- Success message display (conditional) - "Check your email! If an account exists, we've sent you a magic link."
- Submit button: "Send magic link" / "Sending..." (loading state)
- Terms notice: "By continuing, you agree to our Terms of Service and Privacy Policy."

---

### 5. Dashboard Page (`/dashboard`)
**Route:** `app/dashboard/page.tsx`

**Fields:**
- None (display only)

**Components:**
- Navigation bar (shared across authenticated pages)
- Statistics cards (4 cards)
- Recent tasks list
- Quick actions section

**Content:**
- **Navigation:**
  - Logo/Brand: "Pithy Jaunt"
  - Links: "Repositories", "Tasks"
  - User email display
  - Sign out button

- **Statistics Cards:**
  1. Repositories card
     - Icon (SVG)
     - Label: "Repositories"
     - Value: Total count
  2. Total Tasks card
     - Icon (SVG)
     - Label: "Total Tasks"
     - Value: Total count
  3. Running Tasks card
     - Icon (SVG, blue)
     - Label: "Running"
     - Value: Running count
  4. Completed Tasks card
     - Icon (SVG, green)
     - Label: "Completed"
     - Value: Completed count

- **Recent Tasks Section:**
  - Heading: "Recent Tasks"
  - Link: "View all" (to `/tasks`)
  - Task list items (up to 5):
    - Task title
    - Created timestamp
    - Status badge (colored)
  - Empty state: "No tasks yet. Create a task to get started."

- **Quick Actions Section:**
  - Heading: "Quick Actions"
  - Button: "Connect Repository" (to `/repos`)
  - Button: "Create Task" (conditional, to first repo's task creation)
  - Button: "View All Tasks" (to `/tasks`)

---

### 6. Repositories List Page (`/repos`)
**Route:** `app/repos/page.tsx`

**Fields:**
- Repository URL (text input, in RepoConnectForm)
- Branch (text input, optional, in RepoConnectForm)

**Components:**
- `RepoConnectForm` (see Components section)
- `RepoCard` (see Components section)
- Navigation bar

**Content:**
- **Navigation:** (same as Dashboard)
- **Page Header:**
  - Heading: "Repositories"
  - Description: "Connect GitHub repositories to analyze code and generate tasks"

- **Connect Repository Form Section:**
  - Heading: "Connect a Repository"
  - `RepoConnectForm` component

- **Repository List Section:**
  - Heading: "Connected Repositories ({count})"
  - Grid of `RepoCard` components (1-3 columns responsive)
  - Empty state:
    - Icon (SVG)
    - Heading: "No repositories connected"
    - Description: "Get started by connecting your first repository above"

---

### 7. Repository Detail Page (`/repos/[repoId]`)
**Route:** `app/repos/[repoId]/page.tsx`

**Fields:**
- None (display only)

**Components:**
- `CodeRabbitReport` (see Components section)
- Navigation bar with breadcrumbs

**Content:**
- **Navigation:**
  - Breadcrumbs: "Pithy Jaunt / Repositories / {owner}/{name}"
  - Links: "Back to Repositories"
  - User email
  - Sign out button

- **Repository Header:**
  - Title: "{owner}/{name}"
  - Repository URL (link)
  - Branch display
  - CodeRabbit configured indicator (conditional)

- **CodeRabbit Analysis Section:**
  - Heading: "CodeRabbit Analysis"
  - `CodeRabbitReport` component

- **Tasks Section:**
  - Heading: "Tasks ({count})"
  - Button: "Create Task" (to `/repos/[repoId]/tasks/new`)
  - Task list items:
    - Task title
    - Task description (truncated)
    - Status badge
    - Priority badge
    - CodeRabbit indicator (conditional)
    - "View PR" link (conditional)
  - Empty state: "No tasks yet. Create one to get started."

---

### 8. Create Task Page (`/repos/[repoId]/tasks/new`)
**Route:** `app/repos/[repoId]/tasks/new/page.tsx`

**Fields:**
- Title (text input, in TaskCreateForm)
- Description (textarea, in TaskCreateForm)
- Priority (select dropdown, in TaskCreateForm)

**Components:**
- `TaskCreateForm` (see Components section)
- Navigation bar with breadcrumbs

**Content:**
- **Navigation:**
  - Breadcrumbs: "Pithy Jaunt / Repositories / {owner}/{name} / New Task"
  - Link: "Cancel" (back to repo detail)
  - User email
  - Sign out button

- **Page Header:**
  - Heading: "Create New Task"
  - Description: "Create a task for {owner}/{name}"

- **Form Section:**
  - `TaskCreateForm` component

---

### 9. Tasks List Page (`/tasks`)
**Route:** `app/tasks/page.tsx`

**Fields:**
- None (display only)

**Components:**
- `TaskCard` (see Components section)
- Navigation bar

**Content:**
- **Navigation:** (same as Dashboard)
- **Page Header:**
  - Heading: "Tasks"
  - Description: "View and manage your tasks"

- **Task List:**
  - Grid of `TaskCard` components (1-3 columns responsive)
  - Empty state:
    - Icon (SVG)
    - Heading: "No tasks yet"
    - Description: "Tasks will appear here when you create them or when CodeRabbit generates suggestions"
    - Button: "Connect a Repository" (to `/repos`)

---

### 10. Task Detail Page (`/tasks/[taskId]`)
**Route:** `app/tasks/[taskId]/page.tsx`

**Fields:**
- None (display only, action buttons trigger forms)

**Components:**
- `TaskLogs` (see Components section)
- `WorkspaceStatus` (see Components section)
- Navigation bar with breadcrumbs

**Content:**
- **Navigation:**
  - Breadcrumbs: "Pithy Jaunt / Tasks / {task title}"
  - Link: "Back to Tasks"
  - User email
  - Sign out button

- **Task Header:**
  - Title: Task title
  - Status badge (colored)
  - Priority display
  - CodeRabbit indicator (conditional)
  - Repository link: "Repository: {owner}/{name}"
  - Description section with full task description

- **Task Actions Section:**
  - Heading: "Actions"
  - Button: "Execute Task" (conditional, if status is "queued")
  - Button: "Cancel Task" (conditional, if status is "queued" or "running")
  - Button: "Approve & Merge PR" (conditional, if status is "completed" and PR exists)
  - Link: "View PR" (conditional, if PR exists)

- **Workspace Section:** (conditional, if workspace assigned)
  - Heading: "Workspace"
  - Workspace ID (monospace)
  - `WorkspaceStatus` component

- **Execution Logs Section:** (conditional, if task is running/completed/failed)
  - `TaskLogs` component

- **Task Details Section:**
  - Heading: "Details"
  - Grid of detail items:
    - Status
    - Priority
    - Created (timestamp)
    - Last Updated (timestamp)
    - Branch (conditional, monospace)
    - Model (conditional, format: "{provider}/{model}")

---

## Reusable Components

### 1. RepoConnectForm
**File:** `components/repos/RepoConnectForm.tsx`

**Props:**
- `onSuccess?: (repoId: string) => void`

**Fields:**
- Repository URL (text input, required)
  - Placeholder: "https://github.com/owner/repo or owner/repo"
  - Help text: "Enter a public GitHub repository URL"
- Branch (text input, optional)
  - Placeholder: "main"
  - Help text: "Leave empty to use the repository's default branch"

**Content:**
- Error message display (conditional)
- Submit button: "Connect Repository" / "Connecting..." (loading state)

---

### 2. RepoCard
**File:** `components/repos/RepoCard.tsx`

**Props:**
- `id: string`
- `name: string`
- `owner: string`
- `url: string`
- `status: "pending" | "analyzing" | "completed" | "failed"`
- `lastAnalyzedAt?: number`
- `coderabbitDetected: boolean`

**Content:**
- Repository name: "{owner}/{name}"
- Status badge (colored):
  - Pending (gray)
  - Analyzing (blue)
  - Completed (green)
  - Failed (red)
- Repository URL (link)
- Last analyzed timestamp
- CodeRabbit configured indicator (conditional, green)
- Arrow icon (right side)

**Behavior:**
- Clickable card (links to `/repos/{id}`)

---

### 3. CodeRabbitReport
**File:** `components/repos/CodeRabbitReport.tsx`

**Props:**
- `status: "pending" | "analyzing" | "completed" | "failed"`
- `report?: { summary?: string, tasks?: Array<{ id, title, description, priority? }> }`
- `onCreateTask?: (taskId: string) => void`

**Content:**
- **Pending State:**
  - Message: "Analysis not yet started"

- **Analyzing State:**
  - Spinner icon
  - Heading: "Analysis in progress"
  - Description: "CodeRabbit is analyzing your repository. This may take a few minutes."
  - Note: "MVP: Webhook-only approach - results will appear automatically when complete"

- **Failed State:**
  - Heading: "Analysis failed"
  - Description: "CodeRabbit analysis encountered an error. Please try again later."

- **Completed State (with report):**
  - **Analysis Summary Section:** (if summary exists)
    - Heading: "Analysis Summary"
    - Summary text (whitespace preserved)
  - **Suggested Tasks Section:** (if tasks exist)
    - Heading: "Suggested Tasks ({count})"
    - Task items:
      - Task title
      - Task description
      - Priority badge (conditional)
      - Button: "Create Task" (conditional, if onCreateTask provided)
  - **Empty State:** (if no summary and no tasks)
    - Message: "No analysis results available"

---

### 4. TaskCard
**File:** `components/tasks/TaskCard.tsx`

**Props:**
- `taskId: string`
- `title: string`
- `description: string`
- `status: "queued" | "running" | "completed" | "failed" | "needs_review" | "cancelled"`
- `priority: "low" | "normal" | "high"`
- `initiator: "user" | "coderabbit"`
- `prUrl?: string`
- `createdAt: number`

**Content:**
- Task title
- Status badge (colored):
  - Queued (gray)
  - Running (blue)
  - Completed (green)
  - Failed (red)
  - Needs Review (yellow)
  - Cancelled (gray)
- Priority badge (colored):
  - Low (gray)
  - Normal (blue)
  - High (red)
- Task description (truncated to 2 lines)
- Created timestamp
- CodeRabbit indicator (conditional, purple)
- "View PR" link (conditional)
- Arrow icon (right side)

**Behavior:**
- Clickable card (links to `/tasks/{taskId}`)

---

### 5. TaskCreateForm
**File:** `components/tasks/TaskCreateForm.tsx`

**Props:**
- `repoId: string`
- `repoName: string`
- `onSuccess?: (taskId: string) => void`
- `initialData?: { title?: string, description?: string }`

**Fields:**
- Repository name display (read-only)
- Title (text input, required)
  - Placeholder: "e.g., Add /health endpoint"
- Description (textarea, required, 4 rows)
  - Placeholder: "Describe what needs to be done..."
- Priority (select dropdown)
  - Options: "Low", "Normal", "High"
  - Default: "Normal"

**Content:**
- Error message display (conditional)
- Submit button: "Create Task" / "Creating..." (loading state)

---

### 6. TaskLogs
**File:** `components/tasks/TaskLogs.tsx`

**Props:**
- `taskId: string`

**Content:**
- **Header:**
  - Heading: "Execution Logs"
  - Connection status indicator:
    - Connected (green dot, animated pulse)
    - Disconnected (gray dot)
- **Error Banner:** (conditional)
  - Warning message: "Connection lost. Attempting to reconnect..."
- **Log Display:**
  - Terminal-style display (dark background, green text)
  - Auto-scrolling
  - Log event types:
    - Info (green)
    - LLM Request (blue) - shows provider/model/duration
    - Patch (green) - shows diff
    - PR Created (green) - shows URL
    - Error (red)
  - Timestamp for each log entry
  - Empty state: "Waiting for logs..."

**Behavior:**
- Real-time updates via Server-Sent Events
- Auto-scrolls to bottom on new logs

---

### 7. WorkspaceStatus
**File:** `components/tasks/WorkspaceStatus.tsx`

**Props:**
- `status: "creating" | "running" | "stopped" | "terminated"`
- `uptimeMs?: number`
- `lastUsedAt?: number`

**Content:**
- Status badge (colored):
  - Creating (blue, animated pulse)
  - Running (green, animated pulse)
  - Stopped (gray)
  - Terminated (red)
- Uptime display (conditional, if running and uptime provided)
  - Format: "{hours}h {minutes}m" or "{minutes}m {seconds}s"
- Last used timestamp (conditional)
  - Format: "Just now", "{minutes}m ago", or full date

---

### 8. AuthButton
**File:** `components/auth/AuthButton.tsx`

**Props:**
- None (uses auth context)

**Content:**
- **Loading State:**
  - Placeholder skeleton
- **Authenticated State:**
  - Button: "Sign out"
- **Unauthenticated State:**
  - Link: "Sign in" (to `/login`)

---

### 9. ProtectedRoute
**File:** `components/auth/ProtectedRoute.tsx`

**Props:**
- `children: React.ReactNode`
- `redirectTo?: string` (default: "/login")

**Content:**
- **Loading State:**
  - Spinner
- **Unauthenticated State:**
  - Nothing (redirects)
- **Authenticated State:**
  - Renders children

**Behavior:**
- Wrapper component for route protection
- Redirects to login if not authenticated

---

## Shared Navigation Bar

**Used on:** Dashboard, Repositories List, Repository Detail, Create Task, Tasks List, Task Detail

**Content:**
- Logo/Brand: "Pithy Jaunt" (links to `/dashboard`)
- Navigation links (context-dependent)
- Breadcrumbs (on detail pages)
- User email display
- Sign out button (form POST to `/api/auth/logout`)

---

## Status Badge Colors

### Task Status:
- `queued`: Gray (bg-gray-100, text-gray-800)
- `running`: Blue (bg-blue-100, text-blue-800)
- `completed`: Green (bg-green-100, text-green-800)
- `failed`: Red (bg-red-100, text-red-800)
- `needs_review`: Yellow (bg-yellow-100, text-yellow-800)
- `cancelled`: Gray (bg-gray-100, text-gray-800)

### Repository Analysis Status:
- `pending`: Gray (bg-gray-100, text-gray-800)
- `analyzing`: Blue (bg-blue-100, text-blue-800)
- `completed`: Green (bg-green-100, text-green-800)
- `failed`: Red (bg-red-100, text-red-800)

### Priority:
- `low`: Gray (bg-gray-100, text-gray-600)
- `normal`: Blue (bg-blue-100, text-blue-800)
- `high`: Red (bg-red-100, text-red-800)

### Workspace Status:
- `creating`: Blue (bg-blue-100, text-blue-800) with pulse
- `running`: Green (bg-green-100, text-green-800) with pulse
- `stopped`: Gray (bg-gray-100, text-gray-800)
- `terminated`: Red (bg-red-100, text-red-800)

---

## Color Palette (Tailwind Classes)

- **Primary Blue:** `blue-600`, `blue-700`, `blue-500`
- **Success Green:** `green-600`, `green-700`, `green-500`, `green-100`, `green-800`
- **Error Red:** `red-600`, `red-700`, `red-500`, `red-100`, `red-800`
- **Warning Yellow:** `yellow-100`, `yellow-800`
- **Neutral Gray:** `gray-50`, `gray-100`, `gray-200`, `gray-300`, `gray-400`, `gray-500`, `gray-600`, `gray-700`, `gray-800`, `gray-900`
- **Purple (CodeRabbit):** `purple-600`
- **Background:** `bg-gray-50` (page background), `bg-white` (card background)

---

## Typography

- **Headings:**
  - H1: `text-3xl font-bold text-gray-900`
  - H2: `text-2xl font-bold text-gray-900` or `text-xl font-semibold text-gray-900`
  - H3: `text-lg font-semibold text-gray-900` or `text-lg font-medium text-gray-900`
- **Body:** `text-sm text-gray-600` or `text-gray-700`
- **Labels:** `text-sm font-medium text-gray-700`
- **Small Text:** `text-xs text-gray-500`
- **Monospace:** `font-mono` (for IDs, branches, code)

---

## Form Elements

- **Text Input:** `px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`
- **Textarea:** Same as text input, with `rows={4}`
- **Select:** Same as text input
- **Button Primary:** `px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500`
- **Button Secondary:** `px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50`
- **Button Disabled:** `disabled:opacity-50 disabled:cursor-not-allowed`

---

## Layout Patterns

- **Page Container:** `min-h-screen bg-gray-50`
- **Content Container:** `max-w-7xl mx-auto py-6 sm:px-6 lg:px-8`
- **Card:** `bg-white border border-gray-200 rounded-lg p-6`
- **Grid:** `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
- **Spacing:** Consistent use of `mb-4`, `mb-6`, `mb-8` for sections




