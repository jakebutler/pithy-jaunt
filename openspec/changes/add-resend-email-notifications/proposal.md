# Change: Add Resend Email Notifications

## Why

Currently, Pithy Jaunt has no email notification system. Users miss important updates about their repositories, such as when CodeRabbit is not installed. Email notifications will improve user engagement and help users take action on important repository setup steps.

The first use case is to notify users when they connect a repository that doesn't have CodeRabbit installed, encouraging them to set it up for better code analysis.

## What Changes

- **ADDED**: Resend integration for sending transactional emails
- **ADDED**: Email notification when CodeRabbit is not detected on a connected repository
- **ADDED**: Email template with CodeRabbit benefits and CTA to sign up
- **ADDED**: Email service utility functions for sending emails via Resend API

## Impact

- Affected specs: New `email-notifications` capability
- Affected code:
  - `app/api/repo/connect/route.ts` - Trigger email when CodeRabbit not detected
  - New `lib/email/` directory - Resend client and email templates
  - `package.json` - Add `resend` dependency
  - Environment variables - `RESEND_API_KEY` (already in env.example)


