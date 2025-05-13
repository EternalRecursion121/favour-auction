/**
 * Mock database functions for build/development environments
 * This file is used when the DATABASE_URL environment variable is not properly set
 * For example during build processes or CI/CD
 */

// Mock client to avoid build errors when no DB is connected
export const db = {
  query: async () => ({ rows: [] }),
  connect: async () => ({
    query: async () => ({ rows: [] }),
    release: () => {}
  })
};

// User-related queries
export async function getUserByName(name: string) {
  console.warn('Using mock getUserByName');
  if (name === 'testuser') {
    return { id: 1, name: 'testuser', balance: 100 };
  }
  return null;
}

export async function createUser(name: string) {
  console.warn('Using mock createUser');
  return { id: Math.floor(Math.random() * 1000), name, balance: 100 };
}

export async function getOrCreateUser(name: string) {
  console.warn('Using mock getOrCreateUser');
  let user = await getUserByName(name);
  if (!user) {
    user = await createUser(name);
  }
  return user;
}

export async function getUserBalance(userId: number) {
  console.warn('Using mock getUserBalance for user:', userId);
  return 100; // Default mock balance
}

export async function updateUserBalance(userId: number, newBalance: number) {
  console.warn('Using mock updateUserBalance for user:', userId, 'to balance:', newBalance);
  return { id: userId, balance: newBalance };
}

export async function recordBalanceChange(userId: number, newBalance: number, reason: string, itemId: number | null) {
  console.warn('Using mock recordBalanceChange:', { userId, newBalance, reason, itemId });
}

export async function getUserBalanceHistory(userId: number) {
  console.warn('Using mock getUserBalanceHistory for user:', userId);
  return []; // Default empty history
}

// Item-related queries
export async function getAllItems(soldOnly = false) {
  console.warn('Using mock getAllItems, soldOnly:', soldOnly);
  const mockItems = [
    { id: 1, title: 'Mock Item 1', description: 'Desc 1', seller_id: 1, seller_name: 'testuser', sold: false, created_at: new Date().toISOString() },
    { id: 2, title: 'Mock Item 2', description: 'Desc 2', seller_id: 1, seller_name: 'testuser', sold: true, created_at: new Date().toISOString() },
  ];
  return soldOnly ? mockItems.filter(item => item.sold) : mockItems;
}

export async function getItemById(id: number) {
  console.warn('Using mock getItemById for ID:', id);
  if (id === 1) {
    return { id: 1, title: 'Mock Item 1', description: 'Desc 1', seller_id: 1, seller_name: 'testuser', sold: false, created_at: new Date().toISOString() };
  }
  return null;
}

export async function createItem(title: string, description: string, sellerId: number) {
  console.warn('Using mock createItem:', { title, description, sellerId });
  return { id: Math.floor(Math.random() * 1000), title, description, seller_id: sellerId, sold: false, created_at: new Date().toISOString() };
}

export async function markItemAsSold(itemId: number) {
  console.warn('Using mock markItemAsSold for item:', itemId);
}

export async function getUnsoldItems() {
  console.warn('Using mock getUnsoldItems');
  return [{ id: 1, title: 'Mock Unsold Item', description: 'An item for testing', seller_id: 1, seller_name: 'testuser', sold: false, created_at: new Date().toISOString() }];
}

// Auction-related queries
export async function getAuctionConfig() {
  console.warn('Using mock getAuctionConfig');
  return {
    auctionType: 'english',
    allowNewItems: true,
    pennyAuctionConfig: {
      incrementAmount: 1,
      timeExtension: 10,
      minimumTimeRemaining: 30
    }
  };
}

export async function updateAuctionConfig(config: any) {
  console.warn('Using mock updateAuctionConfig with:', config);
  return config; // Return the passed config for simplicity
}

export async function recordAuctionResult(itemId: number, itemTitle: string, sellerId: number, sellerName: string, buyerId: number, buyerName: string, price: number, auctionType: string) {
  console.warn('Using mock recordAuctionResult:', { itemId, itemTitle, sellerId, sellerName, buyerId, buyerName, price, auctionType });
}

export async function getAuctionResults() {
  console.warn('Using mock getAuctionResults');
  return [
    { id: 1, item: 'Mock Sold Item 1', seller: 'sellerUser', buyer: 'buyerUser', price: 50, auctionType: 'english' },
  ];
}

export async function recordBid(itemId: number, userId: number, amount: number) {
  console.warn('Using mock recordBid:', { itemId, userId, amount });
}

export async function getBidsForItem(itemId: number) {
  console.warn('Using mock getBidsForItem for item:', itemId);
  return []; // Default empty bids
}

export async function resetAuctionData() {
  console.warn('Using mock resetAuctionData');
  return true;
}