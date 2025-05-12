import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../+server';
import { mockDbClient, createRequestEvent, createRequest, createCookies } from '../../../../../test/setup';
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
      getAllUsers: vi.fn().mockImplementation(async () => []),
      deleteAllItems: vi.fn().mockImplementation(async () => ({ rowCount: 0 })),
      deleteAllUsers: vi.fn().mockImplementation(async () => ({ rowCount: 0 })),
      getUserBalance: vi.fn().mockImplementation(async () => 0),
      updateUserBalance: vi.fn().mockImplementation(async () => ({ rowCount: 1 })),
    };
  } catch (e) {
    return { 
      db: mockDbClient, 
      getAllItems: vi.fn().mockImplementation(async () => []),
      getAllUsers: vi.fn().mockImplementation(async () => []),
      deleteAllItems: vi.fn().mockImplementation(async () => ({ rowCount: 0 })),
      deleteAllUsers: vi.fn().mockImplementation(async () => ({ rowCount: 0 })),
      getUserBalance: vi.fn().mockImplementation(async () => 0),
      updateUserBalance: vi.fn().mockImplementation(async () => ({ rowCount: 1 })),
    };
  }
});

// Mock auth
vi.mock('$lib/server/auth', () => ({
  requireAdmin: vi.fn(() => Promise.resolve()),
}));

describe('/api/admin/reset', () => {
  let postEvent: RequestEvent<Partial<Record<string, string>>, '/api/admin/reset'>;

  beforeEach(async () => {
    vi.resetAllMocks();
    const { getAllItems, getAllUsers, deleteAllItems, deleteAllUsers, getUserBalance, updateUserBalance } = await vi.importMock('$lib/server/db');
    getAllItems.mockReset();
    getAllUsers.mockReset();
    deleteAllItems.mockReset();
    deleteAllUsers.mockReset();
    getUserBalance.mockReset();
    updateUserBalance.mockReset();
    if (mockDbClient.query.mockReset) mockDbClient.query.mockReset();

    // Default mock implementations
    getAllItems.mockResolvedValue([]);
    getAllUsers.mockResolvedValue([]);
    deleteAllItems.mockResolvedValue({ rowCount: 0 });
    deleteAllUsers.mockResolvedValue({ rowCount: 0 });
    getUserBalance.mockResolvedValue(0);
    updateUserBalance.mockResolvedValue({ rowCount: 1 });

    postEvent = createRequestEvent({
      request: createRequest(),
      cookies: createCookies(),
      route: { id: '/api/admin/reset' },
      url: new URL('http://localhost/api/admin/reset'),
    });
  });

  describe('POST /api/admin/reset', () => {
    it('should reset all items and users', async () => {
      const { getAllItems, getAllUsers, deleteAllItems, deleteAllUsers } = await vi.importMock('$lib/server/db');
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
        }
      ];
      const mockUsers: User[] = [
        { id: 1, name: 'User1', balance: 100 }
      ];
      getAllItems.mockResolvedValue(mockItems);
      getAllUsers.mockResolvedValue(mockUsers);
      deleteAllItems.mockResolvedValue({ rowCount: 1 });
      deleteAllUsers.mockResolvedValue({ rowCount: 1 });

      const response = await POST(postEvent);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'Reset successful' });
      expect(deleteAllItems).toHaveBeenCalled();
      expect(deleteAllUsers).toHaveBeenCalled();
    });

    it('should handle errors during reset', async () => {
      const { deleteAllItems } = await vi.importMock('$lib/server/db');
      deleteAllItems.mockRejectedValue(new Error('DB Error'));

      const response = await POST(postEvent);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });

    it('should require admin authentication', async () => {
      const { deleteAllItems } = await vi.importMock('$lib/server/db');
      const nonAdminEvent = createRequestEvent({
        request: createRequest(),
        cookies: createCookies(),
        route: { id: '/api/admin/reset' },
        url: new URL('http://localhost/api/admin/reset'),
        locals: { user: { role: 'user' } } as App.Locals
      });

      const response = await POST(nonAdminEvent);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe('FORBIDDEN');
      expect(deleteAllItems).not.toHaveBeenCalled();
    });
  });
});