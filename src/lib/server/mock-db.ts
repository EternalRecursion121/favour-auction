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
  return null;
}

export async function createUser(name: string) {
  console.warn('Using mock createUser');
  return { id: 1, name, balance: 100 };
}

export async function getOrCreateUser(name: string) {
  console.warn('Using mock getOrCreateUser');
  return { id: 1, name, balance: 100 };
}

export async function getUserBalance(userId: number) {
  console.warn('Using mock getUserBalance');
  return 100;
}

export async function updateUserBalance(userId: number, newBalance: number) {
  console.warn('Using mock updateUserBalance');
  return { id: userId, balance: newBalance };
}

export async function recordBalanceChange(userId: number, newBalance: number, reason: string, itemId: number) {
  console.warn('Using mock recordBalanceChange');
  return;
}

export async function getUserBalanceHistory(userId: number) {
  console.warn('Using mock getUserBalanceHistory');
  return [];
}

// Item-related queries
export async function getAllItems() {
  console.warn('Using mock getAllItems');
  return [];
}

export async function getItemById(itemId: number) {
  console.warn('Using mock getItemById');
  return null;
}

export async function createItem(title: string, description: string, sellerId: number) {
  console.warn('Using mock createItem');
  return {
    id: 1,
    title,
    description,
    seller_id: sellerId,
    seller_name: 'Mock User',
    sold: false,
    created_at: new Date().toISOString()
  };
}

export async function markItemAsSold(itemId: number) {
  console.warn('Using mock markItemAsSold');
  return;
}

export async function getUnsoldItems() {
  console.warn('Using mock getUnsoldItems');
  return [];
}

// Auction-related queries
export async function getCurrentAuctionConfig() {
  console.warn('Using mock getCurrentAuctionConfig');
  return {
    auction_type: 'english',
    allow_new_items: true,
    penny_increment: 1,
    penny_time_extension: 10,
    penny_min_time: 30
  };
}

export async function updateAuctionConfig(
  auctionType: string,
  allowNewItems: boolean,
  pennyIncrement?: number,
  pennyTimeExtension?: number,
  pennyMinTime?: number
) {
  console.warn('Using mock updateAuctionConfig');
  return {
    auction_type: auctionType,
    allow_new_items: allowNewItems,
    penny_increment: pennyIncrement || 1,
    penny_time_extension: pennyTimeExtension || 10,
    penny_min_time: pennyMinTime || 30
  };
}

export async function recordAuctionResult(
  itemId: number,
  sellerId: number,
  buyerId: number,
  price: number,
  auctionType: string
) {
  console.warn('Using mock recordAuctionResult');
  return {
    id: 1,
    item_id: itemId,
    seller_id: sellerId,
    buyer_id: buyerId,
    price,
    auction_type: auctionType,
    completed_at: new Date().toISOString()
  };
}

export async function getAuctionResults() {
  console.warn('Using mock getAuctionResults');
  return [];
}

export async function recordBid(userId: number, itemId: number, amount: number) {
  console.warn('Using mock recordBid');
  return {
    id: 1,
    user_id: userId,
    item_id: itemId,
    amount,
    timestamp: new Date().toISOString()
  };
}

export async function getBidsForItem(itemId: number) {
  console.warn('Using mock getBidsForItem');
  return [];
}

export async function resetAuction() {
  console.warn('Using mock resetAuction');
  return true;
}