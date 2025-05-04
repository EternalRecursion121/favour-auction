import { ADMIN_PASSWORD } from '$env/static/private';
import type { Actions } from '@sveltejs/kit';

export const actions = {
	validatePassword: async ({ request }) => {
		const data = await request.formData();
		const password = data.get('password');

		if (password === ADMIN_PASSWORD) {
			return { success: true };
		}

		return { success: false, message: 'Invalid password' };
	}
} satisfies Actions;