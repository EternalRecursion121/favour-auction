import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../+server';
import { createRequest, createRequestEvent, createCookies } from '../../../../../test/utils';
import { mockDbClient } from '../../../../test/setup';
import type { RequestEvent } from '@sveltejs/kit';
import { SimpleRequestEvent } from '$lib/server/error';

// Mock the db module used by the endpoint
vi.mock('$lib/server/db', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    db: mockDbClient,
    checkAdminPassword: vi.fn(),
  };
});

describe('/api/admin/auth POST', () => {
  let event: Partial<RequestEvent>;

  beforeEach(() => {
    vi.resetAllMocks();
    // Reset mock implementations
    mockDbClient.query.mockResolvedValue({ rows: [] });
    const { checkAdminPassword } = vi.mocked(await import('$lib/server/db'));
    checkAdminPassword.mockResolvedValue(false);

    // Basic mock event structure
    event = {
      request: {
        json: vi.fn(),
        headers: new Headers(),
        formData: vi.fn(),
      } as unknown as Request,
      cookies: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
      },
      params: {},
      url: new URL('http://localhost/api/admin/auth'),
      fetch: vi.fn(),
      getClientAddress: vi.fn(() => '127.0.0.1'),
      locals: {} as App.Locals,
      platform: undefined,
      route: { id: '/api/admin/auth' },
      setHeaders: vi.fn(),
      isDataRequest: false,
      isSubRequest: false,
    };
  });

  it('should return 401 if password is wrong', async () => {
    const { checkAdminPassword } = vi.mocked(await import('$lib/server/db'));
    checkAdminPassword.mockResolvedValue(false);
    (event.request as any).json.mockResolvedValue({ password: 'wrongpassword' });

    const response = await POST(event as RequestEvent);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Invalid password');
    expect(event.cookies.set).not.toHaveBeenCalled();
  });

  it('should return 200 and set cookie if password is correct', async () => {
    const { checkAdminPassword } = vi.mocked(await import('$lib/server/db'));
    checkAdminPassword.mockResolvedValue(true);
    (event.request as any).json.mockResolvedValue({ password: 'correctpassword' });

    const response = await POST(event as RequestEvent);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Authentication successful');
    expect(event.cookies.set).toHaveBeenCalledWith('admin_authenticated', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7
    });
  });

  it('should return 400 if password is missing', async () => {
    (event.request as any).json.mockResolvedValue({});

    const response = await POST(event as RequestEvent);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_INPUT');
    expect(event.cookies.set).not.toHaveBeenCalled();
  });

  it('should handle internal server errors', async () => {
    const { checkAdminPassword } = vi.mocked(await import('$lib/server/db'));
    checkAdminPassword.mockRejectedValue(new Error('Database connection failed'));
    (event.request as any).json.mockResolvedValue({ password: 'somepassword' });

    const response = await POST(event as RequestEvent);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.message).toBe('An unexpected error occurred');
  });
});