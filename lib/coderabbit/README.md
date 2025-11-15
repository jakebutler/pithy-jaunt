# CodeRabbit Integration

## Note on CodeRabbit Architecture

Based on the [CodeRabbit documentation](https://docs.coderabbit.ai/overview/introduction), CodeRabbit primarily works as a GitHub App that:
- Automatically reviews pull requests
- Provides analysis through PR comments
- Uses configuration via `.coderabbit.yaml` files

For Pithy Jaunt's use case (analyzing repositories to generate tasks), we need to:

1. **Research CodeRabbit API**: Check if CodeRabbit provides an API for repository analysis outside of PR reviews
2. **Alternative Approach**: If no direct API exists, we may need to:
   - Create a PR with minimal changes to trigger CodeRabbit review
   - Parse CodeRabbit's PR comments for analysis
   - Or use CodeRabbit's analysis results from existing PRs

## Implementation Status

- [ ] Research CodeRabbit API for repository analysis
- [ ] Determine integration approach (API vs. PR-based)
- [ ] Implement analysis trigger
- [ ] Implement webhook handler for results
- [ ] Parse and store analysis results

## Webhook Configuration

**MVP Decision**: Rely only on webhooks for analysis status updates (no polling).

The webhook endpoint will be publicly accessible at:
- Production: `https://your-domain.com/api/webhook/coderabbit`
- Development: Use ngrok or similar for local testing

