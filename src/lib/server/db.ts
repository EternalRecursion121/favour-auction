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
    console.log('Starting database initialization...');
    
    // First check if tables exist (for first-time setup)
    try {
      // Try to query users table to see if our schema is set up
      await db.query('SELECT 1 FROM users LIMIT 1');
      console.log('Database tables exist, checking configuration...');
    } catch (error) {
      // Tables don't exist yet, create them
      console.log('Database tables do not exist, creating schema...');
      
      await db.query(`
        -- Users table
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          balance INTEGER NOT NULL DEFAULT 100
        );

        -- Auction items table
        CREATE TABLE IF NOT EXISTS items (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          seller_id INTEGER REFERENCES users(id),
          sold BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Auction configuration table
        CREATE TABLE IF NOT EXISTS auction_config (
          id SERIAL PRIMARY KEY,
          auction_type TEXT NOT NULL DEFAULT 'english',
          allow_new_items BOOLEAN DEFAULT TRUE,
          penny_increment INTEGER DEFAULT 1,
          penny_time_extension INTEGER DEFAULT 10,
          penny_min_time INTEGER DEFAULT 30
        );

        -- Auction history table (stores completed auction results)
        CREATE TABLE IF NOT EXISTS auction_history (
          id SERIAL PRIMARY KEY,
          item_id INTEGER REFERENCES items(id),
          item_title TEXT, -- Store item title directly for results display
          seller_id INTEGER REFERENCES users(id),
          seller_name TEXT, -- Store seller name directly
          buyer_id INTEGER REFERENCES users(id),
          buyer_name TEXT, -- Store buyer name directly
          price INTEGER NOT NULL,
          auction_type TEXT NOT NULL,
          completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Bid history table for tracking price changes during an active auction
        CREATE TABLE IF NOT EXISTS bid_history (
          id SERIAL PRIMARY KEY,
          item_id INTEGER REFERENCES items(id),
          user_id INTEGER REFERENCES users(id),
          amount INTEGER NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Balance history table
        CREATE TABLE IF NOT EXISTS balance_history (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          balance INTEGER NOT NULL,
          reason TEXT NOT NULL, -- e.g., 'bid', 'win', 'sell', 'initial'
          item_id INTEGER, -- Can be null for reasons like 'initial' balance
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('Database schema created successfully');
    }
    
    // Check if auction config exists
    // Alias COUNT(*) to count for easier access and safety
    const configResult = await db.query('SELECT COUNT(*) AS count FROM auction_config');
    
    // Safely check if config exists and if count is 0
    if (!configResult.rows.length || !configResult.rows[0] || Number(configResult.rows[0].count) === 0) {
      console.log('Creating default auction configuration...');
      await db.query(`
        INSERT INTO auction_config (
          auction_type, allow_new_items, penny_increment, penny_time_extension, penny_min_time
        ) VALUES (
          'english', true, 1, 10, 30
        )
      `);
      console.log('Default auction configuration created');
    } else {
      console.log('Auction configuration already exists');
    }
    
    // We intentionally don't create any default users
    // to ensure initialization is empty and users must register
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Re-throw the error or handle it more gracefully if needed for startup
    throw new Error(`Database initialization failed: ${error.message}`);
  }
}

// User-related queries
export async function getUserByName(name: string) {
  const result = await db.query('SELECT * FROM users WHERE name = $1', [name]);
  return result.rows[0] || null;
}

export async function getUserById(id: number) {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function createUser(name: string) {
  const result = await db.query(
    'INSERT INTO users (name, balance) VALUES ($1, 100) RETURNING *',
    [name]
  );
  await recordBalanceChange(result.rows[0].id, 100, 'initial', null);
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
    'UPDATE users SET balance = $1 WHERE id = $2 RETURNING balance',
    [newBalance, userId]
  );
  return result.rows[0]?.balance;
}

export async function recordBalanceChange(
  userId: number, 
  newBalance: number, 
  reason: 'bid' | 'win' | 'sell' | 'initial',
  itemId: number | null, // itemId can be null for 'initial' balance
  client?: VercelPoolClient
) {
  const queryExecutor = client || db;
  await queryExecutor.query(
    'INSERT INTO balance_history (user_id, balance, reason, item_id) VALUES ($1, $2, $3, $4)',
    [userId, newBalance, reason, itemId]
  );
}

export async function getUserBalanceHistory(userId: number) {
  // Join with items table to get item titles
  const result = await db.query(`
    SELECT bh.*, i.title as item_title 
    FROM balance_history bh
    LEFT JOIN items i ON bh.item_id = i.id
    WHERE bh.user_id = $1 
    ORDER BY bh.timestamp DESC
  `, [userId]);
  return result.rows;
}

// Item-related queries
export async function getAllItems(soldOnly = false) {
  let query = 'SELECT i.*, u.name as seller_name FROM items i JOIN users u ON i.seller_id = u.id';
  if (soldOnly) {
    query += ' WHERE i.sold = TRUE';
  }
  query += ' ORDER BY i.created_at DESC';
  const result = await db.query(query);
  return result.rows;
}

export async function getUnsoldItems() {
  const result = await db.query('SELECT i.*, u.name as seller_name FROM items i JOIN users u ON i.seller_id = u.id WHERE i.sold = FALSE ORDER BY i.created_at ASC');
  return result.rows;
}

export async function getItemById(id: number) {
  const result = await db.query('SELECT i.*, u.name as seller_name FROM items i JOIN users u ON i.seller_id = u.id WHERE i.id = $1', [id]);
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

// Auction configuration queries
export async function getAuctionConfig() {
  const result = await db.query('SELECT * FROM auction_config ORDER BY id DESC LIMIT 1');
  const config = result.rows[0];
  if (config) {
    return {
      auctionType: config.auction_type,
      allowNewItems: config.allow_new_items,
      pennyAuctionConfig: {
        incrementAmount: config.penny_increment,
        timeExtension: config.penny_time_extension,
        minimumTimeRemaining: config.penny_min_time
      }
    };
  }
  return null; // Or throw an error if config is essential
}

export async function updateAuctionConfig(config: Partial<Omit<typeof AuctionConfig, 'pennyAuctionConfig'> & { penny_increment?: number, penny_time_extension?: number, penny_min_time?: number }>) {
  // Fetch current config to update, assuming one row exists
  await db.query(`
    UPDATE auction_config
    SET 
      auction_type = COALESCE($1, auction_type),
      allow_new_items = COALESCE($2, allow_new_items),
      penny_increment = COALESCE($3, penny_increment),
      penny_time_extension = COALESCE($4, penny_time_extension),
      penny_min_time = COALESCE($5, penny_min_time)
    WHERE id = (SELECT id FROM auction_config ORDER BY id DESC LIMIT 1) -- Ensure we update the latest/only config
  `, [
    config.auctionType,
    config.allowNewItems,
    config.penny_increment,
    config.penny_time_extension,
    config.penny_min_time
  ]);
  return getAuctionConfig();
}

// Bid history queries (for active auctions)
export async function recordBid(itemId: number, userId: number, amount: number, client?: VercelPoolClient) {
  const queryExecutor = client || db;
  await queryExecutor.query(
    'INSERT INTO bid_history (item_id, user_id, amount) VALUES ($1, $2, $3)',
    [itemId, userId, amount]
  );
}

export async function getBidsForItem(itemId: number) {
  const result = await db.query(
    'SELECT bh.*, u.name as user_name FROM bid_history bh JOIN users u ON bh.user_id = u.id WHERE bh.item_id = $1 ORDER BY bh.timestamp ASC',
    [itemId]
  );
  return result.rows;
}

// Auction history queries (for completed auctions / results)
export async function recordAuctionResult(
  itemId: number, 
  itemTitle: string, // Denormalize for easy lookup
  sellerId: number, 
  sellerName: string, // Denormalize
  buyerId: number, 
  buyerName: string, // Denormalize
  price: number, 
  auctionType: string,
  client?: VercelPoolClient
) {
  const queryExecutor = client || db;
  await queryExecutor.query(`
    INSERT INTO auction_history 
      (item_id, item_title, seller_id, seller_name, buyer_id, buyer_name, price, auction_type)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [itemId, itemTitle, sellerId, sellerName, buyerId, buyerName, price, auctionType]);
}

export async function getAuctionResults() {
  // Fetch completed auction results, ordered by completion time
  const result = await db.query(`
    SELECT 
      id, 
      item_title AS item, 
      seller_name AS seller, 
      buyer_name AS buyer, 
      price, 
      auction_type AS auctionType 
    FROM auction_history 
    ORDER BY completed_at DESC
  `);
  return result.rows;
}

// Admin actions
export async function resetAuctionData() {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Delete all bids first due to foreign key constraints
    await client.query('TRUNCATE TABLE bid_history CASCADE'); 
    // Then auction history
    await client.query('TRUNCATE TABLE auction_history CASCADE');
    // Then items
    await client.query('TRUNCATE TABLE items CASCADE');
    // Balance history
    await client.query('TRUNCATE TABLE balance_history CASCADE');
    
    // Reset users to default balance
    // Important: This assumes users should persist, only their auction-related data is reset.
    // If users should also be deleted, this part needs modification.
    await client.query('UPDATE users SET balance = 100');

    // Reset the auction_config to its default values
    // Assuming only one config row exists or we are resetting the latest one.
    // It might be better to DELETE and INSERT if multiple configs could exist (though unlikely for this app).
    const defaultConfig = {
      auctionType: 'english',
      allowNewItems: true,
      penny_increment: 1,
      penny_time_extension: 10,
      penny_min_time: 30
    };
    await client.query(`
      UPDATE auction_config
      SET auction_type = $1, 
          allow_new_items = $2,
          penny_increment = $3,
          penny_time_extension = $4,
          penny_min_time = $5
      WHERE id = (SELECT id FROM auction_config ORDER BY id DESC LIMIT 1) -- Target the latest/only config
    `, [
      defaultConfig.auctionType, 
      defaultConfig.allowNewItems, 
      defaultConfig.penny_increment, 
      defaultConfig.penny_time_extension, 
      defaultConfig.penny_min_time
    ]);
    
    // If no config row existed, this UPDATE would do nothing. 
    // An alternative would be to ensure a config row is present (like in initializeDatabase).
    // For simplicity, we assume initializeDatabase has run and a config row is present.

    await client.query('COMMIT');
    console.log('Auction data reset successfully.');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resetting auction data:', error);
    return false;
  } finally {
    client.release();
  }
}