import { vi } from 'vitest';

// Create a request object for testing
export function createRequest(body: unknown, headers = {}) {
  return {
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(headers),
    formData: vi.fn().mockResolvedValue(new FormData())
  };
}

// Create cookies object for testing
export function createCookies(data: Record<string, string> = {}) {
  const store: Record<string, string> = { ...data };
  
  return {
    get: vi.fn((key: string) => store[key]),
    set: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    delete: vi.fn((key: string) => {
      delete store[key];
    })
  };
}

// Create a params object for testing
export function createParams(params: Record<string, string> = {}) {
  return params;
}

// Create a mock RequestEvent for testing
export function createRequestEvent({
  request = createRequest({}),
  cookies = createCookies(),
  params = {}
} = {}) {
  return {
    request,
    cookies,
    params: createParams(params),
    url: new URL('http://localhost')
  };
}