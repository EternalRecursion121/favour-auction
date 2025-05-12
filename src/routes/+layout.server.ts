import { initializeDatabase } from '$lib/server/db';

/** @type {import('./$types').LayoutServerLoad} */
export async function load() {
  // Initialize database when server starts
  await initializeDatabase();
  
  return {};
}