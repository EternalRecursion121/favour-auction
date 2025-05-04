import { describe, it, expect, beforeEach } from 'vitest';
import { GET } from '../+server';
import { createRequestEvent } from '../../../../../test/utils';
import { setupMockQueries, mockAuctionConfig } from '../../../../../test/mocks/db';

describe('Auction Config API Endpoint', () => {
  beforeEach(() => {
    setupMockQueries();
  });

  describe('GET /api/auctions/config', () => {
    it('should return the current auction configuration', async () => {
      const event = createRequestEvent();

      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expect.objectContaining({
        auctionType: mockAuctionConfig.auction_type,
        allowNewItems: mockAuctionConfig.allow_new_items,
        pennyAuctionConfig: expect.objectContaining({
          incrementAmount: mockAuctionConfig.penny_increment,
          timeExtension: mockAuctionConfig.penny_time_extension,
          minimumTimeRemaining: mockAuctionConfig.penny_min_time
        })
      }));
    });
  });
});