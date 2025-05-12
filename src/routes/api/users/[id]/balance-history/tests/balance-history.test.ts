import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';
import { mockDbClient } from '../../../../../test/setup';
import type { RequestEvent } from '@sveltejs/kit';
import type { SimpleRequestEvent } from '$lib/server/error';
import * as dbModule from '$lib/server/db';

// Mock DB module
vi.mock('$lib/server/db', async (importOriginal) => {
  try {
    const original = await importOriginal();
    const originalModule = typeof original === 'object' && original !== null ? original : {};
    return {
      ...originalModule,
      db: mockDbClient,
      getUserBalanceHistory: vi.fn(),
      // Add other mocks if needed
    };
  } catch (e) {
    return { db: mockDbClient, getUserBalanceHistory: vi.fn() };
  }
});

describe('/api/users/[id]/balance-history GET', () => {
  let event: RequestEvent<{ id: string }, '/api/users/[id]/balance-history'>;
  const mockUserId = '1';

  beforeEach(async () => {
    vi.resetAllMocks();
    const { getUserBalanceHistory } = await vi.importMock('$lib/server/db');
    getUserBalanceHistory.mockReset();

    // Mock implementations
    getUserBalanceHistory.mockResolvedValue([]);

    event = {
      request: {
        json: vi.fn(), headers: new Headers(), formData: vi.fn(),
        signal: new AbortController().signal, clone: vi.fn(), arrayBuffer: vi.fn(), blob: vi.fn(), text: vi.fn(),
        body: null, bodyUsed: false, cache: 'default', credentials: 'omit',
        destination: '', integrity: '', method: 'GET', mode: 'cors',
        redirect: 'follow', referrer: '', referrerPolicy: 'no-referrer',
        url: `http://localhost/api/users/${mockUserId}/balance-history`,
      } as Request,
      cookies: {
        get: vi.fn(), set: vi.fn(), delete: vi.fn(),
        getAll: vi.fn(() => ([])), serialize: vi.fn((name, value, opts) => `${name}=${value}`)
      },
      params: { id: mockUserId }, // Set the user ID param
      url: new URL(`http://localhost/api/users/${mockUserId}/balance-history`),
      fetch: vi.fn(),
      getClientAddress: vi.fn(() => '127.0.0.1'),
      locals: {} as App.Locals,
      platform: undefined,
      route: { id: '/api/users/[id]/balance-history' },
      setHeaders: vi.fn(), isDataRequest: false, isSubRequest: false,
    };
  });

  it('should return balance history for a valid user ID', async () => {
    const { getUserBalanceHistory } = await vi.importMock('$lib/server/db');
    const mockHistory = [
      { timestamp: new Date().toISOString(), balance: 100, reason: 'bid', item_id: 1, item_title: 'Item A' },
      { timestamp: new Date().toISOString(), balance: 90, reason: 'sell', item_id: 2, item_title: 'Item B' },
    ];
    getUserBalanceHistory.mockResolvedValue(mockHistory);

    const response = await GET(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockHistory);
    expect(getUserBalanceHistory).toHaveBeenCalledWith(parseInt(mockUserId, 10));
  });

  it('should return an empty array if no history exists', async () => {
    const { getUserBalanceHistory } = await vi.importMock('$lib/server/db');
    getUserBalanceHistory.mockResolvedValue([]);

    const response = await GET(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
    expect(getUserBalanceHistory).toHaveBeenCalledWith(parseInt(mockUserId, 10));
  });

  it('should return 400 if user ID is not a number', async () => {
    const { getUserBalanceHistory } = await vi.importMock('$lib/server/db');
    const invalidEvent = { ...event, params: { id: 'invalid-id' } };

    const response = await GET(invalidEvent);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_INPUT');
    expect(data.message).toContain('User ID must be a number');
    expect(getUserBalanceHistory).not.toHaveBeenCalled();
  });
  
  it('should return 400 if user ID parameter is missing', async () => {
    const missingIdEvent = { ...event, params: {} as { id: string } }; // Force params to be empty

    const response = await GET(missingIdEvent as unknown as typeof event);
    const data = await response.json();

    expect(response.status).toBe(400); 
    expect(data.code).toBe('INVALID_INPUT');
    expect(data.message).toContain('User ID parameter is required');
  });

  it('should handle database errors', async () => {
    const { getUserBalanceHistory } = await vi.importMock('$lib/server/db');
    getUserBalanceHistory.mockRejectedValue(new Error('DB Fetch Failed'));

    const response = await GET(event);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(getUserBalanceHistory).toHaveBeenCalledWith(parseInt(mockUserId, 10));
  });

  // Add authentication tests if needed
  // it('should require authentication', async () => { ... });
});