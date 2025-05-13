<script lang="ts">
	import PriceChart from '$lib/components/shared/PriceChart.svelte';
	import type { ChartDataPoint } from '$lib/types';
	
	export let data: ChartDataPoint[] = []; 
	export let title = 'Price History';
</script>

<PriceChart {data} {title} isAdmin={false} />