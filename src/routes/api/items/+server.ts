import { getAllItems, createItem, getCurrentAuctionConfig } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';
import { itemSchema } from '$lib/server/schema';

export async function GET() {
  return apiHandler(
    {},
    async () => {
      const items = await getAllItems();
      
      return items.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        seller: {
          id: item.seller_id,
          name: item.seller_name
        },
        sold: item.sold,
        createdAt: item.created_at
      }));
    }
  );
}

export async function POST({ request }) {
  return apiHandler(
    { request },
    async () => {
      const body = await request.json();
      const { title, description, sellerId } = itemSchema.parse(body);
      
      // Check if new items are allowed based on auction config
      const config = await getCurrentAuctionConfig();
      if (!config.allow_new_items) {
        throw createError(
          'FORBIDDEN', 
          'New items cannot be added at this time'
        );
      }
      
      const item = await createItem(title, description, sellerId);
      
      return {
        id: item.id,
        title: item.title,
        description: item.description,
        seller: {
          id: item.seller_id,
          name: 'Unknown' // In a real app, we'd join with the users table
        },
        sold: item.sold,
        createdAt: item.created_at
      };
    }
  );
}