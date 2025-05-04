<script lang="ts">
	import AdminPanel from '$lib/components/admin/AdminPanel.svelte';
	import PasswordProtection from '$lib/components/admin/PasswordProtection.svelte';

	let authenticated = false;
	let password = '';

	function handleAuthentication(result: boolean) {
		authenticated = result;
	}
</script>

{#if !authenticated}
	<PasswordProtection {password} onAuthenticate={handleAuthentication} />
{:else}
	<AdminPanel />
{/if}