import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { server } from './mocks/server';

// Create a mock for the @vercel/postgres client
export const mockDbClient = {
  query: vi.fn(),
  sql: vi.fn(),
  connect: vi.fn().mockImplementation(() => ({
    query: vi.fn().mockImplementation((...args) => mockDbClient.query(...args)),
    release: vi.fn()
  }))
};

// Define the global jest object that the test files use
global.jest = {
  spyOn: vi.spyOn,
  fn: vi.fn
};

// Force the use of mock DB in tests by mocking environment
process.env.NODE_ENV = 'test';

// Mock modules
vi.mock('@vercel/postgres', () => {
  return {
    createClient: vi.fn(() => mockDbClient)
  };
});

// Mock environment variables
vi.mock('$env/dynamic/private', () => ({
  env: {
    DATABASE_URL: undefined,
    ADMIN_PASSWORD: 'test-admin-password'
  }
}));

// Force use of mock DB by removing environment variables
delete process.env.DATABASE_URL;
delete process.env.VERCEL;

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

// Mock db response
mockDbClient.query.mockImplementation((query, params = []) => {
  console.log(`Mock DB query: ${query}`, params);
  
  // Mock auction config
  if (query.includes('SELECT * FROM auction_config')) {
    return Promise.resolve({ 
      rows: [{
        id: 1,
        auction_type: 'english',
        allow_new_items: true,
        penny_increment: 1,
        penny_time_extension: 10,
        penny_min_time: 30
      }]
    });
  }
  
  // Mock update auction config
  if (query.includes('UPDATE auction_config')) {
    return Promise.resolve({ 
      rows: [{
        id: 1,
        auction_type: params[0],
        allow_new_items: params[1],
        penny_increment: params[2] || 1,
        penny_time_extension: params[3] || 10,
        penny_min_time: params[4] || 30
      }]
    });
  }

  // Handle other queries with empty results
  return Promise.resolve({ rows: [] });
});

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());