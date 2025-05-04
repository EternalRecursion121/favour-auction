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
  userId: number;
  userName: string;
  amount: number;
  timestamp: string;
}

// Price history entry
export interface PriceHistoryEntry {
  timestamp: string;
  price: number;
}

// Chart data point
export interface ChartDataPoint {
  x: Date;
  y: number;
}

// Auction types
export type AuctionType = 'english' | 'dutch' | 'firstprice' | 'vikrey' | 'chinese' | 'penny' | 'random';

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
  bidHistory: PriceHistoryEntry[];
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