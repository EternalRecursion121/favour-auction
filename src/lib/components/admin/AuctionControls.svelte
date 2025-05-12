<script lang="ts">
	export let itemsRemaining = 0;

	let isResetting = false;
	let resetStatus = { success: false, message: '' };
	let resetMessage = '';

	let isSelectingNext = false;
	let nextItemStatus = { success: false, message: '' };
	let nextMessage = '';

	async function handleResetAuction() {
		try {
			isResetting = true;
			resetMessage = '';

			const response = await fetch('/api/admin/reset', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			resetStatus = await response.json();

			if (resetStatus.success) {
				resetMessage = 'Auction reset successfully!';
				// Refresh item count or other data as needed
				setTimeout(() => {
					window.location.reload(); // Refresh the page to update all components
				}, 1500);
			} else {
				resetMessage = resetStatus.message || 'Failed to reset auction';
			}
		} catch (error) {
			console.error('Error resetting auction:', error);
			resetMessage = 'Error connecting to server';
			resetStatus.success = false;
		} finally {
			isResetting = false;
		}
	}

	async function handleNextItem() {
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
				nextMessage = 'Next item selected!';

				// Update the items remaining count
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
</script>

<div class="card">
	<div class="card-header">
		<h2 class="text-xl font-bold" style="color: var(--accent-blue);">Auction Controls</h2>
	</div>

	<div class="card-content">
		<div class="flex items-center justify-between mb-4">
			<span style="color: var(--text-secondary);">Items Remaining:</span>
			<span class="font-medium text-lg numeric">{itemsRemaining}</span>
		</div>

		<div class="space-y-3">
			<div>
				<button
					class="w-full btn btn-blue font-mono"
					on:click={handleNextItem}
					disabled={isSelectingNext}
				>
					{#if isSelectingNext}
						SELECTING...
					{:else}
						NEXT ITEM
					{/if}
				</button>

				{#if nextMessage}
					<div class="mt-2 p-2 rounded text-sm text-center"
						 style={`background-color: ${nextItemStatus.success ? 'var(--accent-green)' : 'var(--accent-red)'}`}>
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
						 style={`background-color: ${resetStatus.success ? 'var(--accent-green)' : 'var(--accent-red)'}`}>
						{resetMessage}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>