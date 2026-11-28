import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { getConnectionToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';

describe('HealthController', () => {
  let controller: HealthController;
  let mockConnection: any;

  beforeEach(async () => {
    mockConnection = {
      readyState: 1,
      db: {
        admin: () => ({
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'nodeEnv') return 'test';
              return null;
            },
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should return status ok and database connected when MongoDB is reachable', async () => {
    const result = await controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('connected');
    expect(result.timestamp).toBeDefined();
    expect(result.environment).toBe('test');
    expect(result.version).toBe('0.1.0');
  });

  it('should throw ServiceUnavailableException when connection readyState is not 1', async () => {
    mockConnection.readyState = 0;

    await expect(controller.getHealth()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should throw ServiceUnavailableException when admin ping fails', async () => {
    mockConnection.readyState = 1;
    mockConnection.db = {
      admin: () => ({
        ping: jest.fn().mockRejectedValue(new Error('Connection timeout')),
      }),
    };

    await expect(controller.getHealth()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
