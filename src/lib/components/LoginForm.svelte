<script lang="ts">
    export let userName: string;
    export let onLogin: () => void;

    let isLoggingIn = false;
    let loginError = '';

    async function handleLogin() {
        if (!userName || userName.trim().length < 2) {
            loginError = 'Please enter a name with at least 2 characters';
            return;
        }

        try {
            isLoggingIn = true;
            loginError = '';
            await onLogin();
        } catch (error) {
            console.error('Login error:', error);
            loginError = 'Failed to login. Please try again.';
        } finally {
            isLoggingIn = false;
        }
    }
</script>

<div class="card max-w-md mx-auto mt-10">
    <div class="card-header">
        <h2 class="text-xl font-bold" style="color: var(--accent-blue);">
            Enter Your Name
        </h2>
    </div>
    <div class="card-content">
        <form on:submit|preventDefault={handleLogin} class="space-y-4">
            <div>
                <label for="userName" class="block text-sm font-medium mb-1">Name</label>
                <input
                    type="text"
                    id="userName"
                    bind:value={userName}
                    class="w-full p-2"
                    placeholder="Your name"
                    required
                    minlength="2"
                    disabled={isLoggingIn}
                />
            </div>
            <button
                type="submit"
                class="w-full py-2 px-4 btn btn-blue font-mono"
                disabled={isLoggingIn}
            >
                {#if isLoggingIn}
                    LOGGING IN...
                {:else}
                    ENTER AUCTION
                {/if}
            </button>

            {#if loginError}
                <div class="mt-2 p-2 rounded text-sm text-center" style="background-color: var(--accent-red); color: white;">
                    {loginError}
                </div>
            {/if}
        </form>
    </div>
</div> 