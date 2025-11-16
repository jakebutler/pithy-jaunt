# Change: Add Git Ingest Automation for Repository Connection

## Why

When users connect a repository, we need to generate a codebase digest that can be used as context for our coding agents. This digest helps agents understand the codebase structure and content, enabling them to break down complex feature requests and make more informed code changes. GitIngest.com provides a simple way to generate this digest, and we can automate this process using browser-use to interact with their web interface.

## What Changes

- Integrate browser-use library to automate GitIngest.com processing
- Automatically trigger git ingest when a repository is connected
- Download and store the git ingest output file in the repository record
- Add `gitIngestContent` field to the repos schema in Convex
- Create Python script/service to handle browser automation
- Handle errors gracefully (timeouts, network issues, etc.)
- Store git ingest content asynchronously (don't block repo connection)

## Impact

- **Affected specs**: `repo-connection` (modified capability)
- **Affected code**:
  - `/app/api/repo/connect/route.ts` - Trigger git ingest after repo creation
  - `/convex/repos.ts` - Add mutation to update git ingest content
  - `/convex/schema.ts` - Add `gitIngestContent` field to repos table
  - `/lib/gitingest/` - New directory for git ingest automation (browser-use integration)
  - Environment configuration for browser-use API key
