import { ApiError, NETWORK_MESSAGE, OFFLINE_MESSAGE } from './errors';

export interface ClientConfig {
  baseUrl: string;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  onUnauthorized: () => void;
  lang: () => 'en' | 'km';
}

type QueryValue = string | number | boolean | string[] | undefined | null;

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  withLang?: boolean;
  /** A raw text body (e.g. CSV); set the content-type in `headers`. */
  text?: string;
  /** Read the response as text instead of JSON. */
  as?: 'json' | 'text';
}

let config: ClientConfig = {
  baseUrl: '',
  getToken: async () => null,
  onUnauthorized: () => {},
  lang: () => 'en',
};

export function configureApi(cfg: Partial<ClientConfig>): void {
  config = { ...config, ...cfg };
}

export function buildUrl(path: string, query?: Record<string, QueryValue>, lang?: 'en' | 'km'): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else params.append(key, String(value));
  }
  if (lang) params.set('lang', lang);
  const qs = params.toString();
  return `${config.baseUrl}${path}${qs ? `?${qs}` : ''}`;
}

async function send(url: string, opts: FetchOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { accept: 'application/json', ...opts.headers };
  if (opts.body !== undefined && !headers['content-type']) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    return await fetch(url, {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers,
      body: opts.text !== undefined ? opts.text : opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError('offline', 0, OFFLINE_MESSAGE);
  }
}

async function toError(res: Response): Promise<ApiError> {
  try {
    const json = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    if (json?.error?.code) {
      return new ApiError(json.error.code, res.status, json.error.message ?? NETWORK_MESSAGE, json.error.details);
    }
  } catch {
    // not JSON
  }
  return new ApiError('network', res.status, NETWORK_MESSAGE);
}

export async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.query, opts.withLang ? config.lang() : undefined);
  const token = await config.getToken();
  let res = await send(url, opts, token);

  if (res.status === 401 && token) {
    const fresh = await config.getToken(true).catch(() => null);
    if (fresh) res = await send(url, opts, fresh);
    if (res.status === 401) {
      const error = await toError(res);
      config.onUnauthorized();
      throw error;
    }
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (opts.as === 'text') return text as T;
  return (text ? JSON.parse(text) : undefined) as T;
}
