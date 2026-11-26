export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const NETWORK_MESSAGE = 'The shop is having trouble reaching the server. Try again.';
export const OFFLINE_MESSAGE = "You're offline, or the shop can't be reached. Check your connection and try again.";

export function isApiError(e: unknown, code?: string): e is ApiError {
  return e instanceof ApiError && (code === undefined || e.code === code);
}
