import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface JwtSignOptions {
  secret?: string;
  expiresIn?: string | number;
}

export interface JwtVerifyOptions {
  secret?: string;
}

function parseExpiresIn(expiresIn?: string | number): number {
  if (typeof expiresIn === 'number') {
    return expiresIn;
  }
  if (!expiresIn) {
    return 15 * 60; // 15 minutes default
  }
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    const num = parseInt(expiresIn, 10);
    return isNaN(num) ? 15 * 60 : num;
  }
  const val = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return val;
    case 'm':
      return val * 60;
    case 'h':
      return val * 3600;
    case 'd':
      return val * 86400;
    default:
      return val * 60;
  }
}

@Injectable()
export class JwtService {
  private readonly defaultSecret: string;
  private readonly defaultExpiresIn: string;

  constructor(private configService: ConfigService) {
    this.defaultSecret =
      this.configService.get<string>('jwt.secret') ||
      'feedlab_dev_jwt_secret_key_min_32_characters_long';
    this.defaultExpiresIn = this.configService.get<string>('jwt.expiresIn') || '15m';
  }

  sign(payload: Record<string, any>, options?: JwtSignOptions): string {
    const secret = options?.secret || this.defaultSecret;
    const expiresInSeconds = parseExpiresIn(options?.expiresIn || this.defaultExpiresIn);
    const now = Math.floor(Date.now() / 1000);

    const fullPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  async signAsync(payload: Record<string, any>, options?: JwtSignOptions): Promise<string> {
    return this.sign(payload, options);
  }

  verify<T = any>(token: string, options?: JwtVerifyOptions): T {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Zəhmət olmasa, əvvəlcə daxil olun');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Zəhmət olmasa, əvvəlcə daxil olun');
    }

    const secret = options?.secret || this.defaultSecret;
    const [headerB64, payloadB64, signature] = parts;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('Zəhmət olmasa, əvvəlcə daxil olun');
    }

    let payload: any;
    try {
      const jsonStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
      payload = JSON.parse(jsonStr);
    } catch {
      throw new UnauthorizedException('Zəhmət olmasa, əvvəlcə daxil olun');
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      throw new UnauthorizedException('Zəhmət olmasa, əvvəlcə daxil olun');
    }

    return payload as T;
  }

  async verifyAsync<T = any>(token: string, options?: JwtVerifyOptions): Promise<T> {
    return this.verify<T>(token, options);
  }

  decode<T = any>(token: string): T | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const jsonStr = Buffer.from(parts[1], 'base64url').toString('utf8');
      return JSON.parse(jsonStr) as T;
    } catch {
      return null;
    }
  }
}
