import type { RequestEvent } from '@sveltejs/kit';
import { ZodError } from 'zod';

export type ApiError = {
  error: true;
  message: string;
  code: string;
  details?: Record<string, unknown>;
};

export const errorCodes = {
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  AUCTION_ENDED: 'AUCTION_ENDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export function createError(
  code: keyof typeof errorCodes, 
  message: string, 
  details?: Record<string, unknown>
): ApiError {
  return {
    error: true,
    message,
    code: errorCodes[code],
    details,
  };
}

export function handleZodError(error: ZodError): ApiError {
  return {
    error: true,
    message: 'Validation error: Invalid input data',
    code: errorCodes.INVALID_INPUT,
    details: error.format(),
  };
}

// Simplified event type with just the properties we need
export type SimpleRequestEvent = {
  request: Request;
  cookies: {
    get: (key: string) => string | undefined;
    set: (key: string, value: string, options?: any) => void;
    delete: (key: string, options?: any) => void;
  };
  params?: Record<string, string>;
  url?: URL;
  fetch: typeof fetch;
  getClientAddress: () => string;
  locals: App.Locals;
  platform: App.Platform;
};

// A utility function to handle errors in API routes
export async function apiHandler<T>(
  event: Partial<SimpleRequestEvent> | RequestEvent,
  handler: () => Promise<T>,
  options: {
    authRequired?: boolean;
    adminRequired?: boolean;
  } = {}
): Promise<Response> {
  try {
    // Admin auth check if required
    if (options.adminRequired) {
      const isAdmin = event.cookies?.get('admin_authenticated') === 'true';
      if (!isAdmin) {
        return new Response(
          JSON.stringify(createError('UNAUTHORIZED', 'Admin authentication required')),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Run the handler
    const result = await handler();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('API Error:', err);

    if (err instanceof ZodError) {
      return new Response(
        JSON.stringify(handleZodError(err)),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle custom API errors
    if (err && typeof err === 'object' && 'error' in err && err.error === true) {
      const apiError = err as ApiError;
      
      const statusMap: Record<string, number> = {
        [errorCodes.INVALID_INPUT]: 400,
        [errorCodes.UNAUTHORIZED]: 401,
        [errorCodes.FORBIDDEN]: 403,
        [errorCodes.NOT_FOUND]: 404,
        [errorCodes.INSUFFICIENT_BALANCE]: 403,
        [errorCodes.AUCTION_ENDED]: 400,
        [errorCodes.INTERNAL_ERROR]: 500,
      };
      
      const status = statusMap[apiError.code] || 500;
      
      return new Response(
        JSON.stringify(apiError),
        { status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generic error fallback
    return new Response(
      JSON.stringify(createError('INTERNAL_ERROR', 'An unexpected error occurred')),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}