<script lang="ts">
	import { onMount } from 'svelte';
	import type { 
		User, 
		BalanceHistoryEntry, 
		Item, 
		Auction, 
		AuctionConfig, 
		ChartDataPoint
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
	let priceHistory: ChartDataPoint[] = [];
	let auctionConfig: AuctionConfig | null = null;

	// Fetch the current user from localStorage or create a new one
	onMount(async () => {
		const storedName = localStorage.getItem('favourAuctionUserName');
		if (storedName) {
			userName = storedName;
			await loginUser();
		}

		// Polling for auction updates
		const pollAuction = async () => {
			if (authenticated) {
				await fetchCurrentAuction();
				await fetchAuctionConfig();
			}
			setTimeout(pollAuction, 2000);
		};

		pollAuction();
	});

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
		if (!user.id) return;

		try {
			// Get remaining items that the user is selling
			const itemsResponse = await fetch('/api/items');
			if (itemsResponse.ok) {
				const items = await itemsResponse.json() as Item[];
				remainingItems = items.filter((item: Item) => !item.sold).length;
				userItems = items.filter((item: Item) => item.seller.id === user.id && !item.sold).length;
			}

			// Get balance history
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
				// Convert bid history into price history for chart
				if (currentAuction?.bidHistory) {
					priceHistory = currentAuction.bidHistory.map((bid: { timestamp: string; price: number }) => ({
						x: new Date(bid.timestamp),
						y: bid.price
					}));
				}
			} else if (response.status === 404) {
				// No active auction
				currentAuction = null;
			}
		} catch (error) {
			console.error('Error fetching auction:', error);
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
				const error = await response.json();
				console.error('Add item error:', error);
				addItemSuccess = false;
				addItemMessage = error.message || 'Failed to add item';
			}
		} catch (error) {
			console.error('Add item failed:', error);
			addItemSuccess = false;
			addItemMessage = 'Failed to add item';
		}
	}

	// Place a bid
	async function placeBid(amount: number) {
		if (!currentAuction || !amount || !currentAuction.item) return;

		try {
			const response = await fetch('/api/auctions/bid', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: user.id,
					itemId: currentAuction.item.id,
					amount
				})
			});

			const result = await response.json();
			
			if (response.ok) {
				user.balance = result.newBalance;
				await fetchCurrentAuction();
			}
		} catch (error) {
			console.error('Bid failed:', error);
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
							disabled={auctionConfig && !auctionConfig.allowNewItems}
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
					<CurrentAuction 
						{currentAuction}
						{user}
						{priceHistory}
						{auctionConfig}
						onPlaceBid={placeBid}
					/>
					
					<AuctionResults {currentAuction} {user} />
				</div>
			</div>
		{/if}
	</main>
</div>