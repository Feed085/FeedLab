import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './schemas/review.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { AuthorBalance, AuthorBalanceSchema } from '../authors/schemas/author-balance.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Order.name, schema: OrderSchema },
      { name: AuthorBalance.name, schema: AuthorBalanceSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService, MongooseModule],
})
export class ReviewsModule {}
