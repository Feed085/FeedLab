/**
 * Boundary Test Helper
 * Provides offline-resilient execution wrappers and error inspection.
 */

export function isNetworkOffline(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as any;
  const causeCode = e.cause?.code;
  const errorCode = e.code;
  const message = typeof e.message === 'string' ? e.message : '';

  return (
    causeCode === 'ECONNREFUSED' ||
    causeCode === 'ENOTFOUND' ||
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ENOTFOUND' ||
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('connect ECONNREFUSED') ||
    message.includes('UND_ERR_CONNECT_TIMEOUT')
  );
}

export async function withOfflineSkip<T>(
  t: { skip: (msg?: string) => void },
  fn: () => Promise<T>
): Promise<T | void> {
  try {
    return await fn();
  } catch (err: any) {
    if (isNetworkOffline(err)) {
      t.skip(`Backend offline (${err.message || 'connection failed'})`);
      return;
    }
    throw err;
  }
}
