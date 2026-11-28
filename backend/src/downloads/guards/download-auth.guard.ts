import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '../../auth/jwt.service';
import { UsersService } from '../../users/users.service';
import { AZERBAIJANI_ERROR_MESSAGES } from '../../common/i18n/az.messages';

@Injectable()
export class DownloadAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(AZERBAIJANI_ERROR_MESSAGES.DOWN_UNAUTHENTICATED);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new UnauthorizedException(AZERBAIJANI_ERROR_MESSAGES.DOWN_UNAUTHENTICATED);
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException(AZERBAIJANI_ERROR_MESSAGES.DOWN_UNAUTHENTICATED);
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException(AZERBAIJANI_ERROR_MESSAGES.DOWN_UNAUTHENTICATED);
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(AZERBAIJANI_ERROR_MESSAGES.DOWN_UNAUTHENTICATED);
    }

    request.user = {
      _id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
    };

    return true;
  }
}
