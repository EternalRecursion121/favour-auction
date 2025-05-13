<script lang="ts">
	import { onMount } from 'svelte';
	import type { ChartDataPoint } from '$lib/types';
	
	export let data: ChartDataPoint[] = []; 
	export let title = 'Price History';
	export let isAdmin = false;
	export let height = '16rem';
	export let showGridLines = true;
	export let showAxisLabels = true;
	export let primaryColor = 'var(--accent-blue)';
	export let secondaryColor = 'var(--accent-teal)';
	export let highlightColor = 'var(--accent-orange)';
	
	let chartContainer: HTMLElement;
	
	interface ProcessedChartPoint {
		x: number; // Represents % across chart width
		y: number; // Represents % from chart top
		timestamp: string | Date | null; // For tooltips or labels
		value: number; // The original value for tooltips or labels
	}
	
	let chartData: ProcessedChartPoint[] = [];
	let maxPrice = 0;
	let minPrice = 0;

	function formatData(points: ChartDataPoint[]): ProcessedChartPoint[] {
		return points.map(point => {
			const timestamp = point.time || point.timestamp || point.x; // Support multiple property names
			const value = point.value || point.price || point.y || 0; // Support multiple property names
			
			const timestampNum = typeof timestamp === 'string' 
				? new Date(timestamp).getTime()
				: timestamp instanceof Date 
					? timestamp.getTime()
					: typeof timestamp === 'number' ? timestamp : 0;
			
			return {
				x: timestampNum, // Will be sequence percentage later
				y: 0, // Will be price percentage later
				timestamp: timestamp instanceof Date ? timestamp : 
						  typeof timestamp === 'string' ? new Date(timestamp) : 
						  typeof timestamp === 'number' ? new Date(timestamp) : null,
				value: value
			};
		}).sort((a, b) => a.x - b.x); // Sort by timestamp (numeric x)
	}
	
	$: {
		if (data?.length) {
			let processedPoints = formatData(data);
			
			if (processedPoints.length > 0) {
				maxPrice = Math.max(...processedPoints.map(p => p.value));
				minPrice = Math.min(...processedPoints.map(p => p.value));
				
				const range = maxPrice - minPrice;
				const paddedMax = range === 0 ? maxPrice + 1 : maxPrice + (range * 0.1); // Avoid division by zero if all values are same, add 10% padding
                const effectiveMin = range === 0 ? minPrice - 1 : minPrice;

				chartData = processedPoints.map((point, index) => {
					return {
						...point,
						x: (index / (processedPoints.length - 1 || 1)) * 100,
						y: effectiveMin === paddedMax 
							? 50 
							: 100 - ((point.value - effectiveMin) / (paddedMax - effectiveMin) * 100)
					};
				});
			} else {
                chartData = [];
            }
		} else {
			chartData = [];
		}
	}
	
	function getLinePath() {
		if (chartData.length === 0) return '';
		if (chartData.length === 1) {
			const y = chartData[0].y;
			return `M0,${y} L100,${y}`;
		}
		
		return chartData
			.map((point, i) => {
				return i === 0 
					? `M${point.x},${point.y}`
					: `L${point.x},${point.y}`;
			})
			.join(' ');
	}
	
	function formatTimeForDisplay(timestamp: string | Date | null): string {
		if (!timestamp) return '';
		const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	onMount(() => {
		// Initialize with sample data if none provided
		if (data.length === 0) {
			const now = new Date();
			data = [
				{ time: now.getTime() - 400000, value: 10 },
				{ time: now.getTime() - 300000, value: 15 },
				{ time: now.getTime() - 200000, value: 25 },
				{ time: now.getTime() - 100000, value: 30 },
				{ time: now.getTime(), value: 40 }
			];
		}
	});
</script>

<div class={`price-chart-wrapper ${isAdmin ? 'chart-card' : 'bg-bg-tertiary p-4 rounded-lg shadow'}`} style:height={height}>
	{#if !isAdmin && title}
		<h3 class="text-md font-semibold mb-3 text-text-secondary tracking-wider uppercase">{title}</h3>
	{/if}
	<div class="chart-container relative w-full h-full" bind:this={chartContainer}>
		{#if chartData.length > 0}
			<svg class="absolute inset-0 w-full h-full {isAdmin ? 'p-4' : 'overflow-visible'}">
				{#if showAxisLabels}
					<text x={isAdmin ? "10" : "0"} y={isAdmin ? "15" : "12"} class={isAdmin ? "chart-label numeric" : "numeric text-xs fill-current text-text-tertiary"}>
						{maxPrice}
					</text>
					{#if maxPrice !== minPrice}
						<text x={isAdmin ? "10" : "0"} y={isAdmin ? "95%" : "98%"} class={isAdmin ? "chart-label numeric" : "numeric text-xs fill-current text-text-tertiary"}>
							{minPrice}
						</text>
					{/if}
				{/if}
				
				{#if showGridLines}
					<line 
						x1={isAdmin ? "0" : "20"} 
						y1="25%" 
						x2="100%" 
						y2="25%" 
						class={isAdmin ? "" : "stroke-current text-bg-primary opacity-50"}
						stroke={isAdmin ? "rgba(255,255,255,0.05)" : undefined}
						stroke-dasharray={isAdmin ? "3" : "2,3"} 
					/>
					<line 
						x1={isAdmin ? "0" : "20"} 
						y1="50%" 
						x2="100%" 
						y2="50%" 
						class={isAdmin ? "" : "stroke-current text-bg-primary opacity-75"}
						stroke={isAdmin ? "rgba(255,255,255,0.08)" : undefined}
						stroke-dasharray={isAdmin ? "3" : "2,3"} 
					/>
					<line 
						x1={isAdmin ? "0" : "20"} 
						y1="75%" 
						x2="100%" 
						y2="75%" 
						class={isAdmin ? "" : "stroke-current text-bg-primary opacity-50"}
						stroke={isAdmin ? "rgba(255,255,255,0.05)" : undefined}
						stroke-dasharray={isAdmin ? "3" : "2,3"} 
					/>
				{/if}
				
				<path 
					d={getLinePath()} 
					fill="none" 
					stroke={primaryColor}
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					vector-effect="non-scaling-stroke"
				/>
				
				{#each chartData as point, i}
					{#if i === 0 || i === chartData.length - 1 || (i > 0 && Math.abs(point.value - chartData[i-1].value) > (maxPrice - minPrice) * 0.2)}
						<circle 
							cx={`${point.x}%`} 
							cy={`${point.y}%`} 
							r="3.5"
							fill={secondaryColor}
							stroke="var(--bg-tertiary)"
							stroke-width="1.5"
						>
							<title>{formatTimeForDisplay(point.timestamp)}: {point.value} points</title>
						</circle>
					{/if}
				{/each}
				
				{#if chartData.length > 0}
					<circle 
						cx={`${chartData[chartData.length-1].x}%`} 
						cy={`${chartData[chartData.length-1].y}%`} 
						r={isAdmin ? "5" : "4.5"}
						fill={highlightColor}
						stroke={isAdmin ? "var(--bg-tertiary)" : "var(--bg-secondary)"}
						stroke-width={isAdmin ? "2" : "2"}
					>
						<title>Current: {chartData[chartData.length-1].value} points</title>
					</circle>
				{/if}
			</svg>
		{:else}
			<div class={isAdmin ? "flex items-center justify-center h-full" : ""}>
				<p class={isAdmin ? "text-sm font-mono" : "text-sm text-center py-10 text-text-secondary"} style={isAdmin ? "color: var(--text-secondary);" : ""}>
					No price data available
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Common styles */
	.numeric {
		font-variant-numeric: tabular-nums;
	}
	svg {
		shape-rendering: geometricPrecision;
	}
	
	/* Admin-specific styles */
	.chart-card {
		width: 100%;
		background-color: var(--bg-tertiary);
		border-radius: 6px;
		overflow: hidden;
	}
	
	.chart-container {
		position: relative;
	}
	
	.chart-label {
		fill: var(--text-secondary);
		font-size: 11px;
		font-family: 'JetBrains Mono', monospace;
	}
</style>