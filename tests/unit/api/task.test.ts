import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as taskPOST } from '@/app/api/task/route';

// Create mock functions that will be set up in beforeEach
let mockGetSession: ReturnType<typeof vi.fn>;
let mockConvexQuery: ReturnType<typeof vi.fn>;
let mockConvexMutation: ReturnType<typeof vi.fn>;

// Mock Supabase
vi.mock('@/lib/auth/supabase-server', () => {
  const mockGetSessionFn = vi.fn();
  return {
    createClient: vi.fn(() => ({
      auth: {
        getSession: mockGetSessionFn,
      },
    })),
    __mocks: {
      getSession: mockGetSessionFn,
    },
  };
});

// Mock Convex
vi.mock('@/lib/convex/server', () => {
  const mockQueryFn = vi.fn();
  const mockMutationFn = vi.fn();
  return {
    convexClient: {
      query: mockQueryFn,
      mutation: mockMutationFn,
    },
    __mocks: {
      query: mockQueryFn,
      mutation: mockMutationFn,
    },
  };
});

describe('Task API Routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mock functions from the mocked modules
    const { createClient } = await import('@/lib/auth/supabase-server');
    const { convexClient } = await import('@/lib/convex/server');
    const client = createClient() as any;
    mockGetSession = client.auth.getSession;
    mockConvexQuery = convexClient.query;
    mockConvexMutation = convexClient.mutation;
    
    // Set up default mocks for authenticated user
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'user-123',
          },
        },
      },
    });
    mockConvexQuery.mockResolvedValue({
      _id: 'user-123',
      email: 'test@example.com',
    });
  });

  describe('POST /api/task', () => {
    it('should validate required fields', async () => {
      const request = new Request('http://localhost:3000/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await taskPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should validate repoId, title, and description are present', async () => {
      const request = new Request('http://localhost:3000/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: 'repo-123',
          // Missing title and description
        }),
      });

      const response = await taskPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });
});

