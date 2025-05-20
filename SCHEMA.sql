CREATE TYPE auction_status_enum AS ENUM ('available', 'active_auction', 'sold', 'passed', 'cancelled');
CREATE TYPE bid_status_enum AS ENUM ('active', 'outbid', 'winning', 'cancelled', 'won', 'lost');
CREATE TYPE auction_type_enum AS ENUM ('random', 'english', 'dutch', 'first_price_sealed', 'vikrey', 'chinese', 'penny');

CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    balance INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Items (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    seller_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    status auction_status_enum NOT NULL DEFAULT 'available',
    current_price INTEGER, -- Can represent highest bid during auction, or final sale price
    owner_id INTEGER REFERENCES Users(id) ON DELETE SET NULL, -- User who won/bought the item
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    auction_start_time TIMESTAMP WITH TIME ZONE,
    auction_end_time TIMESTAMP WITH TIME ZONE
);

CREATE TABLE Bids (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES Items(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    bid_amount INTEGER NOT NULL,
    status bid_status_enum NOT NULL DEFAULT 'active',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_cannot_bid_on_own_item CHECK (user_id != (SELECT seller_id FROM Items WHERE Items.id = item_id)),
    CONSTRAINT bid_amount_positive CHECK (bid_amount > 0)
);

-- For tracking all balance changes explicitly
CREATE TABLE Transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
    description TEXT NOT NULL, -- e.g., "Initial balance", "Purchased item 'XYZ'", "Sold item 'ABC'", "Won bid for item 'DEF'"
    amount_change INTEGER NOT NULL, -- Positive for credit, negative for debit
    new_balance INTEGER NOT NULL, -- Balance of the user *after* this transaction
    related_item_id INTEGER REFERENCES Items(id) ON DELETE SET NULL, -- If transaction is linked to an item
    related_bid_id INTEGER REFERENCES Bids(id) ON DELETE SET NULL,   -- If transaction is linked to a specific bid (e.g. winning bid)
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE AuctionConfig (
    id INTEGER PRIMARY KEY DEFAULT 1, -- Singleton table, always one row
    auction_type auction_type_enum NOT NULL DEFAULT 'random',
    allow_new_items BOOLEAN NOT NULL DEFAULT TRUE,
    current_auction_item_id INTEGER REFERENCES Items(id) ON DELETE SET NULL, -- Item currently up for auction
    previewed_item_id INTEGER REFERENCES Items(id) ON DELETE SET NULL, -- Item currently selected for preview
    -- Potentially add parameters for Penny auction or other specific types here
    -- e.g., penny_auction_bid_cost INTEGER, penny_auction_time_increment_seconds INTEGER
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT only_one_row CHECK (id = 1)
);

-- Initialize the singleton AuctionConfig row if it doesn't exist
INSERT INTO AuctionConfig (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Optional: Indexes for performance
CREATE INDEX idx_items_status ON Items(status);
CREATE INDEX idx_items_seller_id ON Items(seller_id);
CREATE INDEX idx_bids_item_id ON Bids(item_id);
CREATE INDEX idx_bids_user_id ON Bids(user_id);
CREATE INDEX idx_transactions_user_id ON Transactions(user_id);

-- Trigger function to update 'updated_at' columns
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for Users table
CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON Users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Triggers for Items table
CREATE TRIGGER set_timestamp_items
BEFORE UPDATE ON Items
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Triggers for AuctionConfig table
CREATE TRIGGER set_timestamp_auctionconfig
BEFORE UPDATE ON AuctionConfig
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Function to create initial transaction when a new user is created
CREATE OR REPLACE FUNCTION create_initial_balance_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO Transactions (user_id, description, amount_change, new_balance)
    VALUES (NEW.id, 'Initial balance', NEW.balance, NEW.balance);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_user_insert_create_initial_transaction
AFTER INSERT ON Users
FOR EACH ROW
EXECUTE FUNCTION create_initial_balance_transaction(); 