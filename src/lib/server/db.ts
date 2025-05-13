import { createClient } from '@vercel/postgres';
import type { User, Item, Auction, AuctionConfig, BalanceHistoryEntry, AuctionResult, Bid, AuctionType } from '$lib/types';

// Handle build-time gracefully by providing a dummy client during build
let db: ReturnType<typeof createClient>;

// Detect if we're in a build context
const isBuildTime = process.env.NODE_ENV === 'production' && (process.argv.join(' ').includes('build') || process.env.VERCEL_ENV === 'production');

try {
  // In Serverless Functions, createClient() returns a client directly.
  // No need for db.connect() or client.release() in that context.
  db = createClient();
} catch (error) {
  if (isBuildTime) {
    console.log('Creating dummy client for build time');
    // Create a mock client for build time
    db = {
      // Add dummy implementations for the methods we use
      connect: async () => ({
        query: async () => ({ rows: [] }),
        release: () => {}
      }),
      query: async () => ({ rows: [] })
    } as any;
  } else {
    // If not in build, rethrow the error
    throw error;
  }
}

export { db };

// Helper function for transactions
async function executeTransaction<T>(operations: (client: any) => Promise<T>): Promise<T> {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await operations(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

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

export async function findOrCreateUser(name: string): Promise<User> {
    const client = await db.connect();
    try {
        let userResult = await client.query('SELECT * FROM users WHERE name = $1', [name]);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            // Fetch itemsSold and itemsBought counts
            const itemsSoldResult = await client.query('SELECT COUNT(*) as count FROM items WHERE seller_id = $1 AND sold = TRUE', [user.id]);
            const itemsBoughtResult = await client.query('SELECT COUNT(*) as count FROM auction_results WHERE buyer_id = $1', [user.id]);
            return { ...user, itemsSold: parseInt(itemsSoldResult.rows[0].count, 10), itemsBought: parseInt(itemsBoughtResult.rows[0].count, 10) };
        }

        const initialBalance = 1000; // Default balance for new users
        userResult = await client.query(
            'INSERT INTO users (name, balance) VALUES ($1, $2) RETURNING *', 
            [name, initialBalance]
        );
        const newUser = userResult.rows[0];
        return { ...newUser, itemsSold: 0, itemsBought: 0 };
    } finally {
        client.release();
    }
}

export async function getUserById(userId: number): Promise<User | null> {
    const client = await db.connect();
    try {
        const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            const itemsSoldResult = await client.query('SELECT COUNT(*) as count FROM items WHERE seller_id = $1 AND sold = TRUE', [userId]);
            const itemsBoughtResult = await client.query('SELECT COUNT(*) as count FROM auction_results WHERE buyer_id = $1', [userId]);
            return { ...user, itemsSold: parseInt(itemsSoldResult.rows[0].count, 10), itemsBought: parseInt(itemsBoughtResult.rows[0].count, 10) };
        }
        return null;
    } finally {
        client.release();
    }
}

export async function getAllUsers(): Promise<Pick<User, 'id' | 'name' | 'balance'>[]> {
    const client = await db.connect();
    try {
        const result = await client.query('SELECT id, name, balance FROM users ORDER BY id ASC');
        return result.rows;
    } finally {
        client.release();
    }
}

// Item-related queries
export async function getItems(sold?: boolean): Promise<Item[]> {
    const client = await db.connect();
    try {
        let query = 'SELECT i.id, i.title, i.description, i.seller_id, i.sold, i.created_at, u.name as seller_name FROM items i JOIN users u ON i.seller_id = u.id';
        const queryParams: any[] = [];
        if (typeof sold === 'boolean') {
            query += ' WHERE i.sold = $1';
            queryParams.push(sold);
        }
        query += ' ORDER BY i.created_at DESC';
        
        const result = await client.query(query, queryParams);
        return result.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            seller: { id: row.seller_id, name: row.seller_name },
            sold: row.sold,
            createdAt: new Date(row.created_at).toISOString(),
        }));
    } finally {
        client.release();
    }
}

export async function addItem(title: string, description: string, sellerId: number): Promise<Item> {
    const client = await db.connect();
    try {
        const result = await client.query(
            'INSERT INTO items (title, description, seller_id, created_at, sold) VALUES ($1, $2, $3, NOW(), FALSE) RETURNING id, title, description, seller_id, sold, created_at',
            [title, description, sellerId]
        );
        const newItemRow = result.rows[0];
        const seller = await getUserById(newItemRow.seller_id);
        if (!seller) throw new Error('Seller not found for new item');

        return {
            id: newItemRow.id,
            title: newItemRow.title,
            description: newItemRow.description,
            seller: { id: seller.id, name: seller.name },
            sold: newItemRow.sold,
            createdAt: newItemRow.created_at.toISOString(),
        } as Item;
    } finally {
        client.release();
    }
}

export async function getItemByIdWithHistory(itemId: number): Promise<(Item & { auctionHistory: Bid[] }) | null> {
    const client = await db.connect();
    try {
        const itemResult = await client.query(
            `SELECT i.id, i.title, i.description, i.sold, i.created_at, i.seller_id,
             u.name as seller_name
             FROM items i
             JOIN users u ON i.seller_id = u.id
             WHERE i.id = $1`,
            [itemId]
        );
        if (itemResult.rows.length === 0) return null;
        
        const itemData = itemResult.rows[0];
        const auctionHistoryResult = await client.query(
            `SELECT b.user_id as "userId", u.name as "userName", b.amount, b.timestamp
             FROM bids b
             JOIN users u ON b.user_id = u.id
             JOIN auctions a ON b.auction_id = a.id
             WHERE a.item_id = $1
             ORDER BY b.timestamp ASC`,
            [itemId]
        );

        const fullItem: Item = {
            id: itemData.id,
            title: itemData.title,
            description: itemData.description,
            sold: itemData.sold,
            createdAt: itemData.created_at,
            seller: { id: itemData.seller_id, name: itemData.seller_name }
        };

        return {
            ...fullItem,
            auctionHistory: auctionHistoryResult.rows
        };
    } finally {
        client.release();
    }
}

// Auction-related queries
export async function getCurrentAuction(): Promise<Auction | null> {
    const client = await db.connect();
    try {
        const auctionRes = await client.query(
            `SELECT a.*, i.title as item_title, i.description as item_description, i.seller_id as item_seller_id, 
             u_seller.name as item_seller_name, i.created_at as item_created_at, u_winner.name as winner_name 
             FROM auctions a 
             JOIN items i ON a.item_id = i.id 
             JOIN users u_seller ON i.seller_id = u_seller.id 
             LEFT JOIN users u_winner ON a.winning_bidder_id = u_winner.id 
             WHERE a.active = TRUE ORDER BY a.start_time DESC LIMIT 1`
        );

        if (auctionRes.rows.length === 0) return null;
        const auctionRow = auctionRes.rows[0];

        const bidsRes = await client.query(
            `SELECT b.id as bid_id, b.user_id, u.name as user_name, b.amount, b.timestamp 
             FROM bids b JOIN users u ON b.user_id = u.id 
             WHERE b.auction_id = $1 ORDER BY b.timestamp DESC`,
            [auctionRow.id]
        );

        const item: Item = {
            id: auctionRow.item_id,
            title: auctionRow.item_title,
            description: auctionRow.item_description,
            seller: { id: auctionRow.item_seller_id, name: auctionRow.item_seller_name },
            sold: false, // Active auction means item is not yet fully sold in this context
            createdAt: new Date(auctionRow.item_created_at).toISOString(),
        };

        const auction: Auction = {
            active: auctionRow.active,
            item: item,
            auctionType: auctionRow.auction_type as AuctionType,
            startTime: new Date(auctionRow.start_time).toISOString(),
            endTime: auctionRow.end_time ? new Date(auctionRow.end_time).toISOString() : null,
            currentPrice: parseFloat(auctionRow.current_price),
            winningBidder: auctionRow.winning_bidder_id ? { id: auctionRow.winning_bidder_id, name: auctionRow.winner_name } : null,
            bids: bidsRes.rows.map(bid => ({
                id: bid.bid_id,
                userId: bid.user_id,
                userName: bid.user_name,
                amount: parseFloat(bid.amount),
                timestamp: new Date(bid.timestamp).toISOString(),
            })),
            timeRemaining: auctionRow.end_time ? Math.max(0, (new Date(auctionRow.end_time).getTime() - Date.now()) / 1000) : null,
            bidHistory: bidsRes.rows.map(bid => ({ 
                userId: bid.user_id,
                userName: bid.user_name,
                amount: parseFloat(bid.amount),
                timestamp: new Date(bid.timestamp).toISOString(),
            }))
        };
        return auction;
    } finally {
        client.release();
    }
}

export async function getAuctionConfig(clientParam?: any): Promise<AuctionConfig> {
    const client = clientParam || await db.connect();
    try {
        const result = await client.query('SELECT auction_type, allow_new_items, penny_auction_config FROM auction_config LIMIT 1');
        if (result.rows.length === 0) {
            // Return default config if none exists
            const defaultConfig = {
                auctionType: 'english' as AuctionType,
                allowNewItems: true,
                pennyAuctionConfig: { incrementAmount: 1, timeExtension: 10, minimumTimeRemaining: 30 }
            };
            await client.query('INSERT INTO auction_config (auction_type, allow_new_items, penny_auction_config) VALUES ($1, $2, $3)',
                [defaultConfig.auctionType, defaultConfig.allowNewItems, JSON.stringify(defaultConfig.pennyAuctionConfig)]);
            return defaultConfig;
        }
        
        const configRow = result.rows[0];
        return {
            auctionType: configRow.auction_type as AuctionType,
            allowNewItems: configRow.allow_new_items,
            pennyAuctionConfig: typeof configRow.penny_auction_config === 'string' 
                ? JSON.parse(configRow.penny_auction_config) 
                : configRow.penny_auction_config
        };
    } finally {
        if (!clientParam) client.release();
    }
}

export async function placeBid(userId: number, itemId: number, amount: number): Promise<BidResult> {
    return executeTransaction(async (client) => {
        // Fetch current auction for the item
        const auctionResult = await client.query('SELECT * FROM auctions WHERE item_id = $1 AND active = TRUE', [itemId]);
        if (auctionResult.rows.length === 0) {
            return { accepted: false, message: "Auction not found or not active." };
        }
        const auction = auctionResult.rows[0];

        // Fetch auction configuration
        const configResult = await client.query('SELECT * FROM auction_config LIMIT 1');
        if (configResult.rows.length === 0) {
            throw new Error("Auction configuration not found."); // Should not happen
        }
        const config: AuctionConfig = {
            auctionType: configResult.rows[0].auction_type as AuctionType,
            allowNewItems: configResult.rows[0].allow_new_items,
            pennyAuctionConfig: configResult.rows[0].penny_auction_config // This is stored as JSONB
        };

        // Fetch user
        const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return { accepted: false, message: "User not found." };
        }
        const user = userResult.rows[0];

        let bidAmountToPlace = amount;
        let costToUser = amount; // For most auctions, cost is the bid amount

        // Auction Type specific logic
        if (auction.auction_type === 'english') {
            if (amount <= auction.current_price) {
                return { accepted: false, message: "Bid must be higher than current price." };
            }
        } else if (auction.auction_type === 'penny') {
            if (!config.pennyAuctionConfig) {
                return { accepted: false, message: "Penny auction configuration missing." };
            }
            costToUser = config.pennyAuctionConfig.incrementAmount; // Cost to bid
            bidAmountToPlace = auction.current_price + config.pennyAuctionConfig.incrementAmount; // New price
        } else if (auction.auction_type === 'dutch') {
            // For Dutch, bidding means accepting the current price
            bidAmountToPlace = auction.current_price;
            // No specific validation against amount here, as any bid signifies acceptance
        } else if (auction.auction_type === 'firstprice' || auction.auction_type === 'vikrey' || auction.auction_type === 'chinese') {
            // These are sealed bid, so any positive amount is fine initially
            if (amount <= 0) {
                return { accepted: false, message: "Bid amount must be positive." };
            }
        }

        if (user.balance < costToUser) {
            return { accepted: false, message: "Insufficient balance." };
        }

        // Deduct balance and record history
        const newBalance = user.balance - costToUser;
        await client.query('UPDATE users SET balance = $1 WHERE id = $2', [newBalance, userId]);
        await client.query(
            'INSERT INTO balance_history (user_id, balance, reason, item_id) VALUES ($1, $2, $3, $4)',
            [userId, newBalance, 'bid', itemId]
        );

        // Record the bid
        await client.query(
            'INSERT INTO bids (auction_id, user_id, amount, timestamp) VALUES ($1, $2, $3, NOW())',
            [auction.id, userId, bidAmountToPlace]
        );

        // Update auction state
        let newEndTime = auction.end_time;
        let timeRemaining = null;
        
        if (auction.auction_type === 'penny' && config.pennyAuctionConfig) {
            const currentTime = new Date();
            let currentEndTime = new Date(auction.end_time);
            const effectiveTimeRemaining = Math.max(0, (currentEndTime.getTime() - currentTime.getTime()) / 1000);

            if (effectiveTimeRemaining < config.pennyAuctionConfig.minimumTimeRemaining) {
                currentEndTime = new Date(currentTime.getTime() + config.pennyAuctionConfig.timeExtension * 1000);
                newEndTime = currentEndTime.toISOString();
            }
            timeRemaining = Math.max(0, (new Date(newEndTime).getTime() - new Date().getTime()) / 1000);
            
            await client.query('UPDATE auctions SET current_price = $1, winning_bidder_id = $2, end_time = $3 WHERE id = $4',
                [bidAmountToPlace, userId, newEndTime, auction.id]
            );
        } else if (auction.auction_type === 'dutch') {
             // Dutch auction ends on first bid
            await client.query('UPDATE auctions SET current_price = $1, winning_bidder_id = $2, active = FALSE, end_time = NOW() WHERE id = $3',
                [bidAmountToPlace, userId, auction.id]
            );
        } else if (auction.auction_type !== 'firstprice' && auction.auction_type !== 'vikrey' && auction.auction_type !== 'chinese') {
             // For English auctions, update price and winner
            await client.query('UPDATE auctions SET current_price = $1, winning_bidder_id = $2 WHERE id = $3',
                [bidAmountToPlace, userId, auction.id]
            );
        }
        // For sealed bid auctions, price/winner not updated until auction finalizes

        const auctionEnded = auction.auction_type === 'dutch'; // Dutch auction ends immediately

        return {
            accepted: true,
            message: "Bid placed successfully!",
            newPrice: bidAmountToPlace,
            auctionEnded: auctionEnded,
            timeRemaining: timeRemaining,
            newBalance: newBalance,
            auctionType: auction.auction_type as AuctionType
        };
    });
}

export async function resetAuction(): Promise<boolean> {
    try {
        await executeTransaction(async (client) => {
            await client.query('TRUNCATE TABLE bids, auction_results, balance_history RESTART IDENTITY CASCADE');
            await client.query('DELETE FROM auctions'); // Truncate might fail if there are FKs from items if items are not cleared
            await client.query('UPDATE items SET sold = FALSE');
            await client.query('UPDATE users SET balance = 1000'); // Reset everyone to 1000, or initial default
            console.log("Auction system reset.");
        });
        return true;
    } catch (error) {
        console.error('Error resetting auction:', error);
        return false;
    }
}

export async function updateAuctionConfig(config: AuctionConfig): Promise<AuctionConfig | null> {
    try {
        return await executeTransaction(async (client) => {
            const currentConfigResult = await client.query('SELECT * FROM auction_config LIMIT 1');
            if (currentConfigResult.rows.length === 0) {
                throw new Error("Auction configuration not found, cannot update.");
            }
            
            const result = await client.query(
                `INSERT INTO auction_config (id, auction_type, allow_new_items, penny_auction_config)
                VALUES (1, $1, $2, $3)
                ON CONFLICT (id) DO UPDATE SET
                  auction_type = EXCLUDED.auction_type,
                  allow_new_items = EXCLUDED.allow_new_items,
                  penny_auction_config = EXCLUDED.penny_auction_config
                RETURNING auction_type, allow_new_items, penny_auction_config`,
                [config.auctionType, config.allowNewItems, JSON.stringify(config.pennyAuctionConfig)]
            );
            
            if (result.rows.length > 0) {
                const updated = result.rows[0];
                return {
                    auctionType: updated.auction_type as AuctionType,
                    allowNewItems: updated.allow_new_items,
                    pennyAuctionConfig: typeof updated.penny_auction_config === 'string' 
                        ? JSON.parse(updated.penny_auction_config) 
                        : updated.penny_auction_config
                };
            }
            return null;
        });
    } catch (error) {
        console.error('Error updating auction config:', error);
        return null;
    }
}

// Define a more specific type for the item in processNextItem response
export interface ProcessNextItemResponseItem {
  id: number;
  title: string;
  description: string;
  seller: { id: number; name: string; } | null;
  auctionId?: number; 
  auctionType?: string;
  startTime?: string;
  endTime?: string;
  currentPrice?: number;
  remainingItems?: number;
}

export async function processNextItem(): Promise<{ 
  success: boolean; 
  item?: ProcessNextItemResponseItem; 
  auction?: Auction | null;
  message: string; 
  remainingItems?: number; 
  code?: string 
}> {
    try {
        await db.query('BEGIN');

        // 1. Finalize Current Active Auction (if any)
        const activeAuctionRes = await db.query(
            'SELECT a.*, i.seller_id as item_seller_id FROM auctions a JOIN items i ON a.item_id = i.id WHERE a.active = TRUE LIMIT 1'
        );

        if (activeAuctionRes.rows.length > 0) {
            const currentAuction = activeAuctionRes.rows[0];
            const itemSellerId = currentAuction.item_seller_id;
            // Check if auction has ended
            let shouldEnd = false;
            if (currentAuction.end_time && new Date(currentAuction.end_time) < new Date()) {
                shouldEnd = true;
            }
            if (currentAuction.time_remaining !== null && currentAuction.time_remaining <= 0) {
                shouldEnd = true;
            }

            if (shouldEnd) {
                if (currentAuction.winning_bidder_id && currentAuction.current_price > 0) {
                    // Mark item as sold
                    await db.query('UPDATE items SET sold = TRUE WHERE id = $1', [currentAuction.item_id]);
                    // Record auction result
                    await db.query(
                        'INSERT INTO auction_results (auction_id, item_id, seller_id, buyer_id, price, auction_type, completed_at) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)',
                        [currentAuction.id, currentAuction.item_id, itemSellerId, currentAuction.winning_bidder_id, currentAuction.current_price, currentAuction.auction_type]
                    );
                    // Update seller's balance & stats
                    await db.query(
                        'UPDATE users SET balance = balance + $1, items_sold = items_sold + 1 WHERE id = $2',
                        [currentAuction.current_price, itemSellerId]
                    );
                    // Record seller's balance history
                    const sellerRes = await db.query('SELECT balance FROM users WHERE id = $1', [itemSellerId]);
                    if (sellerRes.rows.length > 0) {
                        await db.query(
                            'INSERT INTO balance_history (user_id, balance, reason, item_id, auction_id) VALUES ($1, $2, $3, $4, $5)',
                            [itemSellerId, sellerRes.rows[0].balance, 'sell', currentAuction.item_id, currentAuction.id]
                        );
                    }
                    // Update buyer's stats (balance was debited at bid time)
                    await db.query('UPDATE users SET items_bought = items_bought + 1 WHERE id = $1', [currentAuction.winning_bidder_id]);
                }
                // Mark auction as inactive
                await db.query('UPDATE auctions SET active = FALSE WHERE id = $1', [currentAuction.id]);
            }
        }

        // 2. Select Next Unsold Item
        const nextItemRes = await db.query(
            `SELECT * FROM items WHERE sold = FALSE AND id NOT IN (SELECT item_id FROM auctions WHERE active = TRUE) ORDER BY created_at ASC LIMIT 1`
        );

        if (nextItemRes.rows.length === 0) {
            await db.query('COMMIT');
            const remainingCountRes = await db.query('SELECT COUNT(*) as count FROM items WHERE sold = FALSE');
            return { 
                success: true, 
                message: 'No more items to auction.', 
                remainingItems: parseInt(remainingCountRes.rows[0].count, 10) 
            };
        }
        
        const nextItemToAuctionRow = nextItemRes.rows[0];

        // 3. Start New Auction for the Selected Item
        const config = await getAuctionConfig();
        let auctionTypeToUse = config.auctionType;
        if (auctionTypeToUse === 'random') {
            const availableTypes: AuctionType[] = ['english', 'dutch', 'firstprice', 'vikrey', 'chinese', 'penny'];
            auctionTypeToUse = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        }

        // Define default duration
        const defaultDurationSeconds = 24 * 60 * 60; 
        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + defaultDurationSeconds * 1000);
        
        const newAuctionRes = await db.query(
            `INSERT INTO auctions (item_id, auction_type, start_time, end_time, current_price, active, time_remaining)
            VALUES ($1, $2, $3, $4, $5, TRUE, $6) RETURNING *`,
            [nextItemToAuctionRow.id, auctionTypeToUse, startTime.toISOString(), endTime.toISOString(), 0, defaultDurationSeconds]
        );
        
        await db.query('COMMIT');

        const newAuctionFull = await getCurrentAuction();
        const remainingCountRes = await db.query('SELECT COUNT(*) as count FROM items WHERE sold = FALSE');
        const sellerInfoRes = await db.query('SELECT id, name FROM users WHERE id = $1', [nextItemToAuctionRow.seller_id]);

        // Construct item data for the response
        const responseItem: ProcessNextItemResponseItem = {
            id: nextItemToAuctionRow.id,
            title: nextItemToAuctionRow.title,
            description: nextItemToAuctionRow.description,
            seller: sellerInfoRes.rows.length > 0 ? sellerInfoRes.rows[0] : null
        };

        return {
            success: true,
            item: responseItem,
            auction: newAuctionFull,
            message: `Auction started for item: ${nextItemToAuctionRow.title}`,
            remainingItems: parseInt(remainingCountRes.rows[0].count, 10)
        };

    } catch (error: any) {
        await db.query('ROLLBACK').catch(rbError => console.error('Rollback error:', rbError));
        console.error('Error in processNextItem:', error);
        return { 
            success: false, 
            message: error.message || 'Failed to process next item.', 
            code: 'INTERNAL_ERROR' 
        };
    }
}

export async function getAuctionResults(): Promise<AuctionResult[]> {
    const client = await db.connect();
    try {
        const result = await client.query(`
            SELECT 
                ar.id, 
                ar.item_id, 
                i.title as "itemTitle", 
                i.description as "itemDescription",
                ar.seller_id, 
                s.name as "sellerName", 
                ar.buyer_id, 
                b.name as "buyerName", 
                ar.price, 
                ar.auction_type, 
                ar.completed_at
            FROM auction_results ar
            JOIN items i ON ar.item_id = i.id
            JOIN users s ON ar.seller_id = s.id
            JOIN users b ON ar.buyer_id = b.id
            ORDER BY ar.completed_at DESC
        `);
        
        return result.rows.map(row => ({
            id: row.id,
            item: {
                id: row.item_id,
                title: row.itemTitle,
                description: row.itemDescription || '',
                seller: { id: row.seller_id, name: row.sellerName },
                sold: true,
                createdAt: ''
            },
            seller: row.sellerName,
            buyer: row.buyerName,
            price: row.price,
            auctionType: row.auction_type as AuctionType
        })) as AuctionResult[];
    } finally {
        client.release();
    }
}