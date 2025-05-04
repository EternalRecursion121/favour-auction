import { vi } from 'vitest';
import { mockDbClient } from '../setup';

// Mock database objects
export const mockUsers = [
  { id: 1, name: 'TestUser1', balance: 100 },
  { id: 2, name: 'TestUser2', balance: 150 }
];

export const mockItems = [
  { 
    id: 1, 
    title: 'Test Item 1', 
    description: 'Description for test item 1', 
    seller_id: 1,
    seller_name: 'TestUser1',
    sold: false,
    created_at: new Date().toISOString()
  },
  { 
    id: 2, 
    title: 'Test Item 2', 
    description: 'Description for test item 2', 
    seller_id: 2,
    seller_name: 'TestUser2',
    sold: false,
    created_at: new Date().toISOString() 
  }
];

export const mockAuctionConfig = {
  id: 1,
  auction_type: 'english',
  allow_new_items: true,
  penny_increment: 1,
  penny_time_extension: 10,
  penny_min_time: 30
};

export const mockBidHistory = [
  { 
    id: 1, 
    user_id: 1, 
    user_name: 'TestUser1', 
    item_id: 1, 
    amount: 10, 
    timestamp: new Date().toISOString() 
  },
  { 
    id: 2, 
    user_id: 2, 
    user_name: 'TestUser2', 
    item_id: 1, 
    amount: 15, 
    timestamp: new Date().toISOString() 
  }
];

export const mockAuctionResults = [
  { 
    id: 1,
    item_id: 1,
    item_title: 'Test Item 1',
    item_description: 'Description for test item 1',
    seller_id: 1,
    seller_name: 'TestUser1',
    buyer_id: 2,
    buyer_name: 'TestUser2',
    price: 15,
    auction_type: 'english',
    completed_at: new Date().toISOString()
  }
];

// Setup common query responses
export function setupMockQueries() {
  // Reset the mock
  mockDbClient.query.mockReset();

  // Mock the database functions directly
  vi.mock('$lib/server/db', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      db: mockDbClient,
      getUserByName: vi.fn((name) => {
        const user = mockUsers.find(u => u.name === name);
        return Promise.resolve(user || null);
      }),
      createUser: vi.fn((name) => {
        const newUser = {
          id: mockUsers.length + 1,
          name,
          balance: 100
        };
        return Promise.resolve(newUser);
      }),
      getOrCreateUser: vi.fn((name) => {
        const user = mockUsers.find(u => u.name === name);
        if (user) return Promise.resolve(user);
        
        const newUser = {
          id: mockUsers.length + 1,
          name,
          balance: 100
        };
        return Promise.resolve(newUser);
      }),
      getUserBalance: vi.fn((userId) => {
        const user = mockUsers.find(u => u.id === userId);
        return Promise.resolve(user ? user.balance : 0);
      }),
      getAllItems: vi.fn(() => Promise.resolve(mockItems)),
      getItemById: vi.fn((id) => {
        const item = mockItems.find(i => i.id === id);
        return Promise.resolve(item || null);
      }),
      createItem: vi.fn((title, description, sellerId) => {
        const newItem = {
          id: mockItems.length + 1,
          title,
          description,
          seller_id: sellerId,
          seller_name: mockUsers.find(u => u.id === sellerId)?.name || 'Unknown',
          sold: false,
          created_at: new Date().toISOString()
        };
        return Promise.resolve(newItem);
      }),
      getCurrentAuctionConfig: vi.fn(() => Promise.resolve(mockAuctionConfig)),
      getBidsForItem: vi.fn((itemId) => {
        return Promise.resolve(mockBidHistory.filter(b => b.item_id === itemId));
      }),
      getUnsoldItems: vi.fn(() => Promise.resolve(mockItems.filter(i => !i.sold))),
      getAuctionResults: vi.fn(() => Promise.resolve(mockAuctionResults)),
      resetAuction: vi.fn(() => Promise.resolve(true)),
      updateAuctionConfig: vi.fn((auctionType, allowNewItems, pennyIncrement, pennyTimeExtension, pennyMinTime) => {
        const updatedConfig = {
          ...mockAuctionConfig,
          auction_type: auctionType,
          allow_new_items: allowNewItems,
          penny_increment: pennyIncrement || mockAuctionConfig.penny_increment,
          penny_time_extension: pennyTimeExtension || mockAuctionConfig.penny_time_extension,
          penny_min_time: pennyMinTime || mockAuctionConfig.penny_min_time
        };
        return Promise.resolve(updatedConfig);
      }),
      recordBid: vi.fn((userId, itemId, amount) => {
        const newBid = {
          id: mockBidHistory.length + 1,
          user_id: userId,
          item_id: itemId,
          amount,
          timestamp: new Date().toISOString(),
          user_name: mockUsers.find(u => u.id === userId)?.name || 'Unknown'
        };
        return Promise.resolve(newBid);
      })
    };
  });

  // User queries
  mockDbClient.query.mockImplementation((query, params) => {
    // Get user by name
    if (query.includes('SELECT * FROM users WHERE name =')) {
      const user = mockUsers.find(u => u.name === params[0]);
      return Promise.resolve({ rows: user ? [user] : [] });
    }
    
    // Create user
    if (query.includes('INSERT INTO users (name, balance) VALUES')) {
      const newUser = {
        id: mockUsers.length + 1,
        name: params[0],
        balance: 100
      };
      return Promise.resolve({ rows: [newUser] });
    }

    // Get user balance
    if (query.includes('SELECT balance FROM users WHERE id =')) {
      const user = mockUsers.find(u => u.id === params[0]);
      return Promise.resolve({ rows: user ? [{ balance: user.balance }] : [] });
    }

    // Get all items
    if (query.includes('SELECT items.*, users.name as seller_name FROM items')) {
      return Promise.resolve({ rows: mockItems });
    }

    // Get item by ID
    if (query.includes('WHERE items.id =')) {
      const item = mockItems.find(i => i.id === params[0]);
      return Promise.resolve({ rows: item ? [item] : [] });
    }

    // Create item
    if (query.includes('INSERT INTO items (title, description, seller_id)')) {
      const newItem = {
        id: mockItems.length + 1,
        title: params[0],
        description: params[1],
        seller_id: params[2],
        seller_name: mockUsers.find(u => u.id === params[2])?.name || 'Unknown',
        sold: false,
        created_at: new Date().toISOString()
      };
      return Promise.resolve({ rows: [newItem] });
    }

    // Get auction config
    if (query.includes('SELECT * FROM auction_config')) {
      return Promise.resolve({ rows: [mockAuctionConfig] });
    }

    // Update auction config
    if (query.includes('UPDATE auction_config')) {
      const updatedConfig = {
        ...mockAuctionConfig,
        auction_type: params[0],
        allow_new_items: params[1],
        penny_increment: params[2],
        penny_time_extension: params[3],
        penny_min_time: params[4]
      };
      return Promise.resolve({ rows: [updatedConfig] });
    }

    // Get bids for item
    if (query.includes('SELECT bid_history.*, users.name as user_name')) {
      const bids = mockBidHistory.filter(b => b.item_id === params[0]);
      return Promise.resolve({ rows: bids });
    }

    // Record bid
    if (query.includes('INSERT INTO bid_history')) {
      const newBid = {
        id: mockBidHistory.length + 1,
        user_id: params[0],
        item_id: params[1],
        amount: params[2],
        timestamp: new Date().toISOString(),
        user_name: mockUsers.find(u => u.id === params[0])?.name || 'Unknown'
      };
      return Promise.resolve({ rows: [newBid] });
    }

    // Get auction results
    if (query.includes('SELECT auction_history.*')) {
      return Promise.resolve({ rows: mockAuctionResults });
    }

    // Get unsold items
    if (query.includes('SELECT * FROM items WHERE sold = FALSE')) {
      return Promise.resolve({ rows: mockItems.filter(i => !i.sold) });
    }

    // Reset auction
    if (query.includes('BEGIN') || query.includes('COMMIT') || query.includes('ROLLBACK')) {
      return Promise.resolve({});
    }

    // Default response for unmatched queries
    console.warn('Unhandled mock query:', query);
    return Promise.resolve({ rows: [] });
  });
}