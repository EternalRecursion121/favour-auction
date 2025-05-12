<script lang="ts">
	import AdminPanel from '$lib/components/admin/AdminPanel.svelte';
	import PasswordProtection from '$lib/components/admin/PasswordProtection.svelte';
	import { onMount } from 'svelte';

	let authenticated = false;
	let password = '';
	let checking = true;

	// First, call the API to check if admin is already authenticated via cookie
	async function checkAdminAuth() {
		try {
			const response = await fetch('/api/admin/auth', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const data = await response.json();
			authenticated = data.authenticated === true;
		} catch (error) {
			console.error('Error checking admin auth:', error);
		} finally {
			checking = false;
		}
	}

	onMount(() => {
		checkAdminAuth();
	});

	function handleAuthentication(result: boolean) {
		authenticated = result;
	}
</script>

{#if checking}
	<div class="flex justify-center items-center min-h-screen" style="background-color: var(--bg-primary);">
		<p>Checking authentication...</p>
	</div>
{:else if !authenticated}
	<PasswordProtection {password} onAuthenticate={handleAuthentication} />
{:else}
	<AdminPanel />
{/if}