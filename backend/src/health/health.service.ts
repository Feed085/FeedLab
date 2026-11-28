import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ConfigService } from '@nestjs/config';

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  database: 'connected' | 'disconnected';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  error?: string;
}

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly configService: ConfigService,
  ) {}

  async checkHealth(): Promise<HealthCheckResponse> {
    const uptime = process.uptime();
    const environment =
      this.configService.get<string>('nodeEnv') || 'development';
    const timestamp = new Date().toISOString();
    const version = '0.1.0';

    const isConnected = this.connection.readyState === 1;

    if (!isConnected) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        timestamp,
        uptime,
        environment,
        version,
        error: 'Verilənlər bazasına qoşulmaq mümkün olmadı',
      });
    }

    try {
      if (this.connection.db) {
        await this.connection.db.admin().ping();
      }
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'disconnected',
        timestamp,
        uptime,
        environment,
        version,
        error: 'Verilənlər bazasına qoşulmaq mümkün olmadı',
      });
    }

    return {
      status: 'ok',
      database: 'connected',
      timestamp,
      uptime,
      environment,
      version,
    };
  }
}
