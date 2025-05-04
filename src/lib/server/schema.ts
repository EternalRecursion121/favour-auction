import { z } from 'zod';

// Validation schemas for request inputs
export const userSchema = z.object({
  name: z.string().min(2).max(50),
});

export const itemSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500),
  sellerId: z.number().int().positive(),
});

export const bidSchema = z.object({
  userId: z.number().int().positive(),
  itemId: z.number().int().positive(),
  amount: z.number().int().positive(),
});

export const adminAuthSchema = z.object({
  password: z.string(),
});

export const auctionConfigSchema = z.object({
  auctionType: z.enum(['english', 'dutch', 'firstprice', 'vikrey', 'chinese', 'penny', 'random']),
  allowNewItems: z.boolean(),
  pennyAuctionConfig: z.object({
    incrementAmount: z.number().int().positive(),
    timeExtension: z.number().int().positive(),
    minimumTimeRemaining: z.number().int().positive(),
  }).optional(),
});