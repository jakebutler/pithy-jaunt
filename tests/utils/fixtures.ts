/**
 * Test data fixtures for creating test entities
 */

export interface TestRepository {
  url: string;
  owner: string;
  name: string;
  branch: string;
}

/**
 * Get a test repository URL (using a known public repo for testing)
 */
export function getTestRepository(): TestRepository {
  // Using a well-known public repository for testing
  // In a real scenario, you might want to use a dedicated test repository
  return {
    url: 'https://github.com/vercel/next.js',
    owner: 'vercel',
    name: 'next.js',
    branch: 'canary',
  };
}

/**
 * Generate a test task
 */
export function generateTestTask() {
  return {
    title: `Test Task ${Date.now()}`,
    description: 'This is a test task created by automated tests',
    priority: 'normal' as const,
  };
}

/**
 * Generate a test repository URL (for testing invalid URLs)
 */
export function generateInvalidRepositoryUrl(): string {
  return 'not-a-valid-repo-url';
}

/**
 * Generate a non-existent repository URL
 */
export function generateNonExistentRepositoryUrl(): string {
  const random = Math.random().toString(36).substring(2, 15);
  return `https://github.com/test-user-${random}/non-existent-repo-${Date.now()}`;
}




