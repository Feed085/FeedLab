import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { ProjectsService } from '../projects/projects.service';
import { OrdersService } from '../orders/orders.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ReviewAuthorApplicationDto } from './dto/review-author-application.dto';
import { ReviewProjectDto } from '../projects/dto/review-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly projectsService: ProjectsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get('metrics')
  async getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('projects/queue')
  async getProjectsQueue(@Query() query: any) {
    return this.adminService.getProjectsQueue(query);
  }

  @Get('users')
  async getUsers(@Query() query: QueryUsersDto) {
    return this.adminService.getUsers(query);
  }

  @Patch('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUserRole(id, dto.role, user?._id);
  }

  @Patch('users/:id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUserStatus(id, dto.isActive, user?._id);
  }

  @Get('author-applications')
  async getAuthorApplications(@Query() query: any) {
    return this.adminService.getAuthorApplications(query);
  }

  @Post('author-applications/:id/review')
  @HttpCode(HttpStatus.OK)
  async reviewAuthorApplicationPost(
    @Param('id') id: string,
    @Body() dto: ReviewAuthorApplicationDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.reviewAuthorApplication(id, user?._id, dto);
  }

  @Patch('author-applications/:id')
  async reviewAuthorApplicationPatch(
    @Param('id') id: string,
    @Body() dto: ReviewAuthorApplicationDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.reviewAuthorApplication(id, user?._id, dto);
  }

  @Post('projects/:id/review')
  @HttpCode(HttpStatus.OK)
  async reviewProject(
    @Param('id') id: string,
    @Body() dto: ReviewProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.reviewProject(id, dto, user);
  }

  @Get('refunds')
  async getRefunds(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.ordersService.getAdminRefunds(status, pageNum, limitNum);
  }

  @Get('refunds/:id')
  async getRefundById(@Param('id') id: string) {
    return this.ordersService.getRefundById(id);
  }

  @Post('refunds/:id/decision')
  @HttpCode(HttpStatus.OK)
  async decideRefund(
    @Param('id') id: string,
    @Body() body: { action: 'APPROVE' | 'REJECT'; adminNotes?: string },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.reviewRefund(id, user._id, body.action, body.adminNotes);
  }

  @Post('refunds/:id/review')
  @HttpCode(HttpStatus.OK)
  async reviewRefund(
    @Param('id') id: string,
    @Body() body: { action: 'APPROVE' | 'REJECT'; adminNotes?: string },
    @CurrentUser() user: any,
  ) {
    return this.ordersService.reviewRefund(id, user._id, body.action, body.adminNotes);
  }
}
