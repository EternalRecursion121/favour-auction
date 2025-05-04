import { resetAuction } from '$lib/server/db';
import { apiHandler, createError } from '$lib/server/error';

export async function POST({ cookies }) {
  return apiHandler(
    { cookies },
    async () => {
      // Check admin auth
      const isAdmin = cookies.get('admin_authenticated') === 'true';
      if (!isAdmin) {
        throw createError('UNAUTHORIZED', 'Admin authentication required');
      }
      
      const success = await resetAuction();
      
      if (!success) {
        throw createError('INTERNAL_ERROR', 'Failed to reset auction');
      }
      
      return {
        success: true,
        message: 'Auction reset successfully'
      };
    },
    { adminRequired: true }
  );
}