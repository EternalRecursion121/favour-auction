import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseServiceRole } from '$lib/server/supabaseServiceRoleClient';
import type { Transaction } from '$lib/types';

// GET /user/{id}/transactions: Get the transaction history of a specific user
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return json({ error: 'User ID must be a valid integer.' }, { status: 400 });
    }

    // First, check if the user exists to provide a clear 404 if not
    const { data: user, error: userFetchError } = await supabaseServiceRole
      .from('users')
      .select('id') 
      .eq('id', userId)
      .maybeSingle(); 

    if (userFetchError) { 
      // We don't expect PGRST116 with maybeSingle, so any error here is likely a 500-level issue.
      console.error('Supabase user fetch error (transactions endpoint):', userFetchError);
      return json({ error: 'Failed to verify user existence.', details: userFetchError.message }, { status: 500 });
    }
    
    if (!user) { // If maybeSingle() returns null user
        return json({ error: 'User not found.' }, { status: 404 });
    }

    // If user exists, fetch their transactions
    const selectQuery = 'transaction_id:id, description, amount_change, new_balance, timestamp, related_item_id, related_bid_id';

    const { data: transactions, error: transactionsFetchError } = await supabaseServiceRole
      .from('transactions')
      .select(selectQuery)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (transactionsFetchError) {
      console.error('Supabase transactions fetch error:', transactionsFetchError);
      return json({ error: 'Failed to retrieve transactions.', details: transactionsFetchError.message }, { status: 500 });
    }

    return json(transactions as Transaction[] || [], { status: 200 });

  } catch (e) {
    console.error('Server error (transactions endpoint):', e);
    return json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
};