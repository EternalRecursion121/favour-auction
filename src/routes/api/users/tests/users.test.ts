import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../+server';
import { createRequest, createRequestEvent } from '../../../../test/utils';
import { setupMockQueries, mockUsers } from '../../../../test/mocks/db';

describe('User API Endpoints', () => {
  beforeEach(() => {
    setupMockQueries();
  });

  describe('POST /api/users', () => {
    it('should create a new user when name does not exist', async () => {
      const request = createRequest({ name: 'NewUser' });
      const event = createRequestEvent({ request });

      const response = await POST(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expect.objectContaining({
        name: 'NewUser',
        balance: 100,
        itemsSold: 0,
        itemsBought: 0
      }));
    });

    it('should return existing user when name already exists', async () => {
      const request = createRequest({ name: 'TestUser1' });
      const event = createRequestEvent({ request });

      const response = await POST(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expect.objectContaining({
        id: 1,
        name: 'TestUser1',
        balance: 100,
        itemsSold: 0,
        itemsBought: 0
      }));
    });

    it('should return error when name is not provided', async () => {
      const request = createRequest({});
      const event = createRequestEvent({ request });

      const response = await POST(event);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(true);
      expect(data.code).toBe('INVALID_INPUT');
    });
  });
});