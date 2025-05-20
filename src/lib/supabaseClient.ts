import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/dynamic/public';

// Get Supabase URL and Anon Key from SvelteKit's dynamic public environment variables
// These should be defined in your .env file as PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseAnonKey = PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("PUBLIC_SUPABASE_URL is not set in your .env file. Please add it.");
}
if (!supabaseAnonKey) {
  throw new Error("PUBLIC_SUPABASE_ANON_KEY is not set in your .env file. Please add it.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);