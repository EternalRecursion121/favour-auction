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
    // Ensure original is an object before spreading
    const originalModule = typeof original === 'object' && original !== null ? original : {};
    return {
      ...originalModule,
      // Define mocks for functions exported by $lib/server/db
      db: mockDbClient, // Assuming db is exported directly
      getAllAuctionResults: vi.fn(),
    };
  } catch (e) {
    // Handle potential errors during import
    console.error("Error mocking $lib/server/db:", e);
    return { db: mockDbClient, getAllAuctionResults: vi.fn() };
  }
});

// Mock auth
vi.mock('$lib/server/auth', () => ({
  requireAdmin: vi.fn(() => Promise.resolve()),
}));

describe('/api/admin/results GET', () => {
  // Define event with a more specific type for the route
  let event: RequestEvent<{}>;

  // Make beforeEach async to allow top-level await for imports
  beforeEach(async () => {
    vi.resetAllMocks();
    mockDbClient.query.mockReset(); // Assuming query is on mockDbClient
    // Correctly mock the specific function from the already mocked module
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    getAllAuctionResults.mockReset();

    event = {
      request: {
        json: vi.fn(),
        headers: new Headers(),
        formData: vi.fn(),
        // Add other Request properties if needed by the handler
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
        url: 'http://localhost/api/admin/results',
      } as Request,
      cookies: {
        get: vi.fn(() => 'true'),
        set: vi.fn(),
        delete: vi.fn(),
        // Add missing methods
        getAll: vi.fn(() => ([])), 
        serialize: vi.fn((name, value, opts) => `${name}=${value}`)
      },
      params: {}, // No params for this route
      url: new URL('http://localhost/api/admin/results'),
      fetch: vi.fn(),
      getClientAddress: vi.fn(() => '127.0.0.1'),
      locals: { user: { isAdmin: true } } as App.Locals,
      platform: undefined,
      route: { id: '/api/admin/results' }, // Use exact route ID
      setHeaders: vi.fn(),
      isDataRequest: false,
      isSubRequest: false,
    };
  });

  it('should return all auction results', async () => {
    const mockResults = [
      { id: 1, item_title: 'Item A', winner_name: 'User1', final_price: 100 },
      { id: 2, item_title: 'Item B', winner_name: 'User2', final_price: 150 },
    ];
    // Access the mock function correctly
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    getAllAuctionResults.mockResolvedValue(mockResults);

    const response = await GET(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockResults);
    expect(getAllAuctionResults).toHaveBeenCalled();
  });

  it('should return an empty array if no results exist', async () => {
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    getAllAuctionResults.mockResolvedValue([]);

    const response = await GET(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual([]);
    expect(getAllAuctionResults).toHaveBeenCalled();
  });

  it('should handle errors during fetching results', async () => {
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    getAllAuctionResults.mockRejectedValue(new Error('DB Error'));

    const response = await GET(event);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('should require admin authentication', async () => {
    // Modify the specific event instance for this test
    const nonAdminEvent = { 
        ...event, 
        cookies: { ...event.cookies, get: vi.fn(() => undefined)}, 
        locals: {}
    };
    
    const response = await GET(nonAdminEvent);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe('UNAUTHORIZED');
    const { getAllAuctionResults } = await vi.importMock('$lib/server/db');
    expect(getAllAuctionResults).not.toHaveBeenCalled();
  });
});