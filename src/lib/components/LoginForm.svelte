<script lang="ts">
    export let userName: string;
    export let onLogin: () => void;
</script>

<div class="card max-w-md mx-auto mt-10">
    <div class="card-header">
        <h2 class="text-xl font-bold" style="color: var(--accent-blue);">
            Enter Your Name
        </h2>
    </div>
    <div class="card-content">
        <form on:submit|preventDefault={onLogin} class="space-y-4">
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