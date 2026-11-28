import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser() user: any,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createReview(user._id, dto);
  }

  @Get('projects/:projectId')
  async getProjectReviews(
    @Param('projectId') projectId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.reviewsService.getProjectReviews(projectId, pageNum, limitNum);
  }

  @Post(':id/reply')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async replyReview(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.replyReview(id, user, dto);
  }
}
