import { vi } from 'vitest';

// Mock auction state
export const mockAuctionState = {
  active: true,
  itemId: 1,
  startTime: new Date(),
  endTime: new Date(Date.now() + 60000), // 1 minute from now
  auctionType: 'english',
  priceHistory: [
    { timestamp: new Date(Date.now() - 60000), price: 0 },
    { timestamp: new Date(Date.now() - 30000), price: 10 }
  ],
  highestBid: 10,
  highestBidderId: 1
};

// Mock for auction module
export function setupMockAuction() {
  // Mock the auction module
  vi.mock('$lib/server/auction', () => ({
    getAuctionState: vi.fn().mockReturnValue(mockAuctionState),
    
    processBid: vi.fn().mockImplementation((userId, itemId, bidAmount) => {
      if (bidAmount <= mockAuctionState.highestBid) {
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
    
    startAuction: vi.fn().mockImplementation((itemId) => {
      return Promise.resolve({
        ...mockAuctionState,
        itemId
      });
    }),
    
    endAuction: vi.fn().mockReturnValue({
      itemId: mockAuctionState.itemId,
      finalPrice: mockAuctionState.highestBid,
      winnerId: mockAuctionState.highestBidderId,
      auctionType: mockAuctionState.auctionType
    }),
    
    getFinalPrice: vi.fn().mockImplementation((userId) => {
      if (userId === mockAuctionState.highestBidderId) {
        return Promise.resolve(mockAuctionState.highestBid);
      }
      return Promise.resolve(0);
    })
  }));
}