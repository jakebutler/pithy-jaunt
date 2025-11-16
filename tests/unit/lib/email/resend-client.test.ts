import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Resend module before importing the module under test
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      constructor(apiKey: string) {
        // Store API key for testing
        this.apiKey = apiKey;
      }
      apiKey: string;
      emails = {
        send: vi.fn(),
      };
    },
  };
});

describe('Resend Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the module cache to reset singleton
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('isResendConfigured', () => {
    it('should return true when RESEND_API_KEY is set', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      const { isResendConfigured } = await import('@/lib/email/resend-client');
      expect(isResendConfigured()).toBe(true);
    });

    it('should return false when RESEND_API_KEY is not set', async () => {
      delete process.env.RESEND_API_KEY;
      const { isResendConfigured } = await import('@/lib/email/resend-client');
      expect(isResendConfigured()).toBe(false);
    });

    it('should return false when RESEND_API_KEY is empty', async () => {
      process.env.RESEND_API_KEY = '';
      const { isResendConfigured } = await import('@/lib/email/resend-client');
      expect(isResendConfigured()).toBe(false);
    });
  });

  describe('getResendClient', () => {
    it('should create Resend client when API key is set', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      const { getResendClient } = await import('@/lib/email/resend-client');
      const client = getResendClient();
      expect(client).not.toBeNull();
    });

    it('should return null when API key is not set', async () => {
      delete process.env.RESEND_API_KEY;
      const { getResendClient } = await import('@/lib/email/resend-client');
      const client = getResendClient();
      expect(client).toBeNull();
    });

    it('should return same client instance on subsequent calls (singleton)', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      const { getResendClient } = await import('@/lib/email/resend-client');
      const client1 = getResendClient();
      const client2 = getResendClient();
      expect(client1).toBe(client2);
    });
  });
});

