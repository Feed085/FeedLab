import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '../jwt.service';
import { UsersService } from '../../users/users.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;
  let usersService: Partial<UsersService>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    configService = {
      get: jest.fn().mockReturnValue('test-secret'),
    };
    usersService = {
      findById: jest.fn(),
    };
    guard = new JwtAuthGuard(
      jwtService as JwtService,
      configService as ConfigService,
      usersService as UsersService,
    );
  });

  const createMockContext = (authHeader?: string): { context: ExecutionContext; req: any } => {
    const req: any = {
      headers: {
        authorization: authHeader,
      },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
    return { context, req };
  };

  it('should throw UnauthorizedException if authorization header is missing', async () => {
    const { context } = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if header is not Bearer format', async () => {
    const { context } = createMockContext('Basic token123');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token verification fails', async () => {
    const { context } = createMockContext('Bearer invalid.jwt.token');
    (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid signature'));

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should attach user to request and return true for valid active user', async () => {
    const { context, req } = createMockContext('Bearer valid.jwt.token');
    (jwtService.verifyAsync as jest.Mock).mockResolvedValue({ sub: 'user-1' });
    (usersService.findById as jest.Mock).mockResolvedValue({
      _id: 'user-1',
      email: 'user@feedlab.az',
      fullName: 'User Name',
      role: 'USER',
      isActive: true,
      isEmailVerified: true,
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe('user@feedlab.az');
  });
});
