import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { DownloadsService } from './downloads.service';
import { DownloadsController } from './downloads.controller';
import { DownloadAuthGuard } from './guards/download-auth.guard';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    AuthModule,
    UsersModule,
  ],
  controllers: [DownloadsController],
  providers: [DownloadsService, DownloadAuthGuard],
  exports: [DownloadsService],
})
export class DownloadsModule {}
