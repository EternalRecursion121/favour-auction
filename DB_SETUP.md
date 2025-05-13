# Database Setup for Favour Auction

This application uses Neon with Vercel integration for database functionality. Follow these steps to set up your database:

## Step 1: Create a Neon account and project

1. Sign up at [Neon](https://neon.tech/) if you don't have an account yet.
2. Create a new project.
3. In your project dashboard, find your connection string.

## Step 2: Set up environment variables

1. Copy the `.env.example` file to `.env`
2. Replace the placeholder values with your actual database connection details:
   ```
   DATABASE_URL=postgres://user:password@db.example.neon.tech/dbname?sslmode=require
   ADMIN_PASSWORD=your_secure_password
   ```

## Step 3: Database Schema

The Favour Auction application uses the following schema:

### Users Table
Stores user information including balance and auction activity statistics.

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 100,
  items_sold INTEGER DEFAULT 0,
  items_bought INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Items Table
Stores information about auction items.

```sql
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  seller_id INTEGER NOT NULL REFERENCES users(id),
  sold BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Auctions Table
Tracks active and completed auctions.

```sql
CREATE TABLE auctions (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  auction_type TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP WITH TIME ZONE,
  current_price INTEGER DEFAULT 0,
  winning_bidder_id INTEGER REFERENCES users(id),
  active BOOLEAN DEFAULT TRUE,
  time_remaining INTEGER
);
```

### Bids Table
Records all bids made in auctions.

```sql
CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER NOT NULL REFERENCES auctions(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Balance History Table
Tracks changes to user balances.

```sql
CREATE TABLE balance_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  balance INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('bid', 'win', 'sell')),
  item_id INTEGER REFERENCES items(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Auction Results Table
Records the final results of completed auctions.

```sql
CREATE TABLE auction_results (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER NOT NULL REFERENCES auctions(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  seller_id INTEGER NOT NULL REFERENCES users(id),
  buyer_id INTEGER NOT NULL REFERENCES users(id),
  price INTEGER NOT NULL,
  auction_type TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Auction Configuration Table
Stores system-wide auction settings.

```sql
CREATE TABLE auction_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensures only one configuration row
  auction_type TEXT NOT NULL DEFAULT 'english',
  allow_new_items BOOLEAN DEFAULT TRUE,
  penny_auction_config JSONB DEFAULT '{"incrementAmount": 1, "timeExtension": 10, "minimumTimeRemaining": 30}'
);
```

## Step 4: Initialize Database

Run the following SQL queries to set up your initial database state:

```sql
-- Initialize auction configuration
INSERT INTO auction_config (auction_type, allow_new_items) 
VALUES ('english', true) 
ON CONFLICT (id) DO NOTHING;

-- Create sample users (optional)
INSERT INTO users (name, balance) VALUES ('Test User', 100);
```

## Step 5: Install Database Client

Add the required packages to your project:

```bash
npm install @vercel/postgres
```

## Step 6: Create Database Client

Create a file at `src/lib/server/db.ts` with the following content:

```typescript
import { createClient } from '@vercel/postgres';
import type { User, Item, Auction, AuctionConfig, BalanceHistoryEntry, AuctionResult } from '$lib/types';

export const db = createClient();

// User-related queries
export async function getUserByName(name: string): Promise<User | null> {
  const result = await db.query(
    'SELECT id, name, balance, items_sold, items_bought FROM users WHERE name = $1',
    [name]
  );
  return result.rows[0] || null;
}

export async function createUser(name: string): Promise<User> {
  const result = await db.query(
    'INSERT INTO users (name, balance) VALUES ($1, 100) RETURNING id, name, balance, items_sold, items_bought',
    [name]
  );
  return result.rows[0];
}

export async function getUserBalanceHistory(userId: number): Promise<BalanceHistoryEntry[]> {
  const result = await db.query(
    `SELECT bh.timestamp, bh.balance, bh.reason, bh.item_id as "itemId", i.title as "itemTitle"
     FROM balance_history bh
     LEFT JOIN items i ON bh.item_id = i.id
     WHERE bh.user_id = $1
     ORDER BY bh.timestamp DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows;
}

// Item-related queries
export async function getItems(): Promise<Item[]> {
  const result = await db.query(
    `SELECT i.id, i.title, i.description, i.sold, i.created_at as "createdAt",
     json_build_object('id', u.id, 'name', u.name) as seller
     FROM items i
     JOIN users u ON i.seller_id = u.id
     ORDER BY i.created_at DESC`
  );
  return result.rows;
}

export async function addItem(title: string, description: string, sellerId: number): Promise<Item> {
  const result = await db.query(
    `INSERT INTO items (title, description, seller_id) 
     VALUES ($1, $2, $3) 
     RETURNING id, title, description, seller_id, sold, created_at as "createdAt"`,
    [title, description, sellerId]
  );
  
  // Format the result to match the Item interface
  const item = result.rows[0];
  const sellerResult = await db.query('SELECT id, name FROM users WHERE id = $1', [item.seller_id]);
  
  return {
    ...item,
    seller: sellerResult.rows[0]
  };
}

export async function getItemByIdWithHistory(itemId: number): Promise<Item & { auctionHistory: Bid[] } | null> {
  const itemResult = await db.query(
    `SELECT i.id, i.title, i.description, i.sold, i.created_at as "createdAt",
     json_build_object('id', u.id, 'name', u.name) as seller
     FROM items i
     JOIN users u ON i.seller_id = u.id
     WHERE i.id = $1`,
    [itemId]
  );

  if (itemResult.rows.length === 0) {
    return null;
  }

  const itemData = itemResult.rows[0];

  // Get all bids made on this item across all auctions it might have been in.
  // This assumes an item_id link exists in auctions or can be inferred for bids.
  // For simplicity, let's find all auctions for this item, then all bids in those auctions.
  const auctionHistoryResult = await db.query(
    `SELECT b.user_id as "userId", u.name as "userName", b.amount, b.timestamp
     FROM bids b
     JOIN users u ON b.user_id = u.id
     JOIN auctions a ON b.auction_id = a.id
     WHERE a.item_id = $1
     ORDER BY b.timestamp ASC`,
    [itemId]
  );

  return {
    ...itemData,
    auctionHistory: auctionHistoryResult.rows
  };
}

// Auction-related queries
export async function getCurrentAuction(): Promise<Auction | null> {
  const result = await db.query(
    `SELECT a.id, a.active, a.auction_type as "auctionType", 
     a.start_time as "startTime", a.end_time as "endTime", 
     a.current_price as "currentPrice", a.time_remaining as "timeRemaining",
     json_build_object('id', i.id, 'title', i.title, 'description', i.description, 
       'seller', json_build_object('id', u.id, 'name', u.name), 
       'sold', i.sold, 'createdAt', i.created_at) as item,
     json_build_object('id', wu.id, 'name', wu.name) as "winningBidder"
     FROM auctions a
     JOIN items i ON a.item_id = i.id
     JOIN users u ON i.seller_id = u.id
     LEFT JOIN users wu ON a.winning_bidder_id = wu.id
     WHERE a.active = true
     LIMIT 1`
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // Get bids for this auction
  const auction = result.rows[0];
  const bidsResult = await db.query(
    `SELECT b.user_id as "userId", u.name as "userName", b.amount, b.timestamp
     FROM bids b
     JOIN users u ON b.user_id = u.id
     WHERE b.auction_id = $1
     ORDER BY b.timestamp ASC`,
    [auction.id]
  );
  
  // Get bid history for price chart
  const priceHistoryResult = await db.query(
    `SELECT timestamp, amount as price
     FROM bids
     WHERE auction_id = $1
     ORDER BY timestamp ASC`,
    [auction.id]
  );
  
  return {
    ...auction,
    bids: bidsResult.rows,
    bidHistory: priceHistoryResult.rows
  };
}

export async function getAuctionConfig(): Promise<AuctionConfig> {
  const result = await db.query('SELECT * FROM auction_config LIMIT 1');
  
  if (result.rows.length === 0) {
    // Return default config if none exists
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
  
  const config = result.rows[0];
  return {
    auctionType: config.auction_type,
    allowNewItems: config.allow_new_items,
    pennyAuctionConfig: config.penny_auction_config
  };
}

export async function placeBid(userId: number, itemId: number, amount: number): Promise<any> {
  // This would be a transaction with multiple operations:
  // 1. Check if auction is active
  // 2. Check if bid is valid (higher than current price, etc.)
  // 3. Update user balance
  // 4. Record bid
  // 5. Update auction current price
  // 6. Record balance history
  // Implementation depends on specific auction rules
}

// Admin-related queries
export async function startAuction(): Promise<any> {
  // Implementation to start a new auction
}

export async function resetAuction(): Promise<boolean> {
  // Implementation to reset the auction system
}

export async function processNextItem(): Promise<any> {
  // Implementation to move to the next item in the queue
}

export async function getAuctionResults(): Promise<AuctionResult[]> {
  const result = await db.query(
    `SELECT ar.id, i.title as item, s.name as seller, b.name as buyer, 
     ar.price, ar.auction_type as "auctionType"
     FROM auction_results ar
     JOIN items i ON ar.item_id = i.id
     JOIN users s ON ar.seller_id = s.id
     JOIN users b ON ar.buyer_id = b.id
     ORDER BY ar.completed_at DESC`
  );
  
  return result.rows;
}

// Add more database functions as needed

### `getAllUsers()`

- **Description**: Retrieves all users with their `id`, `name`, and `balance`.
- **SQL**:
  ```sql
  SELECT id, name, balance FROM users ORDER BY id ASC;
  ```
- **Returns**: `User[]` - Array of user objects, where each object has `id`, `name`, and `balance` properties.
  *Example*: `[{ id: 1, name: 'Alice', balance: 1000 }, { id: 2, name: 'Bob', balance: 500 }]`

### `getUserById(userId: number)`

- **Description**: Retrieves a specific user by their ID, including items sold/bought counts.
- **SQL** (Example - actual counts might need subqueries or be handled at application level if complex):
  ```sql
  SELECT 
      u.id, 
      u.name, 
      u.balance,
      (SELECT COUNT(*) FROM items WHERE seller_id = u.id AND sold = TRUE) as items_sold,
      (SELECT COUNT(*) FROM auction_results WHERE buyer_id = u.id) as items_bought
  FROM users u
  WHERE u.id = $1;
  ```
- **Returns**: `User | null` - A user object or null if not found.
  *Properties*: `id`, `name`, `balance`, `itemsSold`, `itemsBought`.