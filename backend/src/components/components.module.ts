import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Component, ComponentSchema } from './schemas/component.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Component.name, schema: ComponentSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
    AuthModule,
  ],
  controllers: [ComponentsController],
  providers: [ComponentsService],
  exports: [ComponentsService, MongooseModule],
})
export class ComponentsModule {}
