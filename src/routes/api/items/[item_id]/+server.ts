import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseServiceRole } from '$lib/server/supabaseServiceRoleClient';
import type { Item, SupabaseItem, SupabaseBid } from '$lib/types';

// GET /items/{item_id}: Return a single item, its status, and all related information including bids
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { item_id } = params;
    const itemId = parseInt(item_id, 10);

    if (isNaN(itemId)) {
      return json({ error: 'Item ID must be a valid integer.' }, { status: 400 });
    }

    // Fetch the item with related seller_name, owner_name, and its bids (with user_name for each bid)
    // This is a complex select. Ensure FK names are correct.
    const { data: item, error: fetchError } = await supabaseServiceRole
      .from('items') // Lowercase table name
      .select(`
        id,
        description,
        seller_id,
        seller:users!items_seller_id_fkey ( name ),
        status,
        current_price,
        owner_id,
        owner:users!items_owner_id_fkey ( name ),
        bids (
          bid_id:id,
          user_id,
          bidder:users!bids_user_id_fkey ( name ),
          bid_amount,
          timestamp,
          status
        )
      `)
      .eq('id', itemId)
      .maybeSingle(); // Use maybeSingle as item might not exist

    if (fetchError) {
      console.error('Supabase item fetch error (GET /items/{item_id}):', fetchError);
      // Note: maybeSingle() doesn't error with PGRST116 if not found, error here is likely a real issue.
      return json({ error: 'Failed to retrieve item.', details: fetchError.message }, { status: 500 });
    }

    if (!item) {
      return json({ error: 'Item not found.' }, { status: 404 });
    }

    // Transform the fetched data to match the API_SPEC.md structure
    // Type assertions to help TypeScript understand the structure
    const typedItem = item as SupabaseItem;
    const seller = typedItem.seller;
    const owner = typedItem.owner;
    
    const formattedItem = {
      id: typedItem.id,
      description: typedItem.description,
      seller_id: typedItem.seller_id,
      seller_name: seller && typeof seller === 'object' ? seller.name : null,
      status: typedItem.status,
      current_price: typedItem.current_price,
      owner_id: typedItem.owner_id,
      owner_name: owner && typeof owner === 'object' ? owner.name : null,
      bids: typedItem.bids ? typedItem.bids.map((bid: SupabaseBid) => {
        const bidder = bid.bidder;
        return {
          bid_id: bid.bid_id ?? bid.id,
          user_id: bid.user_id,
          user_name: bidder && typeof bidder === 'object' ? bidder.name : null, // user_name for the bidder
          bid_amount: bid.bid_amount,
          timestamp: bid.timestamp,
          status: bid.status,
        };
      }) : [],
    };

    return json(formattedItem as Item, { status: 200 });

  } catch (e) {
    console.error('Server error (GET /items/{item_id}):', e);
    return json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
};

// DELETE /items/{item_id}: Delete a specific item
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { item_id } = params;
    const itemId = parseInt(item_id, 10);

    if (isNaN(itemId)) {
      return json({ error: 'Item ID must be a valid integer.' }, { status: 400 });
    }

    // Check if the item is in a state that prevents deletion (e.g., 'active_auction' or 'sold')
    // This is a simplified check. More complex logic might be needed based on application rules.
    const { data: itemStatus, error: statusError } = await supabaseServiceRole
      .from('items')
      .select('status, owner_id') // FIXED: Removed problematic join with auctionconfig
      .eq('id', itemId)
      .maybeSingle();

    if (statusError) {
      console.error('Supabase item status check error (DELETE /items/{item_id}):', statusError);
      return json({ error: 'Failed to check item status before deletion.', details: statusError.message }, { status: 500 });
    }

    if (!itemStatus) {
      return json({ error: 'Item not found.' }, { status: 404 }); // Already checked by delete, but good for early exit
    }

    // Check against auctionconfig for current_auction_item_id
    // The join syntax for this needs to be correct or done in two steps.
    // Let's re-fetch auction config separately for simplicity here to check current_auction_item_id
    const { data: auctionConfig, error: auctionConfigError } = await supabaseServiceRole
        .from('auctionconfig')
        .select('current_auction_item_id')
        .limit(1)
        .single(); // Assuming one row in auctionconfig

    if (auctionConfigError) {
        console.error('Error fetching auction config for delete check:', auctionConfigError);
        return json({ error: 'Could not verify auction status for item deletion.', details: auctionConfigError.message }, { status: 500 });
    }

    if (auctionConfig && auctionConfig.current_auction_item_id === itemId) {
        return json({ error: 'Cannot delete item: it is currently active in an auction.' }, { status: 409 });
    }
    
    if (itemStatus.status === 'sold' || itemStatus.owner_id !== null) {
      return json({ error: 'Cannot delete item: it has been sold.' }, { status: 409 });
    }
    
    // Add other status checks if needed, e.g. 'active_auction' if you have that directly on item
    // if (itemStatus.status === 'active_auction') {
    //    return json({ error: 'Cannot delete item: it is currently active in an auction.' }, { status: 409 });
    // }

    // Proceed with deletion
    // Using { count: 'exact' } to ensure we know if a row was actually deleted.
    const { error: deleteError, count } = await supabaseServiceRole
      .from('items')
      .delete({ count: 'exact' })
      .eq('id', itemId);

    if (deleteError) {
      console.error('Supabase item delete error (DELETE /items/{item_id}):', deleteError);
      // Check for foreign key constraint errors if bids are not set to cascade delete
      if (deleteError.code === '23503') { // Foreign key violation
           return json({ error: 'Cannot delete item: it has associated bids. Ensure bids are deleted first or cascade.', details: deleteError.message }, { status: 409 });
      }
      return json({ error: 'Failed to delete item.', details: deleteError.message }, { status: 500 });
    }

    if (count === 0) {
      // This case should ideally be caught by the itemStatus check earlier, but as a fallback:
      return json({ error: 'Item not found or already deleted.' }, { status: 404 });
    }

    return new Response(null, { status: 204 }); // No content

  } catch (e) {
    console.error('Server error (DELETE /items/{item_id}):', e);
    return json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
};