import { ApiClient } from './api-client.ts';
import { config } from '../config.ts';

export type UserRole = 'USER' | 'AUTHOR' | 'MODERATOR' | 'ADMIN';

export interface UserProfile {
  _id?: string;
  id?: string;
  email: string;
  fullName: string;
  role: UserRole;
  isEmailVerified?: boolean;
  [key: string]: any;
}

export interface UserSession {
  client: ApiClient;
  user: UserProfile;
  token: string;
  refreshToken?: string;
  role: UserRole;
}

/**
 * Generates a collision-resistant test email ending with @feedlab.az.
 */
export function generateUniqueEmail(prefix: string = 'user'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}@feedlab.az`;
}

/**
 * Generates unique user registration credentials.
 */
export function generateUniqueUser(role: UserRole = 'USER', prefix?: string): {
  email: string;
  fullName: string;
  password: string;
  role: UserRole;
} {
  const p = prefix || role.toLowerCase();
  return {
    email: generateUniqueEmail(p),
    fullName: `Test ${role} ${Date.now()}`,
    password: 'Password123!',
    role,
  };
}

/**
 * Creates an unauthenticated session with an isolated ApiClient instance.
 */
export function createAnonymousSession(baseUrl?: string): { client: ApiClient } {
  return { client: new ApiClient(baseUrl) };
}

/**
 * Registers and logs in a new buyer user persona.
 */
export async function createBuyerSession(options: {
  email?: string;
  password?: string;
  fullName?: string;
  baseUrl?: string;
} = {}): Promise<UserSession> {
  const client = new ApiClient(options.baseUrl);
  const email = options.email || generateUniqueEmail('buyer');
  const password = options.password || 'Password123!';
  const fullName = options.fullName || `Alıcı ${Date.now()}`;

  const regRes = await client.post('/auth/register', {
    email,
    password,
    fullName,
  });

  let token = regRes.data?.accessToken || regRes.data?.token;
  let refreshToken = regRes.data?.refreshToken;
  let user: UserProfile = regRes.data?.user || {
    email,
    fullName,
    role: 'USER',
  };

  if (!token) {
    const loginRes = await client.post('/auth/login', {
      email,
      password,
    });
    token = loginRes.data?.accessToken || loginRes.data?.token;
    refreshToken = loginRes.data?.refreshToken;
    if (loginRes.data?.user) {
      user = loginRes.data.user;
    }
  }

  if (token) {
    client.setToken(token);
  }

  return {
    client,
    user,
    token: token || '',
    refreshToken,
    role: 'USER',
  };
}

/**
 * Creates an author user session.
 */
export async function createAuthorSession(options: {
  email?: string;
  password?: string;
  fullName?: string;
  baseUrl?: string;
} = {}): Promise<UserSession> {
  const client = new ApiClient(options.baseUrl);
  const email = options.email || generateUniqueEmail('author');
  const password = options.password || 'Password123!';
  const fullName = options.fullName || `Müəllif ${Date.now()}`;

  const regRes = await client.post('/auth/register', {
    email,
    password,
    fullName,
    role: 'AUTHOR',
  });

  let token = regRes.data?.accessToken || regRes.data?.token;
  let refreshToken = regRes.data?.refreshToken;
  let user: UserProfile = regRes.data?.user || {
    email,
    fullName,
    role: 'AUTHOR',
  };

  if (!token) {
    const loginRes = await client.post('/auth/login', {
      email,
      password,
    });
    token = loginRes.data?.accessToken || loginRes.data?.token;
    refreshToken = loginRes.data?.refreshToken;
    if (loginRes.data?.user) {
      user = loginRes.data.user;
    }
  }

  if (token) {
    client.setToken(token);
  }

  return {
    client,
    user,
    token: token || '',
    refreshToken,
    role: 'AUTHOR',
  };
}

/**
 * Creates an admin session using configured administrative credentials.
 */
export async function createAdminSession(options: {
  email?: string;
  password?: string;
  baseUrl?: string;
} = {}): Promise<UserSession> {
  const client = new ApiClient(options.baseUrl);
  const email = options.email || config.adminEmail;
  const password = options.password || config.adminPassword;

  const loginRes = await client.post('/auth/login', {
    email,
    password,
  });

  const token = loginRes.data?.accessToken || loginRes.data?.token || '';
  const refreshToken = loginRes.data?.refreshToken;
  const user: UserProfile = loginRes.data?.user || {
    email,
    fullName: 'Platform Admin',
    role: 'ADMIN',
  };

  if (token) {
    client.setToken(token);
  }

  return {
    client,
    user,
    token,
    refreshToken,
    role: 'ADMIN',
  };
}

/**
 * Genuine helper to checkout and confirm payment for a project.
 */
export async function buyAndPayProject(buyerSession: UserSession, projectId: string): Promise<string> {
  const checkout = await buyerSession.client.post('/orders/checkout', {
    projectId,
    paymentMethod: 'CARD',
  });
  const orderId = checkout.data?._id || checkout.data?.id;
  if (orderId) {
    await buyerSession.client.post('/payments/confirm', {
      orderId,
      status: 'SUCCESS',
      transactionId: `TXN-E2E-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    });
  }
  return orderId;
}
