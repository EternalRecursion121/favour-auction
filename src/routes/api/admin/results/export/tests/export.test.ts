import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';
import { mockDbClient } from '../../../../../test/setup';
import type { RequestEvent } from '@sveltejs/kit';
import type { SimpleRequestEvent } from '$lib/server/error';
import * as dbModule from '$lib/server/db';

// Mock DB
vi.mock('$lib/server/db', async (importOriginal) => {
  try {
    const original = await importOriginal();
    const originalModule = typeof original === 'object' && original !== null ? original : {};
    return {
      ...originalModule,
      db: mockDbClient,
      getAllAuctionResults: vi.fn(),
    };
  } catch (e) {
    console.error("Error mocking $lib/server/db:", e);
    return { db: mockDbClient, getAllAuctionResults: vi.fn() };
  }
});

// Mock auth
vi.mock('$lib/server/auth', () => ({
  requireAdmin: vi.fn(() => Promise.resolve()),
}));

describe('/api/admin/results/export GET', () => {
  let event: RequestEvent<Partial<Record<string, string>>, '/api/admin/results/export'>;

  beforeEach(async () => {
    vi.resetAllMocks();
    mockDbClient.query.mockReset();
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    getAllAuctionResults.mockReset();

    event = {
      request: {
        json: vi.fn(),
        headers: new Headers(),
        formData: vi.fn(),
        signal: new AbortController().signal,
        clone: vi.fn(),
        arrayBuffer: vi.fn(),
        blob: vi.fn(),
        text: vi.fn(),
        body: null,
        bodyUsed: false,
        cache: 'default',
        credentials: 'omit',
        destination: '",
        integrity: '",
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        referrer: '",
        referrerPolicy: 'no-referrer',
        url: 'http://localhost/api/admin/results/export',
      } as Request,
      cookies: {
        get: vi.fn(() => 'true'),
        set: vi.fn(),
        delete: vi.fn(),
        getAll: vi.fn(() => ([])), 
        serialize: vi.fn((name, value, opts) => `${name}=${value}`)
      },
      params: {}, 
      url: new URL('http://localhost/api/admin/results/export'),
      fetch: vi.fn(),
      getClientAddress: vi.fn(() => '127.0.0.1'),
      locals: { user: { isAdmin: true } } as App.Locals,
      platform: undefined,
      route: { id: '/api/admin/results/export' },
      setHeaders: vi.fn(),
      isDataRequest: false,
      isSubRequest: false,
    };
  });

  it('should return CSV data of auction results', async () => {
    const mockResults = [
      { id: 1, item_id: 10, item_title: 'Item A', winner_id: 1, winner_name: 'User1', final_price: 100, timestamp: new Date().toISOString() },
      { id: 2, item_id: 11, item_title: 'Item B', winner_id: 2, winner_name: 'User2', final_price: 150, timestamp: new Date().toISOString() },
    ];
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    getAllAuctionResults.mockResolvedValue(mockResults);

    const response = await GET(event);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/csv');
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="auction_results.csv"');
    expect(getAllAuctionResults).toHaveBeenCalled();
    
    expect(text).toContain('Result ID,Item ID,Item Title,Winner ID,Winner Name,Final Price,Timestamp');
    expect(text).toContain('1,10,Item A,1,User1,100,');
    expect(text).toContain('2,11,Item B,2,User2,150,');
  });

  it('should return an empty CSV if no results are found', async () => {
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    getAllAuctionResults.mockResolvedValue([]);

    const response = await GET(event);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('Result ID,Item ID,Item Title,Winner ID,Winner Name,Final Price,Timestamp');
    const lines = text.trim().split('\n');
    expect(lines.length).toBe(1);
  });
  
  it('should handle errors during data fetching', async () => {
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    getAllAuctionResults.mockRejectedValue(new Error('DB Error'));

    const response = await GET(event);
    expect(response.status).toBe(500);
    if (response.headers.get('Content-Type')?.includes('application/json')) {
      const data = await response.json();
      expect(data.code).toBe('INTERNAL_ERROR');
    } else {
      const text = await response.text();
      expect(text).toContain('Error'); 
    }
  });

  it('should require admin authentication', async () => {
    const nonAdminEvent = { 
        ...event, 
        cookies: { ...event.cookies, get: vi.fn(() => undefined)}, 
        locals: {}
    };

    const response = await GET(nonAdminEvent);
    expect(response.status).toBe(401);
    if (response.headers.get('Content-Type')?.includes('application/json')) {
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    }
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    expect(getAllAuctionResults).not.toHaveBeenCalled();
  });
});