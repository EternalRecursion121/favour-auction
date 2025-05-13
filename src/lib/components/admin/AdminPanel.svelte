<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { AuctionConfig, ChartDataPoint, AuctionResult, Bid, Auction, User } from '$lib/types';
	import AuctionControls from './AuctionControls.svelte';
	import PriceChart from './PriceChart.svelte';
	import AuctionResults from './AuctionResults.svelte';

	// Define a simpler type for the user list in admin panel
	interface AdminUserEntry {
		id: number;
		name: string;
		balance: number;
	}

	let auctionConfig: AuctionConfig | null = null;
	let itemsRemaining = 0;
	let error: string | null = null;
	let pollInterval: ReturnType<typeof setInterval>;
	let priceHistory: ChartDataPoint[] = [];
	let auctionResults: AuctionResult[] = [];
	let adminUserList: AdminUserEntry[] = []; // State for the user list

	async function fetchConfigAndInitialData() {
		try {
			// Fetch config first as other fetches might depend on it implicitly or for display
			const response = await fetch('/api/admin/config');
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: response.statusText }));
				throw new Error(`Failed to fetch auction config: ${errorData.message || response.statusText}`);
			}
			auctionConfig = await response.json();
			
			// Fetch all other data concurrently now that config is potentially available
			await Promise.all([
				fetchItemsCount(),
				fetchCurrentAuctionData(),
				fetchAuctionResults(),
				fetchAdminUserList() // Fetch user list
			]);
		} catch (e: any) {
			console.error("Error fetching initial admin data:", e);
			error = e.message || 'An unknown error occurred during initial data load.';
		}
	}

	async function fetchItemsCount() {
		try {
			const itemsResponse = await fetch('/api/items');
			if (!itemsResponse.ok) {
				throw new Error(`Failed to fetch items (${itemsResponse.status})`);
			}
			const items: { sold: boolean }[] = await itemsResponse.json();
			const unsoldItems = items.filter(item => !item.sold);
			itemsRemaining = unsoldItems.length;
		} catch (e:any) {
			console.warn('Error fetching items count:', e.message);
			// Non-critical, allow panel to function
		}
	}

	async function fetchCurrentAuctionData() {
		try {
			const response = await fetch('/api/auctions/current');
			if (!response.ok) {
				if (response.status === 404) {
					priceHistory = [];
					return;
				}
				throw new Error(`Failed to fetch current auction data (${response.status})`);
			}
			const currentAuctionData: Auction | null = await response.json();

			if (currentAuctionData && currentAuctionData.bidHistory) {
				priceHistory = currentAuctionData.bidHistory.map((bid: Bid) => ({
					time: new Date(bid.timestamp).getTime(),
					value: bid.amount
				}));
			} else {
				priceHistory = [];
			}
		} catch (e:any) {
			console.warn('Error fetching current auction data:', e.message);
			priceHistory = []; 
		}
	}

	async function fetchAuctionResults() {
		try {
			const response = await fetch('/api/admin/results');
			if (!response.ok) {
				if (response.status === 404) {
					auctionResults = [];
					return;
				}
				throw new Error(`Failed to fetch auction results (${response.status})`);
			}
			auctionResults = await response.json();
		} catch (e:any) {
			console.warn('Error fetching auction results:', e.message);
			auctionResults = [];
		}
	}

	async function fetchAdminUserList() {
		try {
			const response = await fetch('/api/admin/users');
			if (!response.ok) {
				throw new Error(`Failed to fetch admin user list (${response.status})`);
			}
			adminUserList = await response.json();
		} catch (e: any) {
			console.warn('Error fetching admin user list:', e.message);
			adminUserList = []; // Default to empty list on error
		}
	}

	function startPolling() {
		pollInterval = setInterval(async () => {
			await Promise.all([
				fetchItemsCount(),
				fetchCurrentAuctionData(),
				fetchAuctionResults(),
				fetchAdminUserList() // Also poll user list
			]);
		}, 5000); // Poll every 5 seconds, adjust as needed
	}

	onMount(() => {
		fetchConfigAndInitialData(); // Fetch initial data
		startPolling(); // Start regular polling
	});

	onDestroy(() => {
		if (pollInterval) {
			clearInterval(pollInterval);
		}
	});

	async function handleReset() {
		// Stop polling during reset, then fetch all fresh data and restart polling
		if (pollInterval) clearInterval(pollInterval);
		error = null; // Clear previous errors
		priceHistory = [];
		auctionResults = [];
		adminUserList = [];
		auctionConfig = null;
		itemsRemaining = 0;
		await fetchConfigAndInitialData();
		startPolling();
	}

	async function handleAuctionActivity() {
		// When auction starts or next item is processed, quickly refresh relevant data
		await Promise.all([
			fetchCurrentAuctionData(),
			fetchItemsCount() // Item count might change
		]);
	}

</script>

<div class="admin-panel p-4 md:p-6 bg-bg-primary min-h-screen text-text-primary">
	<h1 class="text-3xl font-bold mb-6" style="color: var(--accent-teal);">Admin Dashboard</h1>

	{#if error}
		<div class="error-box bg-red-700 border border-red-900 text-white p-4 rounded-md mb-6 shadow-lg">
			<h3 class="font-bold text-lg mb-2">Error</h3>
			<p>{error}</p>
			<button on:click={() => error = null} class="mt-2 text-sm underline">Dismiss</button>
		</div>
	{/if}

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-1 space-y-6">
			<AuctionControls 
				{itemsRemaining} 
				config={auctionConfig} 
				on:reset={handleReset} 
				on:auctionStarted={handleAuctionActivity} 
				on:nextItemProcessed={handleAuctionActivity}
			/>
		</div>

		<div class="lg:col-span-2 space-y-6">
			<div class="card">
				<div class="card-header">
					<h2 class="text-xl font-bold" style="color: var(--accent-orange);">Price History</h2>
				</div>
				<div class="card-content">
					{#if priceHistory.length > 0}
						<PriceChart data={priceHistory} title="Current Auction Price Trend" />
					{:else}
						<p class="text-text-secondary text-center py-8">No price data available for the current auction.</p>
					{/if}
				</div>
			</div>
		</div>

		<div class="lg:col-span-full">
			<AuctionResults results={auctionResults} />
		</div>

		<!-- User List Table -->
		<div class="lg:col-span-full card mt-6">
			<div class="card-header">
				<h2 class="text-xl font-bold" style="color: var(--accent-purple);">User List</h2>
			</div>
			<div class="card-content overflow-x-auto">
				{#if adminUserList.length > 0}
					<table class="w-full min-w-[400px] text-sm text-left">
						<thead class="text-xs text-text-secondary uppercase bg-bg-secondary">
							<tr>
								<th scope="col" class="px-4 py-3">ID</th>
								<th scope="col" class="px-4 py-3">Name</th>
								<th scope="col" class="px-4 py-3 text-right">Balance</th>
							</tr>
						</thead>
						<tbody>
							{#each adminUserList as listUser (listUser.id)}
								<tr class="border-b border-bg-tertiary hover:bg-bg-secondary transition-colors duration-150">
									<td class="px-4 py-3 numeric">{listUser.id}</td>
									<td class="px-4 py-3 font-medium">{listUser.name}</td>
									<td class="px-4 py-3 text-right numeric" style="color: var(--accent-green);">{listUser.balance}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{:else}
					<p class="text-text-secondary text-center py-8">No users found or unable to load user list.</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.error-box {
		/* Custom styles for a more prominent error box if needed */
	}
	.numeric {
        font-variant-numeric: tabular-nums;
    }
	/* Ensure cards have a consistent styling, assuming app-wide styles or Tailwind handle this */
	/* .card { background-color: var(--bg-secondary); border-radius: 0.5rem; box-shadow: var(--shadow-md); } */
	/* .card-header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--bg-tertiary); } */
	/* .card-content { padding: 1.5rem; } */
</style>