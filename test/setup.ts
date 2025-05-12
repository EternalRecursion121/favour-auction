import { vi } from 'vitest';
import type { VercelPoolClient } from '@vercel/postgres';
import type { RequestEvent } from '@sveltejs/kit';
import type { App } from '$lib/types';

// Mock DB client
export const mockDbClient = {
  query: vi.fn().mockResolvedValue({ rows: [] }),
  connect: vi.fn().mockResolvedValue({
    query: vi.fn().mockResolvedValue({ rows: [] }),
    release: vi.fn()
  }),
  release: vi.fn()
} as unknown as VercelPoolClient;

// Mock request event creator
export function createRequestEvent<T extends Record<string, string> = {}>({
  request = {} as Request,
  cookies = {} as any,
  params = {} as T,
  url = new URL('http://localhost'),
  locals = {} as App.Locals,
  platform = undefined,
  route = { id: '' },
  setHeaders = vi.fn(),
  isDataRequest = false,
  isSubRequest = false,
  getClientAddress = vi.fn(() => '127.0.0.1'),
  fetch = vi.fn(),
} = {}): RequestEvent<T, string> {
  return {
    request,
    cookies,
    params,
    url,
    locals,
    platform,
    route,
    setHeaders,
    isDataRequest,
    isSubRequest,
    getClientAddress,
    fetch,
  } as unknown as RequestEvent<T, string>;
}

// Mock cookies creator
export function createCookies(cookies: Record<string, string> = {}) {
  return {
    get: vi.fn((name: string) => cookies[name]),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => Object.entries(cookies).map(([name, value]) => ({ name, value }))),
    serialize: vi.fn((name: string, value: string) => `${name}=${value}`)
  };
}

// Mock request creator
export function createRequest(data: any = {}) {
  return {
    json: vi.fn().mockResolvedValue(data),
    headers: new Headers(),
    formData: vi.fn(),
    signal: new AbortController().signal,
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    text: vi.fn(),
    body: null,
    bodyUsed: false,
    cache: 'default',
    credentials: 'omit',
    destination: '',
    integrity: '',
    method: 'GET',
    mode: 'cors',
    redirect: 'follow',
    referrer: '',
    referrerPolicy: 'no-referrer',
    url: 'http://localhost',
    keepalive: false,
    bytes: 0
  } as unknown as Request;
} 