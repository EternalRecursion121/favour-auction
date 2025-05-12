import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';
import { mockDbClient } from '../../../../../test/setup';
import type { RequestEvent } from '@sveltejs/kit';
import type { SimpleRequestEvent } from '$lib/server/error';
import * as auctionModule from '$lib/server/auction';
import type { Item, User, Bid, Auction } from '$lib/types';

// Mock auction state module
vi.mock('$lib/server/auction', async (importOriginal) => {
  try {
    const original = await importOriginal();
    const originalModule = typeof original === 'object' && original !== null ? original : {};
    return {
      ...originalModule,
      getAuctionState: vi.fn(),
      // Add other mocks if needed
    };
  } catch (e) {
    return { getAuctionState: vi.fn() };
  }
});

// Mock DB module just for Item/User fetches potentially needed by GET handler
vi.mock('$lib/server/db', async (importOriginal) => {
  try {
    const original = await importOriginal();
    const originalModule = typeof original === 'object' && original !== null ? original : {};
    return {
      ...originalModule,
      db: mockDbClient,
      getItemById: vi.fn(),
      getUserById: vi.fn()
    };
  } catch (e) {
    return { db: mockDbClient, getItemById: vi.fn(), getUserById: vi.fn() };
  }
});

describe('/api/auctions/current GET', () => {
  let event: RequestEvent<Partial<Record<string, string>>, '/api/auctions/current'>;

  beforeEach(async () => {
    vi.resetAllMocks();
    const { getAuctionState } = await vi.importMock('$lib/server/auction');
    const { getItemById, getUserById } = await vi.importMock('$lib/server/db');
    getAuctionState.mockReset();
    getItemById.mockReset();
    getUserById.mockReset();

    // Basic event mock
    event = {
      request: {
        json: vi.fn(), headers: new Headers(), formData: vi.fn(),
        signal: new AbortController().signal, clone: vi.fn(), arrayBuffer: vi.fn(), blob: vi.fn(), text: vi.fn(),
        body: null, bodyUsed: false, cache: 'default', credentials: 'omit',
        destination: '', integrity: '', method: 'GET', mode: 'cors',
        redirect: 'follow', referrer: '', referrerPolicy: 'no-referrer',
        url: 'http://localhost/api/auctions/current',
      } as Request,
      cookies: {
        get: vi.fn(), set: vi.fn(), delete: vi.fn(),
        getAll: vi.fn(() => ([])), serialize: vi.fn((name, value, opts) => `${name}=${value}`)
      },
      params: {},
      url: new URL('http://localhost/api/auctions/current'),
      fetch: vi.fn(),
      getClientAddress: vi.fn(() => '127.0.0.1'),
      locals: {} as App.Locals,
      platform: undefined,
      route: { id: '/api/auctions/current' },
      setHeaders: vi.fn(), isDataRequest: false, isSubRequest: false,
    };
  });

  it('should return the current auction state', async () => {
    const { getAuctionState } = await vi.importMock('$lib/server/auction');
    const { getItemById, getUserById } = await vi.importMock('$lib/server/db');

    const mockItem: Item = { id: 1, title: 'Test Item', description: 'Desc', startingBid: 10, currentBid: 50, sellerId: 1, bidderId: 2, startTime: new Date(), endTime: new Date(Date.now() + 3600000), imageUrl: '' };
    const mockBidder: User = { id: 2, name: 'Bidder', balance: 1000 };
    const mockSeller: User = { id: 1, name: 'Seller', balance: 500 };
    
    const mockState: Auction = {
      status: 'running',
      currentItem: mockItem,
      winningBidder: mockBidder,
      currentBid: 50,
      endTime: mockItem.endTime.toISOString(),
      bids: [], // Simplified for this test
    };
    
    getAuctionState.mockResolvedValue(mockState); // Assuming getAuctionState returns the full Auction object now

    const response = await GET(event); // Pass the mocked event
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockState); // Check if the response matches the full state
    expect(getAuctionState).toHaveBeenCalled();
    // No need to check DB calls if getAuctionState provides everything
    // expect(getItemById).not.toHaveBeenCalled(); 
    // expect(getUserById).not.toHaveBeenCalled();
  });

  it('should return the state when no item is up for auction', async () => {
    const { getAuctionState } = await vi.importMock('$lib/server/auction');
    const mockState: Auction = {
      status: 'idle',
      currentItem: null,
      winningBidder: null,
      currentBid: null,
      endTime: null,
      bids: [],
    };
    getAuctionState.mockResolvedValue(mockState);

    const response = await GET(event); // Pass the mocked event
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockState);
    expect(getAuctionState).toHaveBeenCalled();
  });

  it('should handle errors from getAuctionState', async () => {
    const { getAuctionState } = await vi.importMock('$lib/server/auction');
    getAuctionState.mockRejectedValue(new Error('State Error'));

    const response = await GET(event); // Pass the mocked event
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(getAuctionState).toHaveBeenCalled();
  });
});