import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { JwtService } from './jwt.service';
import { hashPassword, comparePassword } from './utils/crypto.util';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async generateTokens(user: {
    _id: string;
    email: string;
    fullName: string;
    role: string;
  }) {
    const payload = {
      sub: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.secret'),
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '15m',
    });

    const refreshPayload = {
      sub: user._id,
      tokenId: crypto.randomUUID(),
    };

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn') || '7d',
    });

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existingUser = await this.usersService.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Bu e-poçt ünvanı artıq qeydiyyatdan keçib');
    }

    // Role escalation protection: only allow AUTHOR if explicitly requested, otherwise default to USER.
    // Disallow ADMIN or MODERATOR self-assignment.
    let assignedRole: UserRole = 'USER';
    if (dto.role === 'AUTHOR') {
      assignedRole = 'AUTHOR';
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.usersService.create({
      email: normalizedEmail,
      passwordHash,
      fullName: dto.fullName.trim(),
      role: assignedRole,
    });

    const tokens = await this.generateTokens({
      _id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    // Hash refresh token before saving in DB
    const refreshTokenHash = await hashPassword(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user._id, refreshTokenHash);

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('E-poçt və ya şifrə yanlışdır');
    }

    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('E-poçt və ya şifrə yanlışdır');
    }

    const tokens = await this.generateTokens({
      _id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    const refreshTokenHash = await hashPassword(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user._id, refreshTokenHash);

    return {
      user: {
        _id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Bu xana mütləq doldurulmalıdır');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException(
        'Yeniləmə tokeni etibarsızdır və ya müddəti bitib',
      );
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException(
        'Yeniləmə tokeni etibarsızdır və ya müddəti bitib',
      );
    }

    const isMatch = await comparePassword(refreshToken, user.refreshTokenHash);
    if (!isMatch) {
      // Refresh token reuse detected! Invalidate stored token to protect compromised account
      await this.usersService.updateRefreshToken(user._id, null);
      throw new UnauthorizedException(
        'Yeniləmə tokeni etibarsızdır və ya müddəti bitib',
      );
    }

    const tokens = await this.generateTokens({
      _id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    const newRefreshTokenHash = await hashPassword(tokens.refreshToken);
    await this.usersService.updateRefreshToken(user._id, newRefreshTokenHash);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return {
      success: true,
      message: 'Uğurla çıxış edildi',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expires = new Date(Date.now() + 3600000); // 1 hour
      await this.usersService.updateResetPasswordToken(user._id, tokenHash, expires);
    }
    // Generic response preventing account enumeration
    return {
      success: true,
      message: 'Şifrə sıfırlama təlimatları e-poçt ünvanınıza göndərildi',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.confirmPassword && dto.confirmPassword !== dto.newPassword) {
      throw new BadRequestException('Şifrələr uyğun gəlmir');
    }

    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    let user = await this.usersService.findByResetToken(tokenHash);
    if (!user) {
      // Also check unhashed token match
      user = await this.usersService.findByResetToken(dto.token);
    }

    if (!user) {
      throw new BadRequestException(
        'Şifrə sıfırlama linki etibarsızdır və ya müddəti bitib',
      );
    }

    const passwordHash = await hashPassword(dto.newPassword);
    await this.usersService.updatePassword(user._id, passwordHash);

    return {
      success: true,
      message: 'Şifrəniz uğurla yeniləndi',
    };
  }
}
