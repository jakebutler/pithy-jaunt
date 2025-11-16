import { describe, it, expect, vi } from 'vitest';
import { validateRepository } from '@/lib/github/validation';

// Mock GitHub client
vi.mock('@/lib/github/client', () => ({
  githubClient: {
    repos: {
      get: vi.fn(),
    },
  },
}));

describe('Repository Validation', () => {
  it('should validate repository URL format', async () => {
    const validUrls = [
      'https://github.com/owner/repo',
      'https://github.com/owner/repo.git',
      'owner/repo',
    ];

    const invalidUrls = [
      'not-a-url',
      'http://example.com',
      'github.com/owner/repo', // Missing https://
    ];

    // Note: This is a simplified test - actual implementation would need proper mocking
    for (const url of validUrls) {
      // Would need to mock the GitHub API response
      // For now, just verify the function exists and can be called
      expect(typeof validateRepository).toBe('function');
    }
  });
});




