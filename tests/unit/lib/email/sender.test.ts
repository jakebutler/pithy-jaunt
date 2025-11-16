import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Resend client before importing sender
const mockSend = vi.fn();
const mockGetResendClient = vi.fn();
const mockIsResendConfigured = vi.fn(() => true);

vi.mock('@/lib/email/resend-client', () => ({
  getResendClient: () => mockGetResendClient(),
  isResendConfigured: () => mockIsResendConfigured(),
}));

// Import after mocks are set up
import { sendCodeRabbitNotInstalledEmail } from '@/lib/email/sender';

// Mock Resend module
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn(),
      },
    })),
  };
});

describe('Email Sender', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsResendConfigured.mockReturnValue(true);
    mockGetResendClient.mockReturnValue({
      emails: {
        send: mockSend,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sendCodeRabbitNotInstalledEmail', () => {
    it('should send email successfully', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      const result = await sendCodeRabbitNotInstalledEmail({
        to: 'user@example.com',
        repoName: 'my-repo',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: expect.stringContaining('code review buddy'),
        })
      );
    });

    it('should include repo name in email', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await sendCodeRabbitNotInstalledEmail({
        to: 'user@example.com',
        repoName: 'awesome-repo',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('awesome-repo');
      expect(callArgs.text).toContain('awesome-repo');
    });

    it('should include user name when provided', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await sendCodeRabbitNotInstalledEmail({
        to: 'user@example.com',
        repoName: 'my-repo',
        userName: 'John Doe',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('Hey John Doe!');
      expect(callArgs.text).toContain('Hey John Doe!');
    });

    it('should handle Resend API errors', async () => {
      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'API error' },
      });

      const result = await sendCodeRabbitNotInstalledEmail({
        to: 'user@example.com',
        repoName: 'my-repo',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });

    it('should handle network errors', async () => {
      mockSend.mockRejectedValue(new Error('Network error'));

      const result = await sendCodeRabbitNotInstalledEmail({
        to: 'user@example.com',
        repoName: 'my-repo',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should reject invalid email addresses', async () => {
      const result = await sendCodeRabbitNotInstalledEmail({
        to: 'invalid-email',
        repoName: 'my-repo',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should use custom from address when provided', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await sendCodeRabbitNotInstalledEmail({
        to: 'user@example.com',
        repoName: 'my-repo',
        from: 'custom@example.com',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toBe('custom@example.com');
    });

    it('should use default from address when not provided', async () => {
      mockSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      });

      await sendCodeRabbitNotInstalledEmail({
        to: 'user@example.com',
        repoName: 'my-repo',
      });

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.from).toContain('Pithy Jaunt');
    });
  });
});

