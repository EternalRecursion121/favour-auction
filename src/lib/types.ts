/**
 * Types for the Favour Auction application
 */

// User interface
export interface User {
  id: number;
  name: string;
  balance: number;
  itemsSold?: number;
  itemsBought?: number;
}

// Balance history entry
export interface BalanceHistoryEntry {
  timestamp: string;
  balance: number;
  reason: 'bid' | 'win' | 'sell';
  itemId: number;
  itemTitle?: string;
}

// Item interface
export interface Item {
  id: number;
  title: string;
  description: string;
  seller: {
    id: number;
    name: string;
  };
  sold: boolean;
  createdAt: string;
}

// Bid interface
export interface Bid {
  id?: number;
  auctionId?: number;
  userId: number;
  userName: string;
  amount: number;
  timestamp: string;
}

// Price history entry - This might be redundant if Bid is used directly for charts
// export interface PriceHistoryEntry {
//   timestamp: string;
//   price: number;
// }

// Chart data point
export interface ChartDataPoint {
  x?: Date | number;
  y?: number;
  time?: string | number | Date;
  value?: number;
}

// Auction types
export type AuctionType = 'english' | 'dutch' | 'firstprice' | 'vikrey' | 'chinese' | 'penny' | 'random';

// Bid result interface
export interface BidResult {
  accepted: boolean;
  message?: string;
  newPrice?: number;
  auctionEnded?: boolean;
  timeRemaining?: number;
  auctionType?: AuctionType;
  newBalance?: number;
}

// Auction interface
export interface Auction {
  active: boolean;
  item: Item | null;
  auctionType: AuctionType;
  startTime: string | null;
  endTime: string | null;
  currentPrice: number;
  winningBidder?: {
    id: number;
    name: string;
  } | null;
  bids: Bid[];
  timeRemaining?: number | null;
  bidHistory: Bid[];
}

// Auction result interface
export interface AuctionResult {
	id: number;
	item: Item;
	seller: string;
	buyer: string;
	price: number;
	auctionType: string;
}

// Auction configuration
export interface AuctionConfig {
  auctionType: AuctionType;
  allowNewItems: boolean;
  pennyAuctionConfig?: {
    incrementAmount: number;
    timeExtension: number;
    minimumTimeRemaining: number;
  };
}

// API response formats
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}