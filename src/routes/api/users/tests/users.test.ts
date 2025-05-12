import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../+server';
import { mockDbClient } from '../../../../test/setup';
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
      getAllUsers: vi.fn(),
      addUser: vi.fn(),
      getUserByName: vi.fn(),
      // Add other mocks if needed
    };
  } catch (e) {
    return { 
        db: mockDbClient, 
        getAllUsers: vi.fn(), addUser: vi.fn(), getUserByName: vi.fn() 
    };
  }
});

describe('/api/users', () => {
  let postEvent: RequestEvent<Partial<Record<string, string>>, '/api/users'>;

  beforeEach(async () => {
    vi.resetAllMocks();
    const { getAllUsers, addUser, getUserByName, db } = await vi.importMock('$lib/server/db');
    getAllUsers.mockReset();
    addUser.mockReset();
    getUserByName.mockReset();
    if (mockDbClient.query.mockReset) mockDbClient.query.mockReset();

    // Default mock implementations
    getAllUsers.mockResolvedValue([]);
    addUser.mockImplementation(async (user: any) => ({ ...user, id: Math.floor(Math.random() * 1000) }));
    getUserByName.mockResolvedValue(null);

    postEvent = {
      request: {
        json: vi.fn(), headers: new Headers(), formData: vi.fn(),
        signal: new AbortController().signal, clone: vi.fn(), arrayBuffer: vi.fn(), blob: vi.fn(), text: vi.fn(),
        body: null, bodyUsed: false, cache: 'default', credentials: 'omit',
        destination: '', integrity: '', method: 'POST', mode: 'cors',
        redirect: 'follow', referrer: '', referrerPolicy: 'no-referrer',
        url: 'http://localhost/api/users',
      } as Request,
      cookies: {
        get: vi.fn(), set: vi.fn(), delete: vi.fn(),
        getAll: vi.fn(() => ([])), serialize: vi.fn((name, value, opts) => `${name}=${value}`)
      },
      params: {},
      url: new URL('http://localhost/api/users'),
      fetch: vi.fn(),
      getClientAddress: vi.fn(() => '127.0.0.1'),
      locals: {} as App.Locals,
      platform: undefined,
      route: { id: '/api/users' },
      setHeaders: vi.fn(), isDataRequest: false, isSubRequest: false,
    };
  });

  describe('GET /api/users', () => {
    it('should return a list of all users', async () => {
      const { getAllUsers } = await vi.importMock('$lib/server/db');
      const mockUsers = [
        { id: 1, name: 'User1', balance: 100 },
        { id: 2, name: 'User2', balance: 150 },
      ];
      getAllUsers.mockResolvedValue(mockUsers);

      const response = await GET(); // GET takes no args
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUsers);
      expect(getAllUsers).toHaveBeenCalled();
    });

    it('should handle errors during fetching users', async () => {
      const { getAllUsers } = await vi.importMock('$lib/server/db');
      getAllUsers.mockRejectedValue(new Error('DB Error'));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/users', () => {
    it('should add a new user', async () => {
      const { addUser, getUserByName } = await vi.importMock('$lib/server/db');
      const newUser = { name: 'NewUser', balance: 200 };
      (postEvent.request as any).json.mockResolvedValue(newUser);
      const addedUser = { ...newUser, id: 456 };
      addUser.mockResolvedValue(addedUser);
      getUserByName.mockResolvedValue(null);

      const response = await POST(postEvent);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(addedUser);
      expect(getUserByName).toHaveBeenCalledWith(newUser.name);
      expect(addUser).toHaveBeenCalledWith(newUser);
    });

    it('should return 409 if user already exists', async () => {
      const { addUser, getUserByName } = await vi.importMock('$lib/server/db');
      const existingUser = { name: 'ExistingUser', balance: 300 };
      (postEvent.request as any).json.mockResolvedValue(existingUser);
      getUserByName.mockResolvedValue({ id: 999, ...existingUser }); // Mock user exists

      const response = await POST(postEvent);
      const data = await response.json();

      expect(response.status).toBe(409); // Conflict
      // Check error code if defined in error handling
      expect(data.message).toContain('already exists'); 
      expect(addUser).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid user data', async () => {
      const { addUser } = await vi.importMock('$lib/server/db');
      const invalidUser = { balance: 100 }; // Missing name
      (postEvent.request as any).json.mockResolvedValue(invalidUser);

      const response = await POST(postEvent);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe('INVALID_INPUT');
      expect(addUser).not.toHaveBeenCalled();
    });

    it('should handle errors during user creation', async () => {
      const { addUser, getUserByName } = await vi.importMock('$lib/server/db');
      const newUser = { name: 'FailUser', balance: 50 };
      (postEvent.request as any).json.mockResolvedValue(newUser);
      getUserByName.mockResolvedValue(null);
      addUser.mockRejectedValue(new Error('DB Insert Failed'));

      const response = await POST(postEvent);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe('INTERNAL_ERROR');
      expect(addUser).toHaveBeenCalledWith(newUser);
    });
  });
});