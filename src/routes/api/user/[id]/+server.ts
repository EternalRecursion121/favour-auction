import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { supabaseServiceRole } from '$lib/server/supabaseServiceRoleClient';
import type { User } from '$lib/types';

// GET /user/{id}: Get the balance of a specific user
export const GET: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return json({ error: 'User ID must be a valid integer.' }, { status: 400 });
    }

    const { data: user, error: fetchError } = await supabaseServiceRole
      .from('users')
      .select('id, name, balance') // Select only id, name, and balance as per API_SPEC.md
      .eq('id', userId)
      .single(); // Expect a single user or null

    if (fetchError) {
      // If .single() fails to find a row, it returns an error with code PGRST116
      // This is the standard way to check for a 404 with .single()
      if (fetchError.code === 'PGRST116') {
        return json({ error: 'User not found.' }, { status: 404 });
      }
      console.error('Supabase fetch error:', fetchError);
      return json({ error: 'Failed to retrieve user.', details: fetchError.message }, { status: 500 });
    }

    if (!user) { // Should be caught by PGRST116, but as a fallback
        return json({ error: 'User not found.' }, { status: 404 });
    }

    return json(user as User, { status: 200 });

  } catch (e) {
    console.error('Server error:', e);
    return json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
};

// DELETE /user/{id}: Delete a specific user
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const { id } = params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return json({ error: 'User ID must be a valid integer.' }, { status: 400 });
    }

    console.log(`[DELETE Handler] Attempting to delete user ID: ${userId}`); // DEBUG
    const { error: deleteError, count } = await supabaseServiceRole
      .from('users')
      .delete({ count: 'exact' })
      .eq('id', userId);
    
    console.log('[DELETE Handler] User ID:', userId, 'Error:', deleteError, 'Count:', count); // DEBUG

    if (deleteError) {
      console.error('[DELETE Handler] Supabase delete error:', deleteError);
      return json({ error: 'Failed to delete user.', details: deleteError.message }, { status: 500 });
    }

    // Check count to determine if a row was actually deleted
    if (count === 0) {
      console.log('[DELETE Handler] Count is 0, returning 404 for user ID:', userId); // DEBUG
      return json({ error: 'User not found.' }, { status: 404 });
    }
    
    console.log('[DELETE Handler] User deleted (count > 0), returning 204 for user ID:', userId); // DEBUG
    return new Response(null, { status: 204 }); 

  } catch (e) {
    console.error('Server error (DELETE /user/{id}):', e);
    return json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
};