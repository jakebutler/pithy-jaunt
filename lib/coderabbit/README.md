# CodeRabbit Integration

## Integration Approach

Based on the [CodeRabbit documentation](https://docs.coderabbit.ai/overview/introduction), CodeRabbit works as a GitHub App that automatically reviews pull requests. Our integration approach:

### Workflow

1. **Repository Connection**: User connects a GitHub repository
2. **Daytona Workspace**: When repo is cloned in Daytona workspace:
   - Check if `.coderabbit.yaml` exists
   - If missing, add CodeRabbit configuration to the repo
   - CodeRabbit will automatically start analyzing the codebase
3. **Report Generation**: CodeRabbit generates analysis reports via PR comments/reviews
4. **Task Creation**: Parse CodeRabbit's analysis and create Pithy Jaunt tasks:
   - One or more tasks depending on the scope of work in the report
   - Extract actionable items from CodeRabbit's suggestions

### Implementation Details

- **Adding CodeRabbit**: When Daytona workspace is created, add `.coderabbit.yaml` if missing
- **Automatic Analysis**: CodeRabbit GitHub App automatically reviews code and creates PR comments
- **Report Parsing**: Parse CodeRabbit's PR comments/reviews to extract:
  - Summary of issues found
  - Suggested improvements
  - Code quality recommendations
  - Security concerns
- **Task Generation**: Convert CodeRabbit findings into Pithy Jaunt tasks

## Implementation Status

- [x] Design integration approach
- [ ] Add CodeRabbit config to Daytona workspace setup
- [ ] Implement CodeRabbit config file creation
- [ ] Parse CodeRabbit PR comments/reviews
- [ ] Create tasks from CodeRabbit analysis
- [ ] Store analysis results in Convex

## Webhook Configuration

**MVP Decision**: Rely only on webhooks for analysis status updates (no polling).

We'll listen for:
- GitHub webhooks for PR comments (CodeRabbit reviews)
- CodeRabbit-specific webhooks (if available)

The webhook endpoint will be publicly accessible at:
- Production: `https://your-domain.com/api/webhook/coderabbit`
- Development: Use ngrok or similar for local testing

