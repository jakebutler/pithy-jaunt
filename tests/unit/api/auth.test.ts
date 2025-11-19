import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST as signupPOST } from '@/app/api/auth/signup/route';
import { POST as loginPOST } from '@/app/api/auth/login/route';

// Set up environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Create mock functions that will be set up in beforeEach
let mockSignUp: ReturnType<typeof vi.fn>;
let mockSignInWithPassword: ReturnType<typeof vi.fn>;
let mockConvexMutation: ReturnType<typeof vi.fn>;

// Mock Supabase
vi.mock('@/lib/auth/supabase-server', () => {
  const mockSignUpFn = vi.fn();
  const mockSignInWithPasswordFn = vi.fn();
  return {
    createClient: vi.fn(() => ({
      auth: {
        signUp: mockSignUpFn,
        signInWithPassword: mockSignInWithPasswordFn,
      },
    })),
    __mocks: {
      signUp: mockSignUpFn,
      signInWithPassword: mockSignInWithPasswordFn,
    },
  };
});

// Mock Convex
vi.mock('@/lib/convex/server', () => {
  const mockMutationFn = vi.fn();
  return {
    convexClient: {
      mutation: mockMutationFn,
    },
    __mocks: {
      mutation: mockMutationFn,
    },
  };
});

describe('Auth API Routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mock functions from the mocked modules
    const { createClient } = await import('@/lib/auth/supabase-server');
    const { convexClient } = await import('@/lib/convex/server');
    const client = createClient() as any;
    mockSignUp = client.auth.signUp;
    mockSignInWithPassword = client.auth.signInWithPassword;
    mockConvexMutation = convexClient.mutation;
  });

  describe('POST /api/auth/signup', () => {
    it('should validate email and password are required', async () => {
      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await signupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should validate password length', async () => {
      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'short', // Less than 8 chars
        }),
      });

      const response = await signupPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('8');
    });

    it('should accept valid email and password', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
        },
        error: null,
      });
      
      mockConvexMutation.mockResolvedValue(undefined);

      const request = new Request('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123',
        }),
      });

      const response = await signupPOST(request);
      
      // Should not be a 400 error (validation passed)
      expect(response.status).not.toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should validate email and password are required', async () => {
      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('should return error for invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials', status: 401 },
      });

      const request = new Request('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid');
    });
  });
});

