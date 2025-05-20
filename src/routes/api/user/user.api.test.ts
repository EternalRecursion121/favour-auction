import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User, Transaction } from '$lib/types';

// Define the base URL for your API. This assumes your dev server runs on port 5173.
// You might want to make this configurable via environment variables for different test environments.
const BASE_URL = 'http://localhost:5174/api';

let createdUserId: number | null = null;
const testUserName = `TestUser_${Date.now()}`;

describe('User API Endpoints', () => {
  // Note: For these tests to pass consistently, your SvelteKit dev server
  // (npm run dev) should be running and accessible at BASE_URL.
  // Also, these tests interact with your actual development database.

  it('POST /user - should create a new user', async () => {
    const response = await fetch(`${BASE_URL}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testUserName }),
    });
    expect(response.status).toBe(201);
    const data = await response.json() as User;
    expect(data).toHaveProperty('id');
    expect(data.name).toBe(testUserName);
    expect(data.balance).toBe(100);
    createdUserId = data.id; // Save for subsequent tests
  });

  it('GET /user - should return a list of users including the new one', async () => {
    expect(createdUserId).not.toBeNull(); // Ensure user was created
    const response = await fetch(`${BASE_URL}/user`);
    expect(response.status).toBe(200);
    const data = await response.json() as User[];
    expect(Array.isArray(data)).toBe(true);
    const foundUser = data.find(user => user.id === createdUserId);
    expect(foundUser).toBeDefined();
    expect(foundUser!.name).toBe(testUserName);
  });

  it('GET /user/{id} - should return the specific user', async () => {
    expect(createdUserId).not.toBeNull();
    const response = await fetch(`${BASE_URL}/user/${createdUserId}`);
    expect(response.status).toBe(200);
    const data = await response.json() as User;
    expect(data.id).toBe(createdUserId);
    expect(data.name).toBe(testUserName);
    expect(data.balance).toBe(100);
  });

  it('GET /user/{id}/transactions - should return transactions for the user (initial balance)', async () => {
    expect(createdUserId).not.toBeNull();
    const response = await fetch(`${BASE_URL}/user/${createdUserId}/transactions`);
    expect(response.status).toBe(200);
    const data = await response.json() as Transaction[];
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1); // At least the initial balance transaction
    const initialTransaction = data.find(t => t.description === 'Initial balance');
    expect(initialTransaction).toBeDefined();
    expect(initialTransaction!.amount_change).toBe(100);
    expect(initialTransaction!.new_balance).toBe(100);
  });

  it('DELETE /user/{id} - should delete the user', async () => {
    expect(createdUserId).not.toBeNull();
    const response = await fetch(`${BASE_URL}/user/${createdUserId}`, {
      method: 'DELETE',
    });
    expect(response.status).toBe(204);
  });

  it('GET /user/{id} - should return 404 for the deleted user', async () => {
    expect(createdUserId).not.toBeNull();
    const response = await fetch(`${BASE_URL}/user/${createdUserId}`);
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('User not found.');
  });

  // Test for non-existent user
  it('GET /user/{id} - should return 404 for a non-existent user ID', async () => {
    const nonExistentId = 9999999;
    const response = await fetch(`${BASE_URL}/user/${nonExistentId}`);
    expect(response.status).toBe(404);
  });

  it('DELETE /user/{id} - should return 404 for a non-existent user ID', async () => {
    const nonExistentId = 9999999;
    const response = await fetch(`${BASE_URL}/user/${nonExistentId}`, {
        method: 'DELETE',
    });
    expect(response.status).toBe(404);
  });

  it('POST /user - should return 400 if name is missing', async () => {
    const response = await fetch(`${BASE_URL}/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Missing name
    });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Name is required');
  });
});