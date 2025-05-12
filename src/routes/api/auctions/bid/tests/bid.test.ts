import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../+server';
import { mockDbClient } from '../../../../../test/setup'; // Corrected path
import type { RequestEvent } from '@sveltejs/kit';
import type { SimpleRequestEvent } from '$lib/server/error'; // Type-only import
import * as dbModule from '$lib/server/db';
import * as auctionModule from '$lib/server/auction';
import type { BidResult } from '$lib/types';

// Mock DB and Auction modules
vi.mock('$lib/server/db', async (importOriginal) => {
  try {
    const original = await importOriginal();
    const originalModule = typeof original === 'object' && original !== null ? original : {};
    return {
      ...originalModule,
      db: mockDbClient,
      getUserBalance: vi.fn().mockImplementation(async (userId: number) => 100),
      recordBid: vi.fn().mockImplementation(async (userId: number, itemId: number, amount: number) => ({ id: 1, userId, itemId, amount })),
      updateUserBalance: vi.fn().mockImplementation(async (userId: number, newBalance: number) => ({ id: userId, balance: newBalance })),
      recordBalanceChange: vi.fn().mockImplementation(async (userId: number, newBalance: number, reason: string, itemId: number) => ({ id: 1, userId, newBalance, reason, itemId })),
    };
  } catch (e) {
    return { 
      db: mockDbClient, 
      getUserBalance: vi.fn().mockImplementation(async (userId: number) => 100),
      recordBid: vi.fn().mockImplementation(async (userId: number, itemId: number, amount: number) => ({ id: 1, userId, itemId, amount })),
      updateUserBalance: vi.fn().mockImplementation(async (userId: number, newBalance: number) => ({ id: userId, balance: newBalance })),
      recordBalanceChange: vi.fn().mockImplementation(async (userId: number, newBalance: number, reason: string, itemId: number) => ({ id: 1, userId, newBalance, reason, itemId })),
    };
  }
});
vi.mock('$lib/server/auction', async (importOriginal) => {
  try {
    const original = await importOriginal();
    const originalModule = typeof original === 'object' && original !== null ? original : {};
    return {
      ...originalModule,
      processBid: vi.fn().mockImplementation(async (userId: number, itemId: number, amount: number) => ({ 
        accepted: true, 
        newPrice: amount, 
        auctionType: 'english' 
      } as BidResult)),
      getFinalPrice: vi.fn().mockImplementation(async (userId: number) => 15),
    };
  } catch (e) {
    return { 
      processBid: vi.fn().mockImplementation(async (userId: number, itemId: number, amount: number) => ({ 
        accepted: true, 
        newPrice: amount, 
        auctionType: 'english' 
      } as BidResult)),
      getFinalPrice: vi.fn().mockImplementation(async (userId: number) => 15),
    };
  }
});

describe('/api/auctions/bid POST', () => {
  let event: RequestEvent<Partial<Record<string, string>>, '/api/auctions/bid'>;
  const mockUserId = 1;
  const mockItemId = 10;

  beforeEach(async () => {
    vi.resetAllMocks();
    
    // Reset mocks from the module itself
    const { getUserBalance, recordBid, updateUserBalance, recordBalanceChange } = await vi.importMock('$lib/server/db');
    getUserBalance.mockReset();
    recordBid.mockReset();
    updateUserBalance.mockReset();
    recordBalanceChange.mockReset();
    if (mockDbClient.query.mockReset) mockDbClient.query.mockReset();
    
    const { processBid, getFinalPrice } = await vi.importMock('$lib/server/auction');
    processBid.mockReset();
    getFinalPrice.mockReset();

    // Default mock implementations
    getUserBalance.mockResolvedValue(100);
    processBid.mockResolvedValue({ accepted: true, newPrice: 15, auctionType: 'english' } as BidResult);
    getFinalPrice.mockResolvedValue(15);
    if (mockDbClient.query.mockResolvedValue) mockDbClient.query.mockResolvedValue({ rows: [] });

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
        destination: '',
        integrity: '',
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        referrer: '',
        referrerPolicy: 'no-referrer',
        url: 'http://localhost/api/auctions/bid',
      } as Request,
      cookies: {
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        getAll: vi.fn(() => ([])),
        serialize: vi.fn((name, value, opts) => `${name}=${value}`)
      },
      params: {},
      url: new URL('http://localhost/api/auctions/bid'),
      fetch: vi.fn(),
      getClientAddress: vi.fn(() => '127.0.0.1'),
      locals: {} as App.Locals,
      platform: undefined,
      route: { id: '/api/auctions/bid' },
      setHeaders: vi.fn(),
      isDataRequest: false,
      isSubRequest: false,
    };
  });

  it('should accept a valid bid', async () => {
    const { getUserBalance, recordBid } = await vi.importMock('$lib/server/db');
    const { processBid } = await vi.importMock('$lib/server/auction');
    const bidAmount = 15;
    (event.request as any).json.mockResolvedValue({ userId: mockUserId, itemId: mockItemId, amount: bidAmount });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accepted).toBe(true);
    expect(data.newPrice).toBe(bidAmount);
    expect(getUserBalance).toHaveBeenCalledWith(mockUserId);
    expect(processBid).toHaveBeenCalledWith(mockUserId, mockItemId, bidAmount);
    expect(recordBid).toHaveBeenCalled();
    expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
    expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('should reject a bid if balance is insufficient', async () => {
    const { getUserBalance } = await vi.importMock('$lib/server/db');
    const { processBid } = await vi.importMock('$lib/server/auction');
    getUserBalance.mockResolvedValue(5); // Insufficient balance
    const bidAmount = 10;
    (event.request as any).json.mockResolvedValue({ userId: mockUserId, itemId: mockItemId, amount: bidAmount });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.code).toBe('INSUFFICIENT_BALANCE');
    expect(processBid).not.toHaveBeenCalled();
  });

  it('should reject a bid if processBid rejects it', async () => {
    const { recordBid } = await vi.importMock('$lib/server/db');
    const { processBid } = await vi.importMock('$lib/server/auction');
    processBid.mockResolvedValue({ accepted: false, message: 'Bid too low' } as BidResult);
    const bidAmount = 5;
    (event.request as any).json.mockResolvedValue({ userId: mockUserId, itemId: mockItemId, amount: bidAmount });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accepted).toBe(false);
    expect(data.message).toBe('Bid too low');
    expect(recordBid).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid input data', async () => {
    const { processBid } = await vi.importMock('$lib/server/auction');
    (event.request as any).json.mockResolvedValue({ userId: mockUserId }); // Missing itemId and amount

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_INPUT');
    expect(processBid).not.toHaveBeenCalled();
  });

  it('should handle database errors during transaction and rollback', async () => {
    const { recordBid } = await vi.importMock('$lib/server/db');
    recordBid.mockRejectedValue(new Error('DB insert failed'));
    const bidAmount = 20;
    (event.request as any).json.mockResolvedValue({ userId: mockUserId, itemId: mockItemId, amount: bidAmount });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
    expect(recordBid).toHaveBeenCalled();
    expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
  
  it('should update balance immediately for relevant auction types', async () => {
    const { getUserBalance, updateUserBalance, recordBalanceChange } = await vi.importMock('$lib/server/db');
    const { processBid, getFinalPrice } = await vi.importMock('$lib/server/auction');
    const bidAmount = 25;
    const balance = 100;
    getUserBalance.mockResolvedValue(balance);
    processBid.mockResolvedValue({ accepted: true, newPrice: bidAmount, auctionType: 'dutch', auctionEnded: true } as BidResult);
    getFinalPrice.mockResolvedValue(bidAmount);
    (event.request as any).json.mockResolvedValue({ userId: mockUserId, itemId: mockItemId, amount: bidAmount });

    const response = await POST(event);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accepted).toBe(true);
    expect(updateUserBalance).toHaveBeenCalled();
    expect(recordBalanceChange).toHaveBeenCalled();
    expect(data.newBalance).toBe(balance - bidAmount);
    expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
  });
});