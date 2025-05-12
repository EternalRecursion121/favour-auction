import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PUT } from '../+server';
import { createRequest, createRequestEvent, createCookies } from '../../../../../test/utils';
import * as dbModule from '$lib/server/db';

describe('Admin Config API Endpoint', () => {
  // Mock the updateAuctionConfig function directly
  beforeEach(() => {
    vi.mock('$lib/server/db', async () => {
      const actual = await vi.importActual('$lib/server/db');
      return {
        ...actual,
        updateAuctionConfig: vi.fn().mockImplementation((auctionType, allowNewItems, pennyIncrement, pennyTimeExtension, pennyMinTime) => {
          return Promise.resolve({
            id: 1,
            auction_type: auctionType,
            allow_new_items: allowNewItems,
            penny_increment: pennyIncrement || 1,
            penny_time_extension: pennyTimeExtension || 10,
            penny_min_time: pennyMinTime || 30
          });
        })
      };
    });
  });

  describe('PUT /api/admin/config', () => {
    it('should update auction configuration when admin is authenticated', async () => {
      const request = createRequest({
        auctionType: 'dutch',
        allowNewItems: false,
        pennyAuctionConfig: {
          incrementAmount: 2,
          timeExtension: 15,
          minimumTimeRemaining: 45
        }
      });
      const cookies = createCookies({ admin_authenticated: 'true' });
      const event = createRequestEvent({ request, cookies });

      const response = await PUT(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expect.objectContaining({
        success: true,
        config: expect.objectContaining({
          auctionType: 'dutch',
          allowNewItems: false,
          pennyAuctionConfig: expect.objectContaining({
            incrementAmount: 2,
            timeExtension: 15,
            minimumTimeRemaining: 45
          })
        })
      }));
    });

    it('should validate configuration data', async () => {
      const request = createRequest({
        auctionType: 'invalid_type', // Invalid auction type
        allowNewItems: false
      });
      const cookies = createCookies({ admin_authenticated: 'true' });
      const event = createRequestEvent({ request, cookies });

      const response = await PUT(event);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(true);
    });

    it('should reject when not authenticated as admin', async () => {
      const request = createRequest({
        auctionType: 'dutch',
        allowNewItems: false
      });
      const cookies = createCookies(); // No admin cookie
      const event = createRequestEvent({ request, cookies });

      const response = await PUT(event);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual(expect.objectContaining({
        error: true,
        code: 'UNAUTHORIZED'
      }));
    });
  });
});