<script lang="ts">
	import { onMount } from 'svelte';
	import PriceChart from '$lib/components/PriceChart.svelte';
	import type { 
		User, 
		BalanceHistoryEntry, 
		Item, 
		Auction, 
		AuctionConfig, 
		AuctionType,
		ChartDataPoint,
		Bid
	} from '$lib/types';

	// User state
	let user: User = { id: 0, name: '', balance: 0, itemsSold: 0, itemsBought: 0 };
	let userName = '';
	let authenticated = false;
	let balanceHistory: BalanceHistoryEntry[] = [];

	// Item creation
	let newItemTitle = '';
	let newItemDescription = '';
	let showAddItemForm = false;

	// Auction state
	let currentAuction: Auction | null = null;
	let bidAmount = 0;
	let remainingItems = 0;
	let userItems = 0;
	let priceHistory: ChartDataPoint[] = [];
	let auctionConfig: AuctionConfig | null = null;
	let bidMessage = '';
	let bidStatus: 'success' | 'error' | '' = '';

	// Charts & UI
	let showBalanceHistory = false;

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
	async function addItem() {
		if (!newItemTitle || !newItemDescription) return;

		try {
			const response = await fetch('/api/items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: newItemTitle,
					description: newItemDescription,
					sellerId: user.id
				})
			});

			if (response.ok) {
				newItemTitle = '';
				newItemDescription = '';
				showAddItemForm = false;
				await fetchUserData();
			} else {
				const error = await response.json();
				console.error('Add item error:', error);
			}
		} catch (error) {
			console.error('Add item failed:', error);
		}
	}

	// Place a bid
	async function placeBid() {
		if (!currentAuction || !bidAmount || !currentAuction.item) return;

		try {
			const response = await fetch('/api/auctions/bid', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					userId: user.id,
					itemId: currentAuction.item.id,
					amount: bidAmount
				})
			});

			const result = await response.json();
			
			if (response.ok) {
				bidMessage = result.message;
				bidStatus = 'success';
				user.balance = result.newBalance;
				await fetchCurrentAuction();
			} else {
				bidMessage = result.message || 'Bid failed';
				bidStatus = 'error';
			}

			// Clear message after 3 seconds
			setTimeout(() => {
				bidMessage = '';
				bidStatus = '';
			}, 3000);
		} catch (error) {
			console.error('Bid failed:', error);
			bidMessage = 'Bid failed. Please try again.';
			bidStatus = 'error';
		}
	}

	// Format auction type for display
	function formatAuctionType(type: AuctionType | string | null): string {
		if (!type) return '';
		
		const types: Record<string, string> = {
			'english': 'English Auction (ascending)',
			'dutch': 'Dutch Auction (descending)',
			'firstprice': 'First Price Sealed Bid',
			'vikrey': 'Vikrey Auction (second price)',
			'chinese': 'Chinese Auction',
			'penny': 'Penny Auction'
		};
		
		return types[type] || String(type);
	}

	// Calculate time remaining in human-readable format
	function formatTimeRemaining(seconds: number | null | undefined): string {
		if (seconds === null || seconds === undefined) return 'Unknown';
		if (seconds <= 0) return 'Ended';
		
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		
		if (minutes > 0) {
			return `${minutes}m ${remainingSeconds}s`;
		}
		return `${remainingSeconds}s`;
	}
</script>

<div class="min-h-screen" style="background-color: var(--bg-primary);">
	<header style="background-color: var(--bg-secondary);" class="p-4 shadow-md">
		<div class="container mx-auto flex justify-between items-center">
			<h1 class="text-2xl font-bold" style="color: var(--accent-blue);">
				Favour Auction
			</h1>
			{#if authenticated}
				<div class="flex items-center gap-4">
					<div class="px-3 py-1 rounded" style="background-color: var(--bg-tertiary);">
						<span>{user.name}</span>
					</div>
					<div class="badge badge-purple">
						<span class="numeric">{user.balance}</span> points
					</div>
				</div>
			{/if}
		</div>
	</header>

	<main class="container mx-auto p-4">
		{#if !authenticated}
			<!-- Login Form -->
			<div class="card max-w-md mx-auto mt-10">
				<div class="card-header">
					<h2 class="text-xl font-bold" style="color: var(--accent-blue);">
						Enter Your Name
					</h2>
				</div>
				<div class="card-content">
					<form on:submit|preventDefault={loginUser} class="space-y-4">
						<div>
							<label for="userName" class="block text-sm font-medium mb-1">Name</label>
							<input 
								type="text" 
								id="userName" 
								bind:value={userName} 
								class="w-full p-2"
								placeholder="Your name"
								required
							/>
						</div>
						<button 
							type="submit" 
							class="w-full py-2 px-4 btn btn-blue font-mono"
						>
							ENTER AUCTION
						</button>
					</form>
				</div>
			</div>
		{:else}
			<!-- User Dashboard -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
				<!-- Left Column: User Stats & Add Item -->
				<div class="space-y-6">
					<div class="card">
						<div class="card-header">
							<h2 class="text-lg font-bold" style="color: var(--accent-teal);">
								Your Stats
							</h2>
						</div>
						<div class="card-content">
							<div class="space-y-2">
								<p>Balance: <span class="font-bold numeric">{user.balance}</span> points</p>
								<p>Items Bought: <span class="font-bold numeric">{user.itemsBought || 0}</span></p>
								<p>Items Sold: <span class="font-bold numeric">{user.itemsSold || 0}</span></p>
								<p>Your Items Remaining: <span class="font-bold numeric">{userItems}</span></p>
								<p>Total Items Remaining: <span class="font-bold numeric">{remainingItems}</span></p>
							</div>
							
							<div class="mt-4">
								<button 
									on:click={() => showBalanceHistory = !showBalanceHistory}
									class="text-sm font-mono"
									style="color: var(--accent-purple);"
								>
									{showBalanceHistory ? '[ - ]' : '[ + ]'} Balance History
								</button>
								
								{#if showBalanceHistory && balanceHistory.length > 0}
									<div class="mt-2 max-h-40 overflow-y-auto">
										<table class="w-full text-sm">
											<thead class="text-xs" style="color: var(--text-secondary);">
												<tr>
													<th class="text-left py-1">Date</th>
													<th class="text-right py-1">Balance</th>
													<th class="text-right py-1">Reason</th>
												</tr>
											</thead>
											<tbody>
												{#each balanceHistory as entry}
													<tr class="border-t border-gray-700">
														<td class="py-1">{new Date(entry.timestamp).toLocaleDateString()}</td>
														<td class="text-right py-1 numeric">{entry.balance}</td>
														<td class="text-right py-1 capitalize">{entry.reason}</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								{:else if showBalanceHistory}
									<p class="text-sm mt-2" style="color: var(--text-secondary);">
										No balance history yet.
									</p>
								{/if}
							</div>
						</div>
					</div>
					
					{#if !showAddItemForm}
						<button 
							on:click={() => showAddItemForm = true}
							class="w-full py-2 px-4 btn btn-green font-mono"
							disabled={auctionConfig && !auctionConfig.allowNewItems}
						>
							ADD NEW ITEM
						</button>
						{#if auctionConfig && !auctionConfig.allowNewItems}
							<p class="text-xs mt-1 font-mono" style="color: var(--accent-red);">
								Adding new items is currently disabled by the admin.
							</p>
						{/if}
					{:else}
						<div class="card">
							<div class="card-header">
								<h2 class="text-lg font-bold" style="color: var(--accent-green);">
									Add New Item
								</h2>
							</div>
							<div class="card-content">
								<form on:submit|preventDefault={addItem} class="space-y-4">
									<div>
										<label for="itemTitle" class="block text-sm font-medium mb-1">
											Title
										</label>
										<input 
											type="text" 
											id="itemTitle" 
											bind:value={newItemTitle} 
											class="w-full p-2"
											placeholder="Item title"
											required
										/>
									</div>
									<div>
										<label for="itemDescription" class="block text-sm font-medium mb-1">
											Description
										</label>
										<textarea 
											id="itemDescription" 
											bind:value={newItemDescription} 
											class="w-full p-2 h-24"
											placeholder="Describe the favour you're offering..."
											required
										></textarea>
									</div>
									<div class="flex gap-2">
										<button 
											type="submit" 
											class="flex-1 py-2 px-4 btn btn-green font-mono"
										>
											SUBMIT
										</button>
										<button 
											type="button" 
											on:click={() => {
												showAddItemForm = false;
												newItemTitle = '';
												newItemDescription = '';
											}}
											class="py-2 px-4 font-mono"
											style="background-color: var(--bg-tertiary);"
										>
											CANCEL
										</button>
									</div>
								</form>
							</div>
						</div>
					{/if}
				</div>
				
				<!-- Middle Column: Current Auction -->
				<div class="lg:col-span-2 space-y-6">
					{#if currentAuction && currentAuction.active}
						<div class="card">
							<div class="card-header flex justify-between items-center">
								<h2 class="text-lg font-bold" style="color: var(--accent-blue);">
									Current Auction
								</h2>
								<div class="flex items-center gap-2">
									<span class="badge badge-blue font-mono text-xs">
										{currentAuction.auctionType}
									</span>
									<span class="text-xs font-mono" style="color: var(--text-secondary);">
										{formatTimeRemaining(currentAuction.timeRemaining)}
									</span>
								</div>
							</div>
							<div class="card-content">
								<div class="p-4 mb-4 rounded" style="background-color: var(--bg-tertiary);">
									{#if currentAuction.item}
										<h3 class="text-lg font-bold">{currentAuction.item.title}</h3>
										<p class="text-sm mb-2" style="color: var(--text-secondary);">Offered by {currentAuction.item.seller.name}</p>
										<p class="text-sm">{currentAuction.item.description}</p>
									{:else}
										<p class="text-sm" style="color: var(--text-secondary);">No item information available</p>
									{/if}
								</div>
								
								<div class="mb-4 flex justify-between">
									<div>
										<p class="text-sm font-medium mb-1">Current Price:</p>
										<p class="text-xl font-bold font-mono" style="color: var(--accent-orange);">{currentAuction.currentPrice} points</p>
									</div>
									
									{#if currentAuction.winningBidder && currentAuction.auctionType !== 'firstprice' && currentAuction.auctionType !== 'vikrey'}
										<div>
											<p class="text-sm font-medium mb-1">Current Winner:</p>
											<p class="text-lg font-bold" style="color: var(--accent-purple);">
												{currentAuction.winningBidder.id === user.id ? 'You' : currentAuction.winningBidder.name}
											</p>
										</div>
									{/if}
								</div>
								
								<!-- Bidding UI -->
								<div class="mt-6">
									<h3 class="text-lg font-bold mb-2" style="color: var(--accent-purple);">
										Place Your Bid
									</h3>
									
									<div class="text-sm mb-2 font-mono" style="color: var(--text-secondary);">
										{#if currentAuction.auctionType === 'english'}
											<p>Minimum bid: <span class="numeric">{currentAuction.currentPrice + 1}</span> points</p>
										{:else if currentAuction.auctionType === 'dutch'}
											<p>Current offer: <span class="numeric">{currentAuction.currentPrice}</span> points (automatically decreasing)</p>
										{:else if ['firstprice', 'vikrey'].includes(currentAuction.auctionType)}
											<p>Enter your sealed bid amount:</p>
										{:else if currentAuction.auctionType === 'penny'}
											<p>Current price: <span class="numeric">{currentAuction.currentPrice}</span> points (increases by <span class="numeric">{auctionConfig?.pennyAuctionConfig?.incrementAmount || 1}</span> when you bid)</p>
										{/if}
									</div>
									
									<form on:submit|preventDefault={placeBid} class="flex gap-2">
										<input 
											type="number" 
											bind:value={bidAmount} 
											min={currentAuction.auctionType === 'english' ? currentAuction.currentPrice + 1 : 1}
											class="flex-1 p-2 numeric"
											placeholder="Amount" 
										/>
										<button 
											type="submit" 
											class="py-2 px-6 btn btn-purple font-mono"
											disabled={!bidAmount || user.balance < bidAmount}
										>
											BID
										</button>
									</form>
									
									{#if bidMessage}
										<div class="mt-2 p-2 rounded text-sm" style={`background-color: ${bidStatus === 'success' ? 'var(--accent-green)' : 'var(--accent-red)'}`}>
											{bidMessage}
										</div>
									{/if}
									
									{#if user.balance < bidAmount}
										<p class="text-xs mt-1 font-mono" style="color: var(--accent-red);">
											You don't have enough points for this bid.
										</p>
									{/if}
								</div>
								
								<!-- Price History Chart -->
								{#if priceHistory.length > 0 && ['english', 'dutch', 'penny'].includes(currentAuction.auctionType)}
									<div class="mt-6">
										<h3 class="text-lg font-bold mb-2" style="color: var(--accent-teal);">
											Price History
										</h3>
										<PriceChart data={priceHistory} />
									</div>
								{/if}
								
								<!-- Bid History -->
								{#if currentAuction.bids && currentAuction.bids.length > 0 && !['firstprice', 'vikrey'].includes(currentAuction.auctionType)}
									<div class="mt-6">
										<h3 class="text-lg font-bold mb-2" style="color: var(--accent-orange);">
											Bid History
										</h3>
										<div class="max-h-40 overflow-y-auto">
											<table class="w-full text-sm">
												<thead class="text-xs font-mono" style="color: var(--text-secondary);">
													<tr>
														<th class="text-left py-1">BIDDER</th>
														<th class="text-right py-1">AMOUNT</th>
														<th class="text-right py-1">TIME</th>
													</tr>
												</thead>
												<tbody>
													{#each currentAuction.bids as bid}
														<tr class="border-t border-gray-700">
															<td class="py-1" style="color: var(--accent-purple);">
																{bid.userId === user.id ? 'You' : bid.userName}
															</td>
															<td class="text-right py-1 numeric" style="color: var(--accent-orange);">{bid.amount}</td>
															<td class="text-right py-1 text-xs" style="color: var(--text-secondary);">
																{new Date(bid.timestamp).toLocaleTimeString()}
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										</div>
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<div class="card flex flex-col items-center justify-center p-10 min-h-60">
							<h2 class="text-xl font-bold mb-4" style="color: var(--accent-blue);">
								No Active Auction
							</h2>
							<p style="color: var(--text-secondary);">
								Waiting for the admin to start the next auction...
							</p>
							<div class="mt-4 font-mono">
								<span class="text-2xl font-mono blink" style="color: var(--accent-purple);">_</span>
							</div>
						</div>
					{/if}
					
					<!-- Auction Results (if any auction just ended) -->
					{#if currentAuction && !currentAuction.active && currentAuction.winningBidder}
						<div class="card">
							<div class="card-header">
								<h2 class="text-lg font-bold" style="color: var(--accent-green);">
									Auction Completed
								</h2>
							</div>
							<div class="card-content">
								{#if currentAuction.item && currentAuction.winningBidder}
									<div class="p-4 rounded mb-4" style="background-color: var(--bg-tertiary);">
										<h3 class="text-lg font-bold">{currentAuction.item.title}</h3>
										<p class="text-sm mb-4" style="color: var(--text-secondary);">Offered by {currentAuction.item.seller.name}</p>
										
										<div class="p-4 rounded" style="background-color: var(--accent-purple);">
											<p class="text-center">
												<span class="font-bold">{currentAuction.winningBidder.name}</span> 
												won with a bid of 
												<span class="font-bold font-mono">{currentAuction.currentPrice}</span> points
											</p>
										</div>
									</div>
									
									{#if currentAuction.winningBidder.id === user.id}
										<div class="p-3 rounded text-center" style="background-color: var(--accent-green);">
											<p class="font-bold">Congratulations! You won this item.</p>
										</div>
									{:else if currentAuction.item.seller.id === user.id}
										<div class="p-3 rounded text-center" style="background-color: var(--accent-green);">
											<p class="font-bold">Your item was sold for <span class="font-mono">{currentAuction.currentPrice}</span> points!</p>
										</div>
									{/if}
								{:else}
									<p class="p-4 text-center" style="color: var(--text-secondary);">
										Auction completed, but details are not available.
									</p>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</main>
</div>