import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../+server';
import { mockDbClient, createRequestEvent, createRequest, createCookies } from '../../../../test/setup';
import type { RequestEvent } from '@sveltejs/kit';
import type { SimpleRequestEvent } from '$lib/server/error';
import type { Item, User } from '$lib/types';

// Mock DB module
vi.mock('$lib/server/db', async (importOriginal) => {
  try {
    const original = await importOriginal();
    const originalModule = typeof original === 'object' && original !== null ? original : {};
    return {
      ...originalModule,
      db: mockDbClient,
      getAllItems: vi.fn().mockImplementation(async () => []),
      addItem: vi.fn().mockImplementation(async (item: any) => ({ ...item, id: Math.floor(Math.random() * 1000) })),
      getUserByName: vi.fn().mockImplementation(async () => null),
      getItemById: vi.fn().mockImplementation(async () => null),
    };
  } catch (e) {
    return { 
      db: mockDbClient, 
      getAllItems: vi.fn().mockImplementation(async () => []),
      addItem: vi.fn().mockImplementation(async (item: any) => ({ ...item, id: Math.floor(Math.random() * 1000) })),
      getUserByName: vi.fn().mockImplementation(async () => null),
      getItemById: vi.fn().mockImplementation(async () => null),
    };
  }
});

describe('/api/items', () => {
  let postEvent: RequestEvent<Partial<Record<string, string>>, '/api/items'>;

  beforeEach(async () => {
    vi.resetAllMocks();
    const { getAllItems, addItem, getUserByName, getItemById } = await vi.importMock('$lib/server/db');
    getAllItems.mockReset();
    addItem.mockReset();
    getUserByName.mockReset();
    getItemById.mockReset();
    if (mockDbClient.query.mockReset) mockDbClient.query.mockReset();

    // Default mock implementations
    getAllItems.mockResolvedValue([]);
    addItem.mockImplementation(async (item: any) => ({ ...item, id: Math.floor(Math.random() * 1000) }));
    getUserByName.mockResolvedValue(null);

    postEvent = createRequestEvent({
      request: createRequest(),
      cookies: createCookies(),
      route: { id: '/api/items' },
      url: new URL('http://localhost/api/items'),
    });
  });

  describe('GET /api/items', () => {
    it('should return a list of items', async () => {
      const { getAllItems } = await vi.importMock('$lib/server/db');
      const mockItems: Item[] = [
        { 
          id: 1, 
          title: 'Item1', 
          description: 'Desc1', 
          seller: { id: 1, name: 'Seller1' },
          currentBid: 10, 
          bidder: null, 
          startTime: new Date().toISOString(), 
          endTime: new Date().toISOString(), 
          imageUrl: '' 
        },
        { 
          id: 2, 
          title: 'Item2', 
          description: 'Desc2', 
          seller: { id: 2, name: 'Seller2' },
          currentBid: 25, 
          bidder: { id: 3, name: 'Bidder1' }, 
          startTime: new Date().toISOString(), 
          endTime: new Date().toISOString(), 
          imageUrl: '' 
        },
      ];
      getAllItems.mockResolvedValue(mockItems);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockItems);
      expect(getAllItems).toHaveBeenCalled();
    });

    it('should handle errors during fetching items', async () => {
      const { getAllItems } = await vi.importMock('$lib/server/db');
      getAllItems.mockRejectedValue(new Error('DB Error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/items', () => {
    it('should add a new item', async () => {
      const { addItem, getUserByName } = await vi.importMock('$lib/server/db');
      const newItem = { 
        title: 'New Item', 
        description: 'New Desc', 
        seller: { id: 3, name: 'Seller3' },
        imageUrl: ''
      };
      (postEvent.request as any).json.mockResolvedValue(newItem);
      const addedItem = { ...newItem, id: 123 };
      addItem.mockResolvedValue(addedItem);
      getUserByName.mockResolvedValue(null);

      const response = await POST(postEvent);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(addedItem);
      expect(addItem).toHaveBeenCalledWith(expect.objectContaining(newItem));
    });

    it('should return 400 for invalid item data', async () => {
      const { addItem } = await vi.importMock('$lib/server/db');
      const invalidItem = { description: 'Only Desc' };
      (postEvent.request as any).json.mockResolvedValue(invalidItem);

      const response = await POST(postEvent);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_INPUT');
      expect(addItem).not.toHaveBeenCalled();
    });

    it('should handle errors during item creation', async () => {
      const { addItem, getUserByName } = await vi.importMock('$lib/server/db');
      const newItem = { 
        title: 'Fail Item', 
        description: 'Fail Desc', 
        seller: { id: 4, name: 'Seller4' },
        imageUrl: ''
      };
      (postEvent.request as any).json.mockResolvedValue(newItem);
      getUserByName.mockResolvedValue(null);
      addItem.mockRejectedValue(new Error('DB Insert Failed'));

      const response = await POST(postEvent);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
      expect(addItem).toHaveBeenCalledWith(expect.objectContaining(newItem));
    });
    
    it('should potentially require authentication', async () => {
      const newItem = { 
        title: 'Auth Item', 
        description: 'Auth Desc', 
        seller: { id: 5, name: 'Seller5' },
        imageUrl: ''
      };
      (postEvent.request as any).json.mockResolvedValue(newItem);
      
      const response = await POST(postEvent);
      expect(response.status).toBe(201);
    });
  });
});