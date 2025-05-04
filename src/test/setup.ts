import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from './mocks/server';

// Create a mock for the @vercel/postgres client
export const mockDbClient = {
  query: vi.fn(),
  sql: vi.fn()
};

// Define the global jest object that the test files use
global.jest = {
  spyOn: vi.spyOn,
  fn: vi.fn
};

// Mock modules
vi.mock('@vercel/postgres', () => {
  return {
    createClient: vi.fn(() => mockDbClient)
  };
});

// We need to mock the auction module to prevent circular dependencies
vi.mock('$lib/server/auction', () => {
  return {
    getAuctionState: vi.fn(() => ({
      active: true,
      itemId: 1,
      startTime: new Date(),
      endTime: new Date(Date.now() + 60000),
      auctionType: 'english',
      priceHistory: [
        { timestamp: new Date(Date.now() - 60000), price: 0 },
        { timestamp: new Date(Date.now() - 30000), price: 10 }
      ],
      highestBid: 10,
      highestBidderId: 1
    })),
    
    processBid: vi.fn((userId, itemId, bidAmount) => {
      if (bidAmount <= 10) {
        return Promise.resolve({
          accepted: false,
          message: 'Bid must be higher than current highest bid'
        });
      }
      
      return Promise.resolve({
        accepted: true,
        newPrice: bidAmount
      });
    }),
    
    startAuction: vi.fn((itemId) => {
      return Promise.resolve({
        active: true,
        itemId,
        startTime: new Date(),
        endTime: null,
        auctionType: 'english',
        priceHistory: [{ timestamp: new Date(), price: 0 }],
        highestBid: 0,
        highestBidderId: null
      });
    }),
    
    endAuction: vi.fn(() => ({
      itemId: 1,
      finalPrice: 10,
      winnerId: 1,
      auctionType: 'english'
    })),
    
    getFinalPrice: vi.fn((userId) => {
      if (userId === 1) {
        return Promise.resolve(10);
      }
      return Promise.resolve(0);
    })
  };
});

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());