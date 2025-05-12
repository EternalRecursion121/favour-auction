import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../+server';
import { createRequestEvent } from '../../../../../test/utils';

// Mock the db module with a function exactly like in the Admin Config test
vi.mock('$lib/server/db', async () => {
  // The await vi.importActual is important to avoid circular dependencies
  const actual = await vi.importActual('$lib/server/db');
  
  return {
    ...actual,
    getCurrentAuctionConfig: vi.fn().mockResolvedValue({
      id: 1,
      auction_type: 'english',
      allow_new_items: true,
      penny_increment: 1,
      penny_time_extension: 10,
      penny_min_time: 30
    })
  };
});

describe('Auction Config API Endpoint', () => {
  describe('GET /api/auctions/config', () => {
    it('should return the current auction configuration', async () => {
      // Create a request event
      const event = createRequestEvent();
      
      // Call the handler
      const response = await GET(event);
      const data = await response.json();

      // Verify the response
      expect(response.status).toBe(200);
      expect(data).toEqual({
        auctionType: 'english',
        allowNewItems: true,
        pennyAuctionConfig: {
          incrementAmount: 1,
          timeExtension: 10,
          minimumTimeRemaining: 30
        }
      });
    });
  });
});