import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseServiceRole } from '$lib/server/supabaseServiceRoleClient';
import type { Item, SupabaseItem } from '$lib/types';

// POST /items: Add a new item
export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { description, seller_id } = body as { description?: string; seller_id?: number };

    if (!description || typeof description !== 'string' || description.trim() === '') {
      return json({ error: 'Description is required and must be a non-empty string.' }, { status: 400 });
    }
    if (seller_id === undefined || typeof seller_id !== 'number' || !Number.isInteger(seller_id)) {
      return json({ error: 'seller_id is required and must be an integer.' }, { status: 400 });
    }

    // Check auction config if adding new items is allowed
    const { data: auctionConfig, error: configError } = await supabaseServiceRole
      .from('auctionconfig') // Lowercase table name
      .select('allow_new_items')
      .eq('id', 1) // Assuming singleton config table with id 1
      .single();

    if (configError || !auctionConfig) {
      console.error('Error fetching auction config:', configError);
      return json({ error: 'Could not verify auction settings.' }, { status: 500 });
    }

    if (!auctionConfig.allow_new_items) {
      return json({ error: 'Adding new items is currently disallowed by auction configuration.' }, { status: 403 });
    }

    // Check if seller_id exists
    const { data: seller, error: sellerError } = await supabaseServiceRole
      .from('users') // Lowercase table name
      .select('id')
      .eq('id', seller_id)
      .maybeSingle(); // Use maybeSingle to check existence without erroring if not found

    if (sellerError) {
      console.error('Error checking seller existence:', sellerError);
      return json({ error: 'Could not verify seller.', details: sellerError.message }, { status: 500 });
    }
    if (!seller) {
      return json({ error: `Seller with id ${seller_id} not found.` }, { status: 400 }); // Or 404 depending on desired strictness
    }

    // Insert the new item
    const { data: newItem, error: insertError } = await supabaseServiceRole
      .from('items') // Lowercase table name
      .insert({
        description: description.trim(),
        seller_id: seller_id,
        // status defaults to 'available' in DB schema
        // current_price defaults to null
        // owner_id defaults to null
      })
      .select('id, description, seller_id, status, current_price, owner_id') // As per API spec
      .single();

    if (insertError) {
      console.error('Supabase item insert error:', insertError);
      return json({ error: 'Failed to create item.', details: insertError.message }, { status: 500 });
    }
    
    if (!newItem) {
      return json({ error: 'Failed to create item or retrieve created item data.' }, { status: 500 });
    }

    return json(newItem as Item, { status: 201 });

  } catch (e) {
    if (e instanceof SyntaxError) {
      return json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    console.error('Server error (POST /items):', e);
    return json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
};

// GET /items: List all items and their seller, current status, new owner and (current) price
export const GET: RequestHandler = async () => {
  try {
    // The API spec requires seller_name and owner_name (denormalized).
    // This requires joins or multiple queries. Supabase allows for embedded selects.
    const { data: items, error: fetchError } = await supabaseServiceRole
      .from('items') // Lowercase table name
      .select(`
        id,
        description,
        seller_id,
        seller:users!items_seller_id_fkey ( name ), 
        status,
        current_price,
        owner_id,
        owner:users!items_owner_id_fkey ( name )
      `);
      // The !items_seller_id_fkey syntax is a Supabase way to hint which foreign key to use for the join
      // Adjust if your foreign key names are different. Check your Supabase dashboard for correct FK names or use a simpler join.
      // If FK names are standard like `items_seller_id_fkey`, Supabase might infer it: `seller:users(name)`

    if (fetchError) {
      console.error('Supabase items fetch error:', fetchError);
      return json({ error: 'Failed to retrieve items.', details: fetchError.message }, { status: 500 });
    }

    // Transform the data to match the API_SPEC.md (seller_name, owner_name)
    const formattedItems = (items as SupabaseItem[]).map(item => {
      // Type assertions to help TypeScript understand the structure
      const seller = item.seller ? item.seller : null;
      const owner = item.owner ? item.owner : null;
      
      return {
        id: item.id,
        description: item.description,
        seller_id: item.seller_id,
        seller_name: seller && typeof seller === 'object' ? seller.name : null,
        status: item.status,
        current_price: item.current_price,
        owner_id: item.owner_id,
        owner_name: owner && typeof owner === 'object' ? owner.name : null,
      };
    });

    return json(formattedItems as Item[] || [], { status: 200 });

  } catch (e) {
    console.error('Server error (GET /items):', e);
    return json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
};