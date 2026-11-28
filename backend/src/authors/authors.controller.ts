import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthorsService } from './authors.service';
import { CreateAuthorApplicationDto } from './dto/create-author-application.dto';
import { QueryAuthorProjectsDto } from './dto/query-author-projects.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('authors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Post('apply')
  @Roles('USER', 'AUTHOR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async apply(
    @Body() dto: CreateAuthorApplicationDto,
    @CurrentUser() user: any,
  ) {
    return this.authorsService.apply(user._id, dto);
  }

  @Get('dashboard')
  @Roles('AUTHOR', 'ADMIN')
  async getDashboard(@CurrentUser() user: any) {
    return this.authorsService.getDashboard(user._id);
  }

  @Get('my-projects')
  @Roles('AUTHOR', 'ADMIN')
  async getMyProjects(
    @Query() query: QueryAuthorProjectsDto,
    @CurrentUser() user: any,
  ) {
    return this.authorsService.getMyProjects(user._id, query);
  }
}
