import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from './jwt.service';
import { hashPassword } from './utils/crypto.util';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Partial<Record<keyof UsersService, jest.Mock>>;
  let jwtService: JwtService;

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateRefreshToken: jest.fn(),
      updateResetPasswordToken: jest.fn(),
      updatePassword: jest.fn(),
      findByResetToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'jwt.secret') return 'test_jwt_secret_key_min_32_characters';
              if (key === 'jwt.expiresIn') return '15m';
              if (key === 'jwt.refreshSecret') return 'test_jwt_refresh_secret_key_min_32';
              if (key === 'jwt.refreshExpiresIn') return '7d';
              return null;
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    it('should register a new user successfully and return tokens', async () => {
      usersService.findByEmail!.mockResolvedValue(null);
      const mockCreatedUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'newuser@feedlab.az',
        fullName: 'Yeni İstifadəçi',
        role: 'USER',
        isEmailVerified: false,
      };
      usersService.create!.mockResolvedValue(mockCreatedUser);
      usersService.updateRefreshToken!.mockResolvedValue(undefined);

      const result = await authService.register({
        email: 'newuser@feedlab.az',
        password: 'Password123!',
        fullName: 'Yeni İstifadəçi',
      });

      expect(result.user.email).toBe('newuser@feedlab.az');
      expect(result.user.role).toBe('USER');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(usersService.updateRefreshToken).toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate email', async () => {
      usersService.findByEmail!.mockResolvedValue({ _id: '123', email: 'dup@feedlab.az' });

      await expect(
        authService.register({
          email: 'dup@feedlab.az',
          password: 'Password123!',
          fullName: 'Duplicate',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should prevent unauthorized role escalation to ADMIN during registration', async () => {
      usersService.findByEmail!.mockResolvedValue(null);
      usersService.create!.mockImplementation((data) => ({
        _id: '123',
        ...data,
      }));
      usersService.updateRefreshToken!.mockResolvedValue(undefined);

      await authService.register({
        email: 'hacker@feedlab.az',
        password: 'Password123!',
        fullName: 'Hacker',
        role: 'ADMIN',
      });

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'USER' }),
      );
    });
  });

  describe('login', () => {
    it('should authenticate valid credentials and return tokens', async () => {
      const passwordHash = await hashPassword('ValidPass123!');
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'user@feedlab.az',
        fullName: 'Mövcud İstifadəçi',
        role: 'USER',
        passwordHash,
        isActive: true,
        isEmailVerified: false,
      };
      usersService.findByEmail!.mockResolvedValue(mockUser);
      usersService.updateRefreshToken!.mockResolvedValue(undefined);

      const result = await authService.login({
        email: 'user@feedlab.az',
        password: 'ValidPass123!',
      });

      expect(result.user.email).toBe('user@feedlab.az');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const passwordHash = await hashPassword('ValidPass123!');
      usersService.findByEmail!.mockResolvedValue({
        _id: '123',
        email: 'user@feedlab.az',
        passwordHash,
        isActive: true,
      });

      await expect(
        authService.login({
          email: 'user@feedlab.az',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      usersService.findByEmail!.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'ghost@feedlab.az',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should successfully rotate tokens on valid refresh token', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const refreshToken = jwtService.sign(
        { sub: userId, tokenId: 'token-uuid' },
        { secret: 'test_jwt_refresh_secret_key_min_32', expiresIn: '7d' },
      );
      const refreshTokenHash = await hashPassword(refreshToken);

      usersService.findById!.mockResolvedValue({
        _id: userId,
        email: 'user@feedlab.az',
        fullName: 'İstifadəçi',
        role: 'USER',
        refreshTokenHash,
        isActive: true,
      });
      usersService.updateRefreshToken!.mockResolvedValue(undefined);

      const result = await authService.refreshTokens(refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toBe(refreshToken);
    });

    it('should detect refresh token reuse and invalidate user session', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const reusedToken = jwtService.sign(
        { sub: userId, tokenId: 'old-uuid' },
        { secret: 'test_jwt_refresh_secret_key_min_32', expiresIn: '7d' },
      );
      const differentHash = await hashPassword('another-active-token');

      usersService.findById!.mockResolvedValue({
        _id: userId,
        email: 'user@feedlab.az',
        refreshTokenHash: differentHash,
      });
      usersService.updateRefreshToken!.mockResolvedValue(undefined);

      await expect(authService.refreshTokens(reusedToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(userId, null);
    });
  });

  describe('logout', () => {
    it('should clear stored refresh token', async () => {
      usersService.updateRefreshToken!.mockResolvedValue(undefined);
      const res = await authService.logout('user-123');
      expect(res.success).toBe(true);
      expect(usersService.updateRefreshToken).toHaveBeenCalledWith('user-123', null);
    });
  });

  describe('forgotPassword & resetPassword', () => {
    it('should return success confirmation on forgot password', async () => {
      usersService.findByEmail!.mockResolvedValue({ _id: '123' });
      usersService.updateResetPasswordToken!.mockResolvedValue(undefined);

      const res = await authService.forgotPassword({ email: 'user@feedlab.az' });
      expect(res.success).toBe(true);
      expect(usersService.updateResetPasswordToken).toHaveBeenCalled();
    });

    it('should reject password reset when passwords do not match', async () => {
      await expect(
        authService.resetPassword({
          token: 'some-token',
          newPassword: 'Password123!',
          confirmPassword: 'MismatchPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
