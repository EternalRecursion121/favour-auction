// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	namespace svelteHTML {
		interface HTMLAttributes<T> {
			[key: string]: any;
		}
	}
}

// Add type definitions for environment variables
declare namespace App {
	interface Env {
		PUBLIC_SUPABASE_URL: string;
		PUBLIC_SUPABASE_ANON_KEY: string;
	}
}

// Add type definitions for $env/dynamic/public
declare module '$env/dynamic/public' {
	export const PUBLIC_SUPABASE_URL: string;
	export const PUBLIC_SUPABASE_ANON_KEY: string;
}

// Add type definitions for $env/static/private
declare module '$env/static/private' {
	export const SUPABASE_URL: string;
	export const SUPABASE_SERVICE_ROLE_KEY: string;
}

export {};
