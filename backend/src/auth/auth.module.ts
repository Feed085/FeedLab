import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService } from './jwt.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [ConfigModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, JwtService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtService, JwtAuthGuard, OptionalJwtAuthGuard, RolesGuard, UsersModule],
})
export class AuthModule {}
