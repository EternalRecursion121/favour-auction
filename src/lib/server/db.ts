import { createClient } from '@vercel/postgres';
import type { VercelPoolClient } from '@vercel/postgres';

// Create a function to get the DB client or a mock client
function getDbClient() {
  try {
    // Check if we're in a Vercel environment with proper env vars
    if (process.env.VERCEL && process.env.DATABASE_URL) {
      return createClient();
    }
    
    // Use from .env file in local development
    if (process.env.DATABASE_URL) {
      return createClient();
    }
    
    // No valid DB connection available
    throw new Error('No valid DATABASE_URL available');
  } catch (error) {
    console.warn('Database connection error, using mock client:', error);
    // Create a more robust mock client with default data
    return {
      // Return default user data for queries
      query: async (sql: string, params: any[] = []) => {
        console.log(`Mock DB query: ${sql}`, params);
        
        // Return mock data based on the query
        if (sql.includes('INSERT INTO users')) {
          return {
            rows: [{ id: 1, name: params[0], balance: 100 }]
          };
        }
        
        if (sql.includes('SELECT * FROM users')) {
          return {
            rows: [{ id: 1, name: params[0], balance: 100 }]
          };
        }
        
        // Default empty response
        return { rows: [] };
      },
      // Return mock connection with same behavior
      connect: async () => ({
        query: async (sql: string, params: any[] = []) => {
          console.log(`Mock DB connection query: ${sql}`, params);
          return { rows: [] };
        },
        release: () => {}
      })
    };
  }
}

// Export the database client
export const db = getDbClient();

// For tests, we expose the full mock DB client
// This allows tests to properly mock DB responses
export const mockClient = process.env.NODE_ENV === 'test' ? db : null;

// Initialize database with required config
export async function initializeDatabase() {
  try {
    // Check if auction config exists
    const configResult = await db.query('SELECT COUNT(*) FROM auction_config');

    // If no config exists, create default one
    if (configResult.rows[0].count === '0') {
      console.log('Creating default auction configuration...');
      await db.query(`
        INSERT INTO auction_config (
          auction_type, allow_new_items, penny_increment, penny_time_extension, penny_min_time
        ) VALUES (
          'english', true, 1, 10, 30
        )
      `);
    }

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

// User-related queries
export async function getUserByName(name: string) {
  const result = await db.query('SELECT * FROM users WHERE name = $1', [name]);
  return result.rows[0] || null;
}

export async function createUser(name: string) {
  const result = await db.query(
    'INSERT INTO users (name, balance) VALUES ($1, 100) RETURNING *',
    [name]
  );
  return result.rows[0];
}

export async function getOrCreateUser(name: string) {
  let user = await getUserByName(name);
  if (!user) {
    user = await createUser(name);
  }
  return user;
}

export async function getUserBalance(userId: number) {
  const result = await db.query('SELECT balance FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.balance || 0;
}

export async function updateUserBalance(userId: number, newBalance: number, client?: VercelPoolClient) {
  const queryExecutor = client || db;
  const result = await queryExecutor.query(
    'UPDATE users SET balance = $1 WHERE id = $2 RETURNING *',
    [newBalance, userId]
  );
  return result.rows[0];
}

export async function recordBalanceChange(
  userId: number, 
  newBalance: number, 
  reason: 'bid' | 'win' | 'sell',
  itemId: number,
  client?: VercelPoolClient
) {
  const queryExecutor = client || db;
  await queryExecutor.query(
    'INSERT INTO balance_history (user_id, balance, reason, item_id) VALUES ($1, $2, $3, $4)',
    [userId, newBalance, reason, itemId]
  );
}

export async function getUserBalanceHistory(userId: number) {
  const result = await db.query(
    `SELECT balance_history.*, items.title as item_title
     FROM balance_history
     LEFT JOIN items ON balance_history.item_id = items.id
     WHERE user_id = $1
     ORDER BY timestamp DESC`,
    [userId]
  );
  return result.rows;
}

// Item-related queries
export async function getAllItems() {
  const result = await db.query(
    `SELECT items.*, users.name as seller_name 
     FROM items 
     JOIN users ON items.seller_id = users.id
     ORDER BY items.created_at DESC`
  );
  return result.rows;
}

export async function getItemById(itemId: number) {
  const result = await db.query(
    `SELECT items.*, users.name as seller_name 
     FROM items 
     JOIN users ON items.seller_id = users.id
     WHERE items.id = $1`,
    [itemId]
  );
  return result.rows[0] || null;
}

export async function createItem(title: string, description: string, sellerId: number) {
  const result = await db.query(
    'INSERT INTO items (title, description, seller_id) VALUES ($1, $2, $3) RETURNING *',
    [title, description, sellerId]
  );
  return result.rows[0];
}

export async function markItemAsSold(itemId: number, client?: VercelPoolClient) {
  const queryExecutor = client || db;
  await queryExecutor.query('UPDATE items SET sold = TRUE WHERE id = $1', [itemId]);
}

export async function getUnsoldItems() {
  const result = await db.query('SELECT * FROM items WHERE sold = FALSE ORDER BY created_at');
  return result.rows;
}

// Auction-related queries
export async function getCurrentAuctionConfig() {
  const result = await db.query('SELECT * FROM auction_config ORDER BY id DESC LIMIT 1');

  // Return default config if none exists
  if (!result.rows[0]) {
    return {
      id: 1,
      auction_type: 'english',
      allow_new_items: true,
      penny_increment: 1,
      penny_time_extension: 10,
      penny_min_time: 30
    };
  }

  return result.rows[0];
}

export async function updateAuctionConfig(
  auctionType: string, 
  allowNewItems: boolean, 
  pennyIncrement?: number, 
  pennyTimeExtension?: number, 
  pennyMinTime?: number
) {
  const result = await db.query(
    `UPDATE auction_config 
     SET auction_type = $1, allow_new_items = $2, 
         penny_increment = $3, penny_time_extension = $4, penny_min_time = $5
     RETURNING *`,
    [
      auctionType, 
      allowNewItems, 
      pennyIncrement || 1, 
      pennyTimeExtension || 10, 
      pennyMinTime || 30
    ]
  );
  return result.rows[0];
}

export async function recordAuctionResult(
  itemId: number, 
  sellerId: number, 
  buyerId: number, 
  price: number, 
  auctionType: string,
  client?: VercelPoolClient
) {
  const queryExecutor = client || db;
  const result = await queryExecutor.query(
    `INSERT INTO auction_history 
     (item_id, seller_id, buyer_id, price, auction_type) 
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [itemId, sellerId, buyerId, price, auctionType]
  );
  return result.rows[0];
}

export async function getAuctionResults() {
  const result = await db.query(
    `SELECT 
       auction_history.*,
       items.title as item_title,
       items.description as item_description,
       seller.name as seller_name,
       buyer.name as buyer_name
     FROM auction_history
     JOIN items ON auction_history.item_id = items.id
     JOIN users as seller ON auction_history.seller_id = seller.id
     JOIN users as buyer ON auction_history.buyer_id = buyer.id
     ORDER BY auction_history.completed_at DESC`
  );
  return result.rows;
}

export async function recordBid(userId: number, itemId: number, amount: number) {
  const result = await db.query(
    'INSERT INTO bid_history (user_id, item_id, amount) VALUES ($1, $2, $3) RETURNING *',
    [userId, itemId, amount]
  );
  return result.rows[0];
}

export async function getBidsForItem(itemId: number) {
  const result = await db.query(
    `SELECT bid_history.*, users.name as user_name
     FROM bid_history
     JOIN users ON bid_history.user_id = users.id
     WHERE item_id = $1
     ORDER BY amount DESC`,
    [itemId]
  );
  return result.rows;
}

export async function resetAuction() {
  await db.query('BEGIN');
  try {
    await db.query('UPDATE users SET balance = 100');
    await db.query('UPDATE items SET sold = FALSE');
    await db.query('TRUNCATE TABLE auction_history');
    await db.query('TRUNCATE TABLE bid_history');
    await db.query('TRUNCATE TABLE balance_history');
    await db.query('COMMIT');
    return true;
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error resetting auction:', error);
    return false;
  }
}