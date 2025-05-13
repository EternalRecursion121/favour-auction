<script lang="ts">
	import { onMount } from 'svelte';
	import type { 
		User, 
		BalanceHistoryEntry, 
		Item, 
		Auction, 
		AuctionConfig,
		BidResult,
		Bid
	} from '$lib/types';
	
	import Header from '$lib/components/Header.svelte';
	import LoginForm from '$lib/components/LoginForm.svelte';
	import UserStats from '$lib/components/UserStats.svelte';
	import AddItemForm from '$lib/components/AddItemForm.svelte';
	import CurrentAuction from '$lib/components/CurrentAuction.svelte';
	import AuctionResults from '$lib/components/AuctionResults.svelte';

	// User state
	let user: User = { id: 0, name: '', balance: 0, itemsSold: 0, itemsBought: 0 };
	let userName = '';
	let authenticated = false;
	let balanceHistory: BalanceHistoryEntry[] = [];

	// Item creation
	let showAddItemForm = false;
	let addItemSuccess = false;
	let addItemMessage = '';

	// Auction state
	let currentAuction: Auction | null = null;
	let remainingItems = 0;
	let userItems = 0;
	let auctionConfig: AuctionConfig | null = null;
	let pollInterval: ReturnType<typeof setInterval>;

	// Fetch the current user from localStorage or create a new one
	onMount(() => {
		const storedName = localStorage.getItem('favourAuctionUserName');
		if (storedName) {
			userName = storedName;
			loginUser();
		}

		// Start polling for auction updates
		startPolling();

		return () => {
			// Cleanup interval when component is destroyed
			if (pollInterval) {
				clearInterval(pollInterval);
			}
		};
	});

	// Start polling for updates
	function startPolling() {
		// Poll every 1 second for updates
		pollInterval = setInterval(async () => {
			if (authenticated) {
				await fetchCurrentAuction();
				await fetchAuctionConfig();
				await fetchUserData();
			}
		}, 1000);
	}

	// User authentication
	async function loginUser() {
		try {
			const response = await fetch('/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: userName })
			});

			if (response.ok) {
				user = await response.json();
				localStorage.setItem('favourAuctionUserName', userName);
				authenticated = true;
				await fetchUserData();
				await fetchCurrentAuction();
				await fetchAuctionConfig();
			} else {
				const error = await response.json();
				console.error('Login error:', error);
			}
		} catch (error) {
			console.error('Login failed:', error);
		}
	}

	// Fetch user balance history
	async function fetchUserData() {
		if (!user || !user.id) return;

		try {
			const userDetailsResponse = await fetch(`/api/users/${user.id}`);
			if (userDetailsResponse.ok) {
				const userDetails: User = await userDetailsResponse.json();
				user = { ...user, ...userDetails };
			}

			const itemsResponse = await fetch('/api/items');
			if (itemsResponse.ok) {
				const items = await itemsResponse.json() as Item[];
				remainingItems = items.filter((item: Item) => !item.sold).length;
				userItems = items.filter((item: Item) => item.seller.id === user.id && !item.sold).length;
			}

			const balanceResponse = await fetch(`/api/users/${user.id}/balance-history`);
			if (balanceResponse.ok) {
				balanceHistory = await balanceResponse.json() as BalanceHistoryEntry[];
			}
		} catch (error) {
			console.error('Error fetching user data:', error);
		}
	}

	// Fetch current auction information
	async function fetchCurrentAuction() {
		try {
			const response = await fetch('/api/auctions/current');
			if (response.ok) {
				currentAuction = await response.json() as Auction;
			} else if (response.status === 404) {
				// No active auction
				currentAuction = null;
			}
		} catch (error) {
			console.error('Error fetching auction:', error);
			currentAuction = null;
		}
	}

	// Fetch auction configuration
	async function fetchAuctionConfig() {
		try {
			const response = await fetch('/api/auctions/config');
			if (response.ok) {
				auctionConfig = await response.json() as AuctionConfig;
			}
		} catch (error) {
			console.error('Error fetching config:', error);
		}
	}

	// Add a new item
	async function addItem(title: string, description: string) {
		if (!user || !user.id) {
			addItemMessage = 'User not authenticated to add items.';
			addItemSuccess = false;
			return;
		}
		try {
			const response = await fetch('/api/items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description,
					sellerId: user.id
				})
			});

			if (response.ok) {
				showAddItemForm = false;
				addItemSuccess = true;
				addItemMessage = 'Item added successfully!';
				await fetchUserData();
				
				// Clear success message after 3 seconds
				setTimeout(() => {
					addItemSuccess = false;
					addItemMessage = '';
				}, 3000);
			} else {
				const errorResult = await response.json();
				console.error('Add item error:', errorResult);
				addItemSuccess = false;
				addItemMessage = errorResult.message || 'Failed to add item';
			}
		} catch (error) {
			console.error('Add item failed:', error);
			addItemSuccess = false;
			addItemMessage = 'Client error: Failed to add item';
		}
	}

	// Place a bid
	async function handlePlaceBid(itemId: number, bidAmount: number): Promise<BidResult | null> {
		if (!currentAuction || !bidAmount || !user || !user.id) {
			return { accepted: false, message: 'Invalid bid state or not authenticated.' };
		}

		try {
			const response = await fetch('/api/auctions/bid', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: user.id,
					itemId: itemId,
					amount: bidAmount
				})
			});

			const result: BidResult = await response.json();
			
			if (response.ok && result.accepted) {
				if (typeof result.newBalance === 'number') {
					user.balance = result.newBalance;
				}
				await fetchCurrentAuction();
				await fetchUserData();
				return result;
			} else {
				console.error('Bid rejected or failed:', result.message || response.statusText);
				await fetchUserData();
				return result;
			}
		} catch (error) {
			console.error('Bid submission failed:', error);
			await fetchUserData();
			return { accepted: false, message: 'Client error: Bid submission failed.' };
		}
	}
</script>

<div class="min-h-screen" style="background-color: var(--bg-primary);">
	<Header {user} {authenticated} />

	<main class="container mx-auto p-4">
		{#if !authenticated}
			<LoginForm bind:userName onLogin={loginUser} />
		{:else}
			<!-- User Dashboard -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
				<!-- Left Column: User Stats & Add Item -->
				<div class="space-y-6">
					<UserStats {user} {userItems} {remainingItems} {balanceHistory} />
					
					{#if !showAddItemForm}
						<button 
							on:click={() => showAddItemForm = true}
							class="w-full py-2 px-4 btn btn-green font-mono"
							disabled={!auctionConfig || !auctionConfig.allowNewItems}
						>
							ADD NEW ITEM
						</button>
					{:else}
						<AddItemForm 
							onAddItem={addItem}
							onCancel={() => showAddItemForm = false}
							allowNewItems={auctionConfig?.allowNewItems ?? false}
						/>
					{/if}

					{#if addItemMessage}
						<div class="mt-4 p-3 rounded text-center" style="background-color: {addItemSuccess ? 'var(--accent-green)' : 'var(--accent-red)'};">
							<p class="font-bold">{addItemMessage}</p>
						</div>
					{/if}
				</div>
				
				<!-- Middle Column: Current Auction -->
				<div class="lg:col-span-2 space-y-6">
					{#if currentAuction && currentAuction.active}
						<CurrentAuction 
							{currentAuction}
							{user}
							{auctionConfig}
							onPlaceBid={handlePlaceBid}
						/>
					{:else if currentAuction && !currentAuction.active}
						<AuctionResults {currentAuction} {user} />
						<div class="card flex flex-col items-center justify-center p-10 min-h-[20rem] text-center">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 mb-4 text-text-tertiary opacity-50">
								<path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd" />
							</svg>
							<h2 class="text-xl font-bold mb-2" style="color: var(--accent-blue);">Auction Ended</h2>
							<p style="color: var(--text-secondary);">Waiting for the next auction to begin.</p>
						</div>
					{:else}
						<div class="card flex flex-col items-center justify-center p-10 min-h-[20rem] text-center">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12 mb-4 text-text-tertiary opacity-50">
								<path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" clip-rule="evenodd" />
							</svg>
							<h2 class="text-xl font-bold mb-2" style="color: var(--accent-blue);">No Active Auction</h2>
							<p style="color: var(--text-secondary);">Please wait for the admin to start the next auction.</p>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</main>
</div>