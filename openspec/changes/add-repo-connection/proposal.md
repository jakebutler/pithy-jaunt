# Change: Add Repository Connection System

## Why

Pithy Jaunt needs to connect to GitHub repositories to analyze code and generate tasks. This is the foundational feature that enables the entire workflow: users connect a repo → CodeRabbit analyzes it → tasks are generated → agents implement changes. Without repository connection, users cannot begin using the core functionality of Pithy Jaunt.

## What Changes

- Implement repository URL validation and connection flow
- Create API endpoint for connecting repositories (`POST /api/repo/connect`)
- Integrate with GitHub API for repository validation and cloning
- Detect CodeRabbit configuration in repositories
- Create CodeRabbit integration for repository analysis
- Store repository metadata in Convex database
- Create repository connection UI (web form)
- Implement repository list view for connected repos
- Add repository detail view with analysis results
- Handle error cases (invalid URLs, private repos, clone failures)

## Impact

- **Affected specs**: `repo-connection` (new capability)
- **Affected code**:
  - `/app/api/repo/connect/route.ts` - Repository connection endpoint
  - `/app/api/repo/[repoId]/report/route.ts` - Repository report endpoint
  - `/app/repos/page.tsx` - Repository list page
  - `/app/repos/[repoId]/page.tsx` - Repository detail page
  - `/components/repos/RepoConnectForm.tsx` - Connection form component
  - `/components/repos/RepoCard.tsx` - Repository card component
  - `/components/repos/CodeRabbitReport.tsx` - Analysis report display
  - `/lib/github/` - GitHub API utilities
  - `/lib/coderabbit/` - CodeRabbit API integration
  - `/convex/repos.ts` - Repository queries and mutations
  - Environment configuration for GitHub and CodeRabbit API keys

