<script lang="ts">
	import { onMount } from 'svelte';
	import type { AuctionConfig, ApiResponse } from '$lib/types';

	export let itemsRemaining = 0;

	let isResetting = false;
	let resetStatus = { success: false, message: '' };
	let resetMessage = '';

	let isSelectingNext = false;
	let nextItemStatus = { success: false, message: '' };
	let nextMessage = '';

	let isStarting = false;
	let startStatus: ApiResponse<{ item?: { title: string }; remainingItems?: number }> | null = null;
	let startMessage = '';

	let config: AuctionConfig | null = null;

	async function fetchConfig() {
		try {
			const response = await fetch('/api/admin/config');
			config = await response.json();
		} catch (error) {
			console.error('Failed to fetch config:', error);
		}
	}

	async function handleStartAuction() {
		// Don't proceed if there are no items remaining
		if (itemsRemaining === 0) {
			startMessage = 'No items available to auction';
			startStatus = null;
			return;
		}

		try {
			isStarting = true;
			startMessage = '';

			const response = await fetch('/api/admin/start-auction', {
				method: 'POST'
			});

			const result = await response.json();
			startStatus = result;

			if (result.success) {
				startMessage = `Started auction for: ${result.data?.item?.title || 'Item'}`;

				// Update the items remaining count
				if (itemsRemaining > 0) {
					itemsRemaining = result.data?.remainingItems || (itemsRemaining - 1);
				}

				// Clear message after a delay
				setTimeout(() => {
					startMessage = '';
				}, 3000);
			} else {
				startMessage = result.message || 'Failed to start auction';
			}
		} catch (error) {
			console.error('Failed to start auction:', error);
			startMessage = 'Failed to start auction';
			startStatus = null;
		} finally {
			isStarting = false;
		}
	}

	async function handleResetAuction() {
		try {
			isResetting = true;
			resetMessage = '';

			const response = await fetch('/api/admin/reset', {
				method: 'POST'
			});

			const result = await response.json();

			if (result.success) {
				resetMessage = 'Auction reset successfully';
				itemsRemaining = 0;
				// Refresh item count or other data as needed
				setTimeout(() => {
					window.location.reload(); // Refresh the page to update all components
				}, 1500);
			} else {
				resetMessage = result.message || 'Failed to reset auction';
			}
		} catch (error) {
			console.error('Failed to reset auction:', error);
			resetMessage = 'Failed to reset auction';
			resetStatus.success = false;
		} finally {
			isResetting = false;
		}
	}

	async function handleNextItem() {
		// Don't proceed if there are no items remaining
		if (itemsRemaining === 0) {
			nextMessage = 'No items available to auction';
			nextItemStatus.success = false;
			return;
		}
		
		try {
			isSelectingNext = true;
			nextMessage = '';

			const response = await fetch('/api/admin/next-item', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			nextItemStatus = await response.json();

			if (nextItemStatus.success) {
				nextMessage = nextItemStatus.message || 'Next item processed successfully!';

				// Update the items remaining count (server response doesn't contain it)
				// Fetching latest count might be better, but decrementing is simpler for now.
				if (itemsRemaining > 0) {
					itemsRemaining--; 
				}

				// Clear message after a delay
				setTimeout(() => {
					nextMessage = '';
				}, 3000);
			} else {
				nextMessage = nextItemStatus.message || 'Failed to select next item';
			}
		} catch (error) {
			console.error('Error selecting next item:', error);
			nextMessage = 'Error connecting to server';
			nextItemStatus.success = false;
		} finally {
			isSelectingNext = false;
		}
	}

	onMount(() => {
		fetchConfig();
	});
</script>

<div class="card">
	<div class="card-header">
		<h2 class="text-xl font-bold" style="color: var(--accent-blue);">Auction Controls</h2>
	</div>

	<div class="card-content">
		{#if config}
			<div class="config-info">
				<p>Current Auction Type: {config.auctionType}</p>
				<p>Allow New Items: {config.allowNewItems ? 'Yes' : 'No'}</p>
				
				{#if config.pennyAuctionConfig}
					<div class="penny-config">
						<h3>Penny Auction Settings</h3>
						<p>Increment Amount: {config.pennyAuctionConfig.incrementAmount}</p>
						<p>Time Extension: {config.pennyAuctionConfig.timeExtension}s</p>
						<p>Minimum Time: {config.pennyAuctionConfig.minimumTimeRemaining}s</p>
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex items-center justify-between mb-4">
			<span style="color: var(--text-secondary);">Items Remaining:</span>
			<span class="font-medium text-lg numeric">{itemsRemaining}</span>
		</div>

		<div class="space-y-3">
			<div>
				<button
					class="w-full btn btn-green font-mono mb-2"
					on:click={handleStartAuction}
					disabled={isStarting || itemsRemaining === 0 || !config?.allowNewItems}
				>
					{#if isStarting}
						STARTING...
					{:else if itemsRemaining === 0}
						NO ITEMS AVAILABLE
					{:else}
						START AUCTION
					{/if}
				</button>

				{#if startMessage}
					<div class="mt-2 p-2 rounded text-sm text-center mb-4"
						 style={`background-color: ${startStatus?.success ? 'var(--accent-green)' : 'var(--accent-red)'}; color: white;`}>
						{startMessage}
					</div>
				{/if}
			</div>

			<div>
				<button
					class="w-full btn btn-blue font-mono"
					on:click={handleNextItem}
					disabled={isSelectingNext || itemsRemaining === 0}
				>
					{#if isSelectingNext}
						SELECTING...
					{:else if itemsRemaining === 0}
						NO ITEMS AVAILABLE
					{:else}
						NEXT ITEM
					{/if}
				</button>

				{#if nextMessage}
					<div class="mt-2 p-2 rounded text-sm text-center"
						 style={`background-color: ${nextItemStatus.success ? 'var(--accent-green)' : 'var(--accent-red)'}; color: white;`}>
						{nextMessage}
					</div>
				{/if}
			</div>

			<div>
				<button
					class="w-full font-mono"
					style="background-color: var(--accent-red); color: white; border-radius: 4px; padding: 0.5rem 1rem; font-weight: 500; font-size: 14px; transition: all 0.2s ease; border: none; letter-spacing: 0.01em; opacity: {isResetting ? '0.7' : '1'};"
					on:click={handleResetAuction}
					disabled={isResetting}
				>
					{#if isResetting}
						RESETTING...
					{:else}
						RESET AUCTION
					{/if}
				</button>

				{#if resetMessage}
					<div class="mt-2 p-2 rounded text-sm text-center"
						 style={`background-color: ${resetStatus.success ? 'var(--accent-green)' : 'var(--accent-red)'}; color: white;`}>
						{resetMessage}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.auction-controls {
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	
	.config-info {
		margin: 1rem 0;
	}
	
	.penny-config {
		margin: 1rem 0;
		padding: 1rem;
		background-color: var(--bg-tertiary); 
		border-radius: 4px;
	}
	
	.controls {
		display: flex;
		gap: 1rem;
		margin: 1rem 0;
	}
	
	.status-message {
		margin: 1rem 0;
		padding: 0.5rem;
		border-radius: 4px;
		background-color: #e2e3e5;
	}
</style>