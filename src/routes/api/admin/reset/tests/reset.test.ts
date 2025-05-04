import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '../+server';
import { createRequestEvent, createCookies } from '../../../../../test/utils';
import { setupMockQueries } from '../../../../../test/mocks/db';

describe('Admin Reset API Endpoint', () => {
  beforeEach(() => {
    setupMockQueries();
  });

  describe('POST /api/admin/reset', () => {
    it('should reset the auction when admin is authenticated', async () => {
      const cookies = createCookies({ admin_authenticated: 'true' });
      const event = createRequestEvent({ cookies });

      const response = await POST(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expect.objectContaining({
        success: true,
        message: expect.stringContaining('reset')
      }));
    });

    it('should reject when not authenticated as admin', async () => {
      const cookies = createCookies(); // No admin cookie
      const event = createRequestEvent({ cookies });

      const response = await POST(event);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual(expect.objectContaining({
        error: true,
        code: 'UNAUTHORIZED'
      }));
    });
  });
});