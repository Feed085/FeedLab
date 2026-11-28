import type { ApiResponse } from '../utils/api-client.ts';
import type { UserSession } from '../utils/user-session.ts';

/**
 * Checks whether an error is caused by the backend server being offline or unreachable.
 */
export function isOfflineError(err: any): boolean {
  if (!err) return false;
  if (err.cause?.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED') return true;
  if (err.cause?.code === 'ENOTFOUND' || err.code === 'ENOTFOUND') return true;
  if (err.cause?.code === 'ECONNRESET' || err.code === 'ECONNRESET') return true;
  if (err.cause?.code === 'UND_ERR_CONNECT_TIMEOUT') return true;
  if (typeof err.message === 'string') {
    if (
      err.message.includes('fetch failed') ||
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('connect ECONNREFUSED') ||
      err.message.includes('timed out')
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Executes an HTTP request via ApiClient safely.
 * Returns the ApiResponse when online, or null if the backend is offline.
 */
export async function safeRequest<T = any>(
  reqFn: () => Promise<ApiResponse<T>>
): Promise<ApiResponse<T> | null> {
  try {
    return await reqFn();
  } catch (err: any) {
    if (isOfflineError(err)) {
      return null;
    }
    throw err;
  }
}

/**
 * Executes a user session factory safely.
 * Returns the UserSession when online, or null if the backend is offline.
 */
export async function safeSession(
  sessionFn: () => Promise<UserSession>
): Promise<UserSession | null> {
  try {
    return await sessionFn();
  } catch (err: any) {
    if (isOfflineError(err)) {
      return null;
    }
    throw err;
  }
}
