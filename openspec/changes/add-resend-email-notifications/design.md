# Design: Resend Email Notifications

## Context

Pithy Jaunt needs email notifications to keep users informed about important repository events. Resend is already listed as a planned dependency in the project documentation and is a modern, developer-friendly email service with good deliverability.

## Goals / Non-Goals

**Goals:**
- Send transactional emails via Resend API
- Notify users when CodeRabbit is not installed on connected repositories
- Provide clear, actionable email content with CTAs
- Graceful error handling (emails should not block core functionality)

**Non-Goals:**
- Email templates with complex HTML/CSS (start simple, plain text or minimal HTML)
- Email queue/retry system (Resend handles retries)
- Email preferences/unsubscribe (MVP scope)
- Multiple email types (start with CodeRabbit notification only)

## Decisions

**Decision: Use Resend SDK**
- **Rationale**: Official SDK provides type safety and better error handling than raw API calls
- **Alternatives considered**: 
  - Direct API calls - more boilerplate, less type safety
  - Nodemailer with SMTP - more complex setup, less reliable deliverability

**Decision: Send email asynchronously after repo connection**
- **Rationale**: Email sending should not block repository connection flow
- **Alternatives considered**:
  - Synchronous sending - could slow down API response
  - Background job queue - overkill for MVP

**Decision: Simple email template structure**
- **Rationale**: Start with plain text or minimal HTML for faster implementation
- **Alternatives considered**:
  - Rich HTML templates - more complex, can add later if needed

**Decision: Email content: playful but simple**
- **Rationale**: Matches Pithy Jaunt's brand personality while keeping message clear
- **Content approach**: Highlight CodeRabbit benefits, include clear CTA to sign up

## Risks / Trade-offs

**Risk: Email delivery failures**
- **Mitigation**: Log errors but don't fail repository connection. Resend provides delivery status webhooks (can add later if needed).

**Risk: Rate limits**
- **Mitigation**: Resend free tier allows 3,000 emails/month, sufficient for MVP. Monitor usage.

**Trade-off: No email queue**
- **Acceptable for MVP**: Resend handles retries internally. Can add queue later if needed.

## Migration Plan

N/A - This is a new feature, not a migration.

## Email Content

### CodeRabbit Not Installed Email

**Subject:** 🐰 Your repo is missing a code review buddy!

**Body:**

```
Hey there! 👋

We noticed you just connected {{repoName}} to Pithy Jaunt—nice choice! 🎉

Here's the thing: your repository could be even more awesome with CodeRabbit on board. Think of CodeRabbit as your friendly code review assistant that:

✨ Catches bugs before they become problems
🔒 Spots security issues you might miss
⚡ Suggests performance improvements
📚 Helps maintain code quality across your team

The best part? It's free to get started and takes just a few clicks to set up.

Ready to level up your code reviews? 👇

[Get CodeRabbit Free →](https://app.coderabbit.ai/login?free-trial)

Happy coding! 🚀

— The Pithy Jaunt Team
```

**Notes:**
- `{{repoName}}` will be replaced with the actual repository name
- CTA link points to: `https://app.coderabbit.ai/login?free-trial`
- Tone is playful but professional
- Benefits are clear and concise
- Single, prominent CTA

## Open Questions

- Should we track email delivery status? (Defer to post-MVP)
- Should we add email preferences? (Defer to post-MVP)

