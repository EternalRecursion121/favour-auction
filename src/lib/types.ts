// Common types for the application

export type User = {
  id: number;
  name: string;
  balance: number;
  created_at?: string;
  updated_at?: string;
};

export type Item = {
  id: number;
  description: string;
  seller_id: number;
  seller_name?: string;
  status: 'available' | 'active_auction' | 'sold' | 'passed' | 'cancelled';
  current_price: number | null;
  owner_id: number | null;
  owner_name?: string | null;
  bids?: Bid[];
  created_at?: string;
  updated_at?: string;
  auction_start_time?: string | null;
  auction_end_time?: string | null;
};

export type Bid = {
  bid_id: number;
  user_id: number;
  user_name?: string | null;
  item_id?: number;
  bid_amount: number;
  timestamp: string;
  status: 'active' | 'outbid' | 'winning' | 'cancelled' | 'won' | 'lost';
};

export type Transaction = {
  transaction_id: number;
  description: string;
  amount_change: number;
  new_balance: number;
  timestamp: string;
  related_item_id: number | null;
  related_bid_id: number | null;
};

export type AuctionConfig = {
  auction_type: 'random' | 'english' | 'dutch' | 'first_price_sealed' | 'vikrey' | 'chinese' | 'penny';
  allow_new_items: boolean;
  current_auction_item_id: number | null;
  previewed_item_id: number | null;
  updated_at?: string;
};

// Database response types
export type SupabaseItem = {
  id: number;
  description: string;
  seller_id: number;
  seller?: any; // Using any because Supabase nested selects can have unpredictable structure
  status: 'available' | 'active_auction' | 'sold' | 'passed' | 'cancelled';
  current_price: number | null;
  owner_id: number | null;
  owner?: any; // Using any because Supabase nested selects can have unpredictable structure
  bids?: SupabaseBid[];
  created_at?: string;
  updated_at?: string;
  auction_start_time?: string | null;
  auction_end_time?: string | null;
};

export type SupabaseBid = {
  id: number;
  item_id: number;
  user_id: number;
  bidder?: any; // Using any because Supabase nested selects can have unpredictable structure
  bid_id?: number;
  bid_amount: number;
  timestamp: string;
  status: 'active' | 'outbid' | 'winning' | 'cancelled' | 'won' | 'lost';
};