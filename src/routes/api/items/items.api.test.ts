import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Item } from '$lib/types';

const BASE_URL = 'http://localhost:5174/api'; // Assuming default SvelteKit dev port

let testSellerId: number | null = null;
let createdItemId: number | null = null; // This will be the ID of an item we successfully create and then delete
let itemToDeleteLaterId: number | null = null; // This will be an item created specifically to test non-deletion scenarios (e.g. sold item)

const testSellerName = `TestSellerForItem_${Date.now()}`;
const testItemDescription = 'A unique test item for automated tests';

describe('Items API Endpoints', () => {
  // Prerequisite: Create a user to act as a seller for these item tests.
  beforeAll(async () => {
    // Create a seller user first
    const userResponse = await fetch(`${BASE_URL}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testSellerName }),
    });
    if (userResponse.status !== 201) {
      const errorData = await userResponse.json();
      throw new Error(`Failed to create prerequisite seller user. Status: ${userResponse.status}. Error: ${errorData.error || 'Unknown error'}`);
    }
    const userData = await userResponse.json();
    testSellerId = userData.id;
    console.log(`[Items Test] Prerequisite seller user created with ID: ${testSellerId}`);

    // Note: We're skipping the auction config part since it's not implemented yet
    // The tests assume the default configuration allows new items
    console.log('[Items Test] Skipping auction configuration - assuming new items are allowed by default.');
  });

  // Cleanup: Delete the created seller user and item after all tests in this describe block.
  afterAll(async () => {
    // Attempt to delete the specific item created for non-deletion tests if it wasn't deleted by a test case.
    // This assumes it might be in a state (e.g. sold) that prevents normal deletion through the API.
    // For a real test suite, you might need a special admin cleanup or ensure tests leave it deletable.
    if (itemToDeleteLaterId) {
      // We don't have a surefire way to delete it if it became 'sold' or 'active_auction' without specific admin tools.
      // So we just log it for now. The DB might need manual cleanup for such items.
      console.warn(`[Items Test] Item with ID ${itemToDeleteLaterId} might need manual cleanup if tests left it in a non-deletable state (e.g., sold, active).`);
      // If it IS deletable and a test didn't delete it, this will try:
      const delResponse = await fetch(`${BASE_URL}/items/${itemToDeleteLaterId}`, { method: 'DELETE' });
      if (delResponse.status === 204) {
        console.log(`[Items Test] Cleaned up itemToDeleteLaterId ${itemToDeleteLaterId}.`);
      }
    }
    if (createdItemId) {
        // This item SHOULD have been deleted by the DELETE test. If not, this is a fallback.
        const response = await fetch(`${BASE_URL}/items/${createdItemId}`, { method: 'DELETE' });
        if (response.status === 204) {
          console.log(`[Items Test] Successfully cleaned up createdItemId ${createdItemId} in afterAll.`);
        } else if (response.status !== 404) { // Don't error if already deleted
          console.warn(`[Items Test] Failed to clean up createdItemId ${createdItemId} in afterAll. Status: ${response.status}`);
        }
    }
    if (testSellerId) {
      const response = await fetch(`${BASE_URL}/user/${testSellerId}`, { method: 'DELETE' });
      if (response.status === 204) {
        console.log(`[Items Test] Prerequisite seller user ID ${testSellerId} deleted.`);
      } else {
        console.error(`[Items Test] Failed to delete prerequisite seller user ID ${testSellerId}. Status: ${response.status}`);
      }
    }
  });

  it('POST /items - should create a new item for an existing seller', async () => {
    expect(testSellerId).not.toBeNull(); // Ensure seller was created

    const response = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: testItemDescription,
        seller_id: testSellerId,
      }),
    });
    expect(response.status).toBe(201);
    const data = await response.json() as Item;
    expect(data).toHaveProperty('id');
    expect(data.description).toBe(testItemDescription);
    expect(data.seller_id).toBe(testSellerId);
    expect(data.status).toBe('available');
    createdItemId = data.id;
  });

  it('POST /items - should return 400 if seller_id does not exist', async () => {
    const nonExistentSellerId = 9999999;
    const response = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Another item',
        seller_id: nonExistentSellerId,
      }),
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain(`Seller with id ${nonExistentSellerId} not found`);
  });

  it('POST /items - should return 400 if description is missing', async () => {
    expect(testSellerId).not.toBeNull();
    const response = await fetch(`${BASE_URL}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seller_id: testSellerId }),
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Description is required');
  });
  
  it('GET /items - should return a list of items including the newly created one', async () => {
    expect(createdItemId).not.toBeNull(); // Ensure item was created
    const response = await fetch(`${BASE_URL}/items`);
    expect(response.status).toBe(200);
    const data = await response.json() as Item[];
    expect(Array.isArray(data)).toBe(true);
    const foundItem = data.find(item => item.id === createdItemId);
    expect(foundItem).toBeDefined();
    expect(foundItem!.description).toBe(testItemDescription);
    expect(foundItem!.seller_id).toBe(testSellerId);
    expect(foundItem!.seller_name).toBe(testSellerName);
    expect(foundItem!.status).toBe('available');
  });

  it('GET /items/{item_id} - should return the specific item with seller details', async () => {
    expect(createdItemId).not.toBeNull();
    const response = await fetch(`${BASE_URL}/items/${createdItemId}`);
    expect(response.status).toBe(200);
    const data = await response.json() as Item;
    expect(data.id).toBe(createdItemId);
    expect(data.description).toBe(testItemDescription);
    expect(data.seller_id).toBe(testSellerId);
    expect(data.seller_name).toBe(testSellerName);
    expect(data.status).toBe('available');
    expect(data).toHaveProperty('bids'); // Check if bids array is present (even if empty)
    expect(Array.isArray(data.bids)).toBe(true);
  });

  it('GET /items/{item_id} - should return 404 for a non-existent item ID', async () => {
    const nonExistentItemId = 9999999;
    const response = await fetch(`${BASE_URL}/items/${nonExistentItemId}`);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Item not found.');
  });

  // Add a test for POST /items when allow_new_items is false in auction config
  it.skip('POST /items - should return 403 if allow_new_items is false', async () => {
    // Skip this test since auction config API is not implemented yet
    expect(testSellerId).not.toBeNull();
    // This test will be implemented when the auction config API is ready
  });

  // --- DELETE /items/{item_id} Tests ---
  it('DELETE /items/{item_id} - should delete the created item', async () => {
    expect(createdItemId).not.toBeNull(); 
    const response = await fetch(`${BASE_URL}/items/${createdItemId}`, { method: 'DELETE' });
    expect(response.status).toBe(204);
    // Verify item is actually deleted by trying to GET it
    const getResponse = await fetch(`${BASE_URL}/items/${createdItemId}`);
    expect(getResponse.status).toBe(404);
    // Set createdItemId to null so it's not attempted to be deleted again in afterAll
    createdItemId = null; 
  });

  it('DELETE /items/{item_id} - should return 404 for a non-existent item ID', async () => {
    const nonExistentItemId = 9999998; 
    const response = await fetch(`${BASE_URL}/items/${nonExistentItemId}`, { method: 'DELETE' });
    expect(response.status).toBe(404);
  });

  it('DELETE /items/{item_id} - should return 400 for an invalid item ID format', async () => {
    const invalidItemId = 'not-an-integer';
    const response = await fetch(`${BASE_URL}/items/${invalidItemId}`, { method: 'DELETE' });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Item ID must be a valid integer.');
  });
  
  it.skip('DELETE /items/{item_id} - should return 409 if item is currently active in auction', async () => {
    // Skip this test since auction config API is not implemented yet
    expect(testSellerId).not.toBeNull();
    // This test will be implemented when the auction config API is ready
  });

  // Note: Testing deletion of a 'sold' item requires more setup (simulating a sale).
  // For now, the DELETE /items/{item_id} implementation includes a check for 'sold' status.
  // A dedicated test would involve creating a user, an item, making the item sold (which 
  // would require /auction/bid and /auction/end_item to be functional and used), then attempting delete.
});