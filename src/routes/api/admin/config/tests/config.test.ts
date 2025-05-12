import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PUT } from '../+server';
import { createRequest, createRequestEvent, createCookies } from '../../../../../test/utils';
import * as dbModule from '$lib/server/db';
import { GET } from '../+server';
import { mockDbClient } from '../../../../test/setup';
import type { RequestEvent } from '@sveltejs/kit';
import { SimpleRequestEvent } from '$lib/server/error';

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

  describe('/api/admin/config', () => {
    let event: Partial<RequestEvent>;

    beforeEach(() => {
      vi.resetAllMocks();
      mockDbClient.query.mockReset();

      // Reset mock implementations for DB functions
      const { getAuctionConfig, updateAuctionConfig } = vi.mocked(await import('$lib/server/db'));
      getAuctionConfig.mockReset();
      updateAuctionConfig.mockReset();

      event = {
        request: {
          json: vi.fn(),
          headers: new Headers(),
          formData: vi.fn(),
        } as unknown as Request,
        cookies: {
          get: vi.fn(() => 'true'), // Assume admin is logged in
          set: vi.fn(),
          delete: vi.fn(),
        },
        params: {},
        url: new URL('http://localhost/api/admin/config'),
        fetch: vi.fn(),
        getClientAddress: vi.fn(() => '127.0.0.1'),
        locals: { user: { isAdmin: true } } as App.Locals, // Mock admin user
        platform: undefined,
        route: { id: '/api/admin/config' },
        setHeaders: vi.fn(),
        isDataRequest: false,
        isSubRequest: false,
      };
    });

    describe('GET', () => {
      it('should return the current auction config', async () => {
        const mockConfig = { id: 1, auctionType: 'english', allowNewItems: true };
        const { getAuctionConfig } = vi.mocked(await import('$lib/server/db'));
        getAuctionConfig.mockResolvedValue(mockConfig);

        const response = await GET(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(mockConfig);
        expect(getAuctionConfig).toHaveBeenCalled();
      });

      it('should handle errors during fetching config', async () => {
        const { getAuctionConfig } = vi.mocked(await import('$lib/server/db'));
        getAuctionConfig.mockRejectedValue(new Error('DB Error'));

        const response = await GET(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.code).toBe('INTERNAL_ERROR');
      });
    });

    describe('PUT', () => {
      it('should update the auction config', async () => {
        const newConfig = { auctionType: 'dutch', allowNewItems: false };
        const updatedConfig = { id: 1, ...newConfig };
        (event.request as any).json.mockResolvedValue(newConfig);
        const { updateAuctionConfig } = vi.mocked(await import('$lib/server/db'));
        updateAuctionConfig.mockResolvedValue(updatedConfig);

        const response = await PUT(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual(updatedConfig);
        expect(updateAuctionConfig).toHaveBeenCalledWith(expect.objectContaining(newConfig));
      });

      it('should return 400 for invalid input data', async () => {
        const invalidConfig = { auctionType: 'invalid-type' }; // Invalid type
        (event.request as any).json.mockResolvedValue(invalidConfig);

        const response = await PUT(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.code).toBe('INVALID_INPUT');
        const { updateAuctionConfig } = vi.mocked(await import('$lib/server/db'));
        expect(updateAuctionConfig).not.toHaveBeenCalled();
      });

      it('should require admin authentication', async () => {
        // Override cookie mock to simulate non-admin
        (event.cookies as any).get.mockReturnValue('false');
        (event.locals as any) = {}; // Clear admin status in locals
        
        const newConfig = { auctionType: 'dutch', allowNewItems: false };
        (event.request as any).json.mockResolvedValue(newConfig);

        const response = await PUT(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(401); // Unauthorized
        expect(data.code).toBe('UNAUTHORIZED');
      });

      it('should handle errors during update', async () => {
        const newConfig = { auctionType: 'dutch', allowNewItems: true };
        (event.request as any).json.mockResolvedValue(newConfig);
        const { updateAuctionConfig } = vi.mocked(await import('$lib/server/db'));
        updateAuctionConfig.mockRejectedValue(new Error('DB Update Failed'));

        const response = await PUT(event as RequestEvent);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.code).toBe('INTERNAL_ERROR');
      });
    });
  });
});