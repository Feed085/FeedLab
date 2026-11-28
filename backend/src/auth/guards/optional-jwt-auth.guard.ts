import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '../jwt.service';
import { UsersService } from '../../users/users.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return true;
    }

    try {
      const payload: any = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });

      if (payload && payload.sub) {
        const user = await this.usersService.findById(payload.sub);
        if (user && user.isActive) {
          request.user = {
            _id: user._id.toString(),
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
          };
        }
      }
    } catch {
      // Optional authentication: token was invalid/expired, continue unauthenticated
    }

    return true;
  }
}
