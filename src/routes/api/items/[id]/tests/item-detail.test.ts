import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../+server';
import { createRequestEvent } from '../../../../../test/utils';
import { setupMockQueries } from '../../../../../test/mocks/db';

describe('Item Detail API Endpoint', () => {
  beforeEach(() => {
    setupMockQueries();
  });

  describe('GET /api/items/[id]', () => {
    it('should return a specific item by ID', async () => {
      const event = createRequestEvent({ params: { id: '1' } });

      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expect.objectContaining({
        id: 1,
        title: expect.any(String),
        description: expect.any(String),
        seller: expect.objectContaining({
          id: expect.any(Number),
          name: expect.any(String)
        }),
        auctionHistory: expect.any(Array)
      }));
    });

    it('should return 404 for non-existent item', async () => {
      const event = createRequestEvent({ params: { id: '999' } });

      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe(true);
      expect(data.code).toBe('NOT_FOUND');
    });

    it('should return error for invalid item ID', async () => {
      const event = createRequestEvent({ params: { id: 'invalid' } });

      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(true);
      expect(data.code).toBe('INVALID_INPUT');
    });
  });
});