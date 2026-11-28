import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage/storage.module';
import { CommonModule } from './common/common.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { AuthorsModule } from './authors/authors.module';
import { CategoriesModule } from './categories/categories.module';
import { ComponentsModule } from './components/components.module';
import { OrdersModule } from './orders/orders.module';
import { ProjectsModule } from './projects/projects.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { DownloadsModule } from './downloads/downloads.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TicketsModule } from './tickets/tickets.module';
import { RefundsModule } from './refunds/refunds.module';

@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('mongodb.uri') ||
          'mongodb://127.0.0.1:27017/feedlab',
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    StorageModule,
    CommonModule,
    UsersModule,
    AuthModule,
    AdminModule,
    AuthorsModule,
    CategoriesModule,
    ComponentsModule,
    OrdersModule,
    ProjectsModule,
    NotificationsModule,
    PaymentsModule,
    DownloadsModule,
    ReviewsModule,
    TicketsModule,
    RefundsModule,
  ],
})
export class AppModule {}
