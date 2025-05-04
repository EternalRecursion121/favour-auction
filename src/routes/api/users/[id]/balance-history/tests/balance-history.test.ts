import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../+server';
import { createRequestEvent } from '../../../../../../test/utils';
import { setupMockQueries } from '../../../../../../test/mocks/db';

// Mock the getUserBalanceHistory function
vi.mock('$lib/server/db', async () => {
  const actual = await vi.importActual('$lib/server/db');
  return {
    ...actual,
    getUserBalanceHistory: vi.fn().mockResolvedValue([
      {
        timestamp: '2023-05-01T12:00:00Z',
        balance: 100,
        reason: 'bid',
        item_id: 1,
        item_title: 'Test Item 1'
      },
      {
        timestamp: '2023-05-01T12:30:00Z',
        balance: 85,
        reason: 'win',
        item_id: 2,
        item_title: 'Test Item 2'
      }
    ])
  };
});

describe('Balance History API Endpoint', () => {
  beforeEach(() => {
    setupMockQueries();
  });

  describe('GET /api/users/[id]/balance-history', () => {
    it('should return balance history for a user', async () => {
      const event = createRequestEvent({ params: { id: '1' } });

      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expect.arrayContaining([
        expect.objectContaining({
          timestamp: expect.any(String),
          balance: expect.any(Number),
          reason: expect.any(String),
          itemId: expect.any(Number),
          itemTitle: expect.any(String)
        })
      ]));
      expect(data.length).toBe(2);
    });

    it('should return error for invalid user ID', async () => {
      const event = createRequestEvent({ params: { id: 'invalid' } });

      const response = await GET(event);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(true);
      expect(data.code).toBe('INVALID_INPUT');
    });
  });
});