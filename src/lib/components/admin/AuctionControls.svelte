<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { AuctionConfig } from '$lib/types';

	export let itemsRemaining = 0;
	export let config: AuctionConfig | null = null;

	const dispatch = createEventDispatcher();

	let isResetting = false;
	let resetStatus = { success: false, message: '' };
	let resetMessage = '';

	let isSelectingNext = false;
	let nextItemStatus = { success: false, message: '' };
	let nextMessage = '';

	let isStarting = false;
	interface StartNextItemSuccessResponse {
		success: true;
		item: { id: number; title: string; description: string; seller: {id: number; name: string} | null } | null;
		remainingItems: number;
		message?: string;
	}
	interface ErrorResponse {
		success: false;
		message: string;
		error?: boolean;
		code?: string;
	}
	type StartNextItemResponse = StartNextItemSuccessResponse | ErrorResponse;

	let startOperationResult: StartNextItemResponse | null = null;
	let startMessage = '';

	async function handleStartAuction() {
		if (itemsRemaining === 0 && !config?.allowNewItems) {
			startMessage = 'No items available and new items are not allowed.';
			startOperationResult = null;
			return;
		}

		try {
			isStarting = true;
			startMessage = '';

			const response = await fetch('/api/admin/next-item', {
				method: 'POST'
			});

			const result: StartNextItemResponse = await response.json();
			startOperationResult = result;

			if (result.success) {
				if (result.item) {
					startMessage = `Started auction for: ${result.item.title}`;
					dispatch('auctionStarted');
					setTimeout(() => {
						startMessage = '';
					}, 3000);
				} else {
					startMessage = result.message || 'No more items to auction or action completed.';
					dispatch('auctionStarted');
				}
			} else {
				startMessage = result.message || 'Failed to start auction';
			}
		} catch (error: any) {
			console.error('Failed to start auction:', error);
			startMessage = error.message || 'Failed to start auction (client error)';
			startOperationResult = { success: false, message: startMessage, error: true };
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
			const result: { success: boolean, message?: string } = await response.json();
			resetStatus = { success: result.success, message: result.message || (result.success ? 'Auction reset successfully' : 'Failed to reset auction') };
			if (result.success) {
				resetMessage = result.message || 'Auction reset successfully';
				dispatch('reset');
				setTimeout(() => { resetMessage = ''; }, 3000);
			} else {
				resetMessage = result.message || 'Failed to reset auction';
			}
		} catch (error: any) {
			console.error('Failed to reset auction:', error);
			resetMessage = error.message || 'Failed to reset auction';
			resetStatus = { success: false, message: resetMessage };
		} finally {
			isResetting = false;
		}
	}

	async function handleNextItem() {
		if (itemsRemaining === 0) {
			nextMessage = 'No items available to process';
			nextItemStatus = { success: false, message: nextMessage };
			return;
		}
		
		try {
			isSelectingNext = true;
			nextMessage = '';
			const response = await fetch('/api/admin/next-item', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' }
			});

			const result: StartNextItemResponse = await response.json();
			nextItemStatus.success = result.success;

			if (result.success) {
				if (result.item) {
					nextMessage = `Next item: ${result.item.title}`;
					dispatch('nextItemProcessed');
					setTimeout(() => { nextMessage = ''; }, 3000);
				} else {
					nextMessage = result.message || 'No more items available.';
					dispatch('nextItemProcessed');
				}
			} else {
				nextMessage = result.message || 'Failed to select next item';
			}
			if (!result.success) {
				nextItemStatus.message = result.message;
			} else if (result.item === null && result.message) {
				nextItemStatus.message = result.message;
			} else if (result.item) {
				nextItemStatus.message = `Next item: ${result.item.title}`;
			}

		} catch (error: any) {
			console.error('Error selecting next item:', error);
			nextMessage = error.message || 'Error connecting to server';
			nextItemStatus = { success: false, message: nextMessage };
		} finally {
			isSelectingNext = false;
		}
	}
</script>

<div class="card mb-6">
	<div class="card-header">
		<h2 class="text-xl font-bold" style="color: var(--accent-blue);">Auction Controls</h2>
	</div>

	<div class="card-content">
		{#if config}
			<div class="config-info bg-bg-tertiary p-4 rounded mb-4">
				<h3 class="text-lg font-semibold mb-2" style="color: var(--accent-teal);">Current Configuration</h3>
				<div class="grid grid-cols-2 gap-2">
					<p><span class="text-text-secondary">Auction Type:</span></p>
					<p class="font-mono">{config.auctionType}</p>
					<p><span class="text-text-secondary">Allow New Items:</span></p>
					<p class="font-mono">{config.allowNewItems ? 'Yes' : 'No'}</p>
				</div>
				
				{#if config.pennyAuctionConfig}
					<div class="penny-config mt-3 pt-3 border-t border-opacity-10 border-white">
						<h3 class="text-sm font-semibold mb-2 font-mono uppercase" style="color: var(--accent-purple);">Penny Auction Settings</h3>
						<div class="grid grid-cols-2 gap-2 text-sm">
							<p><span class="text-text-secondary">Increment Amount:</span></p>
							<p class="font-mono">{config.pennyAuctionConfig.incrementAmount}</p>
							<p><span class="text-text-secondary">Time Extension:</span></p>
							<p class="font-mono">{config.pennyAuctionConfig.timeExtension}s</p>
							<p><span class="text-text-secondary">Minimum Time:</span></p>
							<p class="font-mono">{config.pennyAuctionConfig.minimumTimeRemaining}s</p>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="config-info bg-bg-tertiary p-4 rounded mb-4 text-center" style="color: var(--text-secondary);">
				Loading configuration...
			</div>
		{/if}

		<div class="flex items-center justify-between mb-4 p-3 bg-bg-tertiary rounded">
			<span class="text-sm font-mono uppercase" style="color: var(--text-secondary);">Items Remaining:</span>
			<span class="font-medium text-lg numeric" style="color: var(--accent-orange);">{itemsRemaining}</span>
		</div>

		<div class="space-y-3">
			<div>
				<button
					class="w-full btn btn-green font-mono mb-2"
					on:click={handleStartAuction}
					disabled={isStarting || (!config?.allowNewItems && itemsRemaining === 0)}
				>
					{#if isStarting}
						STARTING...
					{:else if (!config?.allowNewItems && itemsRemaining === 0)}
						ALL ITEMS AUCTIONED
					{:else if (config?.allowNewItems && itemsRemaining === 0)}
						START AUCTION
					{:else} 
						START NEXT AUCTION
					{/if}
				</button>
				{#if startMessage}
					<p class="text-sm text-center mt-1 {startOperationResult && startOperationResult.success ? 'text-green-400' : 'text-red-400'}">{startMessage}</p>
				{/if}
			</div>

			<div>
				<button
					class="w-full btn btn-blue font-mono mb-2"
					on:click={handleNextItem}
					disabled={isSelectingNext || itemsRemaining === 0}
				>
					{#if isSelectingNext}
						PROCESSING...
					{:else if itemsRemaining === 0}
						NO ITEMS TO PROCESS
					{:else}
						PROCESS NEXT ITEM
					{/if}
				</button>
				{#if nextMessage}
					<p class="text-sm text-center mt-1 {nextItemStatus.success ? 'text-green-400' : 'text-red-400'}">{nextMessage}</p>
				{/if}
			</div>

			<div>
				<button
					class="w-full btn btn-red font-mono"
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
					<p class="text-sm text-center mt-1 {resetStatus.success ? 'text-green-400' : 'text-red-400'}">{resetMessage}</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.numeric {
		font-family: 'Space Mono', monospace;
		font-weight: 500;
	}
</style>