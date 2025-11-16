## 1. Setup
- [x] 1.1 Install `resend` package
- [x] 1.2 Create `lib/email/resend-client.ts` with Resend client initialization
- [x] 1.3 Add environment variable validation for `RESEND_API_KEY`

## 2. Email Service
- [x] 2.1 Create `lib/email/templates.ts` with email template functions
- [x] 2.2 Create `lib/email/sender.ts` with email sending utilities
- [x] 2.3 Implement `sendCodeRabbitNotInstalledEmail()` function

## 3. CodeRabbit Detection Email
- [x] 3.1 Update `app/api/repo/connect/route.ts` to send email when `coderabbitDetected === false`
- [x] 3.2 Fetch user email from Supabase session
- [x] 3.3 Call email service after repository connection succeeds
- [x] 3.4 Handle email sending errors gracefully (log but don't fail repo connection)

## 4. Testing
- [x] 4.1 Unit tests for email template generation
- [x] 4.2 Unit tests for email sending function
- [x] 4.3 Unit tests for Resend client initialization
- [ ] 4.4 Integration test for repo connection with email trigger (deferred - can be added later)
- [ ] 4.5 Test email rendering in development environment (manual testing)

