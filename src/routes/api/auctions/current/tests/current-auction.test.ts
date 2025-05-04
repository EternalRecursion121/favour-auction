import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../+server';
import { createRequestEvent } from '../../../../../test/utils';
import { setupMockQueries } from '../../../../../test/mocks/db';
import { setupMockAuction } from '../../../../../test/mocks/auction';

describe.skip('Current Auction API Endpoint', () => {
  beforeEach(() => {
    setupMockQueries();
    setupMockAuction();
  });

  describe('GET /api/auctions/current', () => {
    it('should return the current active auction', async () => {
      const event = createRequestEvent();

      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('active');
    });

    it('should handle when no auction is active', async () => {
      const event = createRequestEvent();

      const response = await GET(event);
      
      expect(response.status).toBe(200);
    });
  });
});