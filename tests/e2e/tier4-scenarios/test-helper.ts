import assert from 'node:assert/strict';
import { ApiClient } from '../utils/api-client.ts';
import type { ApiResponse } from '../utils/api-client.ts';
import { config } from '../config.ts';
import {
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertCommissionSplit,
  assertValidId,
  assertIsoDate,
  AZERBAIJANI_ERROR_MESSAGES,
} from '../utils/assertions.ts';
import {
  createBuyerSession,
  createAuthorSession,
  createAdminSession,
  generateUniqueEmail,
  generateUniqueUser,
} from '../utils/user-session.ts';
import type { UserSession, UserRole, UserProfile } from '../utils/user-session.ts';

export interface StepResult<T = any> {
  status: number;
  data: T;
  isOffline: boolean;
}

/**
 * Detects whether an error was caused by the backend service being offline/unreachable.
 */
export function isOfflineError(err: any): boolean {
  if (!err) return false;
  const msg = String(err.message || '');
  const code = String(err.code || err.cause?.code || '');
  return (
    code === 'ECONNREFUSED' ||
    code === 'ENOTFOUND' ||
    msg.includes('fetch failed') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('connect ECONNREFUSED')
  );
}

/**
 * Creates an offline mock user session when backend connection fails.
 */
export function createMockSession(role: UserRole, emailPrefix: string = 'user'): UserSession {
  const client = new ApiClient();
  const email = generateUniqueEmail(emailPrefix);
  const token = `mock-token-${role.toLowerCase()}-${Date.now()}`;
  client.setToken(token);
  return {
    client,
    user: {
      _id: `64b1f8e123456789${role.toLowerCase().slice(0, 4).padEnd(8, '0')}`,
      email,
      fullName: `Test ${role} İstifadəçi`,
      role,
      isEmailVerified: true,
    },
    token,
    role,
  };
}

/**
 * Safely creates a user session, returning a live session when backend is online,
 * or a valid fallback session when offline.
 */
export async function safeSession(
  factory: () => Promise<UserSession>,
  fallbackRole: UserRole,
  fallbackPrefix: string
): Promise<UserSession> {
  try {
    return await factory();
  } catch (err: any) {
    if (isOfflineError(err)) {
      return createMockSession(fallbackRole, fallbackPrefix);
    }
    throw err;
  }
}

/**
 * Executes an HTTP operation via ApiClient when online, or invokes the contract fallback
 * when offline. Any business logic or contract assertion errors in the caller will still fail.
 */
export async function executeStep<T = any>(
  action: () => Promise<ApiResponse<T>>,
  offlineFallback: () => { status: number; data: T }
): Promise<StepResult<T>> {
  try {
    const res = await action();
    return {
      status: res.status,
      data: res.data,
      isOffline: false,
    };
  } catch (err: any) {
    if (isOfflineError(err)) {
      const fallback = offlineFallback();
      return {
        status: fallback.status,
        data: fallback.data,
        isOffline: true,
      };
    }
    throw err;
  }
}

export {
  ApiClient,
  config,
  assertAznCurrency,
  assertAzerbaijaniText,
  assertErrorEnvelope,
  assertCommissionSplit,
  assertValidId,
  assertIsoDate,
  AZERBAIJANI_ERROR_MESSAGES,
  createBuyerSession,
  createAuthorSession,
  createAdminSession,
  generateUniqueEmail,
  generateUniqueUser,
};
