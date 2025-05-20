import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set in your .env file for server-side client. Please add it.");
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in your .env file for server-side client. Please add it.");
}

export const supabaseServiceRole = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    // It's good practice to explicitly disable auto-refreshing sessions for a service role client
    // as it doesn't operate on behalf of a user.
    autoRefreshToken: false,
    persistSession: false
  }
});

// You can add helper functions here if needed, for example, to handle common error patterns
// or to abstract certain Supabase calls.