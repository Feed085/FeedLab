import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService, HealthCheckResponse } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<HealthCheckResponse> {
    return this.healthService.checkHealth();
  }
}
