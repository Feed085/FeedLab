import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AuthorsModule } from '../authors/authors.module';
import { ProjectsModule } from '../projects/projects.module';
import { OrdersModule } from '../orders/orders.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import {
  AuthorApplication,
  AuthorApplicationSchema,
} from '../authors/schemas/author-application.schema';
import {
  AuthorBalance,
  AuthorBalanceSchema,
} from '../authors/schemas/author-balance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Order.name, schema: OrderSchema },
      { name: AuthorApplication.name, schema: AuthorApplicationSchema },
      { name: AuthorBalance.name, schema: AuthorBalanceSchema },
    ]),
    AuthModule,
    UsersModule,
    AuthorsModule,
    forwardRef(() => ProjectsModule),
    OrdersModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
