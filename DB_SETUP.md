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

## Step 3: Initialize database schema

Create the following tables in your Neon database:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 100
);

-- Auction items table
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  seller_id INTEGER REFERENCES users(id),
  sold BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auction configuration table
CREATE TABLE auction_config (
  id SERIAL PRIMARY KEY,
  auction_type TEXT NOT NULL DEFAULT 'english',
  allow_new_items BOOLEAN DEFAULT TRUE,
  penny_increment INTEGER DEFAULT 1,
  penny_time_extension INTEGER DEFAULT 10,
  penny_min_time INTEGER DEFAULT 30
);

-- Auction history table
CREATE TABLE auction_history (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id),
  seller_id INTEGER REFERENCES users(id),
  buyer_id INTEGER REFERENCES users(id),
  price INTEGER NOT NULL,
  auction_type TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bid history table for tracking price changes
CREATE TABLE bid_history (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id),
  user_id INTEGER REFERENCES users(id),
  amount INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initialize auction configuration
INSERT INTO auction_config (auction_type, allow_new_items) VALUES ('english', true);
```

## Step 4: Install database client 

Add the required packages to your project:

```bash
npm install @vercel/postgres
```

## Step 5: Create database client

Create a file at `src/lib/db.ts` with the following content:

```typescript
import { createClient } from '@vercel/postgres';

export const db = createClient();

export async function getUserBalance(name: string) {
  const result = await db.query('SELECT balance FROM users WHERE name = $1', [name]);
  return result.rows[0]?.balance || 0;
}

export async function createUser(name: string) {
  await db.query('INSERT INTO users (name, balance) VALUES ($1, 100) ON CONFLICT (name) DO NOTHING', [name]);
}

// Add more database functions as needed
```

Your database is now set up and ready to use with the favour auction application.