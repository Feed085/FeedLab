import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';
import {
  AuthorApplication,
  AuthorApplicationSchema,
} from './schemas/author-application.schema';
import {
  AuthorBalance,
  AuthorBalanceSchema,
} from './schemas/author-balance.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuthorApplication.name, schema: AuthorApplicationSchema },
      { name: AuthorBalance.name, schema: AuthorBalanceSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    UsersModule,
  ],
  controllers: [AuthorsController],
  providers: [AuthorsService],
  exports: [AuthorsService, MongooseModule],
})
export class AuthorsModule {}
