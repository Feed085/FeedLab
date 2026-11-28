import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, AnyFilesInterceptor } from '@nestjs/platform-express';
import { ProjectsService } from './projects.service';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ReviewProjectDto } from './dto/review-project.dto';
import { MatchComponentsDto } from './dto/match-components.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(@Query() query: QueryProjectsDto) {
    return this.projectsService.findAll(query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AUTHOR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createDraft(
    @Body() body: CreateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.createDraft(body, user?._id);
  }

  @Get('homepage')
  async getHomepage(@Query() query: any) {
    return this.projectsService.getHomepageFeed(query);
  }

  @Post('match-components')
  @HttpCode(HttpStatus.OK)
  async matchComponents(@Body() dto: MatchComponentsDto) {
    return this.projectsService.matchComponents(dto);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtAuthGuard)
  async findBySlug(@Param('slug') slug: string, @CurrentUser() user?: any) {
    return this.projectsService.findBySlugOrId(slug, user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AUTHOR', 'ADMIN')
  async updateProject(
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.updateProject(id, body, user);
  }

  @Post(':id/files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AUTHOR', 'ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(AnyFilesInterceptor())
  async uploadFile(
    @Param('id') id: string,
    @UploadedFiles() files: any[],
    @CurrentUser() user: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Fayl yüklənməlidir');
    }
    return this.projectsService.uploadFiles(id, files, user);
  }

  @Delete(':id/files/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AUTHOR', 'ADMIN')
  async deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.deleteFile(id, fileId, user);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AUTHOR', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  async submitProject(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.submitProject(id, user);
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async reviewProject(
    @Param('id') id: string,
    @Body() dto: ReviewProjectDto,
    @CurrentUser() user: any,
  ) {
    return this.projectsService.reviewProject(id, dto, user);
  }

  @Post(':id/claim-free')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async claimFree(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.claimFree(id, user);
  }
}
