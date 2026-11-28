import { Test, TestingModule } from '@nestjs/testing';
import { ComponentsController } from './components.controller';
import { ComponentsService } from './components.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('ComponentsController', () => {
  let controller: ComponentsController;
  let service: jest.Mocked<ComponentsService>;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findProjectsByComponentSlug: jest.fn(),
      findBySlug: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComponentsController],
      providers: [
        {
          provide: ComponentsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ComponentsController>(ComponentsController);
    service = module.get(ComponentsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should leave public read routes unguarded and guard admin mutation routes with JwtAuthGuard, RolesGuard, and @Roles(ADMIN)', () => {
    const publicMethods: Array<keyof ComponentsController> = [
      'findAll',
      'findProjectsByComponent',
      'findOne',
    ];
    for (const methodName of publicMethods) {
      const guards = Reflect.getMetadata('__guards__', ComponentsController.prototype[methodName]);
      expect(guards).toBeUndefined();
    }

    const adminMethods: Array<keyof ComponentsController> = ['create', 'update', 'remove'];
    for (const methodName of adminMethods) {
      const guards = Reflect.getMetadata('__guards__', ComponentsController.prototype[methodName]);
      const roles = Reflect.getMetadata(ROLES_KEY, ComponentsController.prototype[methodName]);
      expect(guards).toEqual([JwtAuthGuard, RolesGuard]);
      expect(roles).toEqual(['ADMIN']);
    }
  });

  it('should delegate public and admin methods to ComponentsService', async () => {
    service.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 24, totalPages: 0, categories: [] });
    await controller.findAll({ q: 'esp32' });
    expect(service.findAll).toHaveBeenCalledWith({ q: 'esp32' });

    service.findProjectsByComponentSlug.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    await controller.findProjectsByComponent('esp32', 1, 20);
    expect(service.findProjectsByComponentSlug).toHaveBeenCalledWith('esp32', 1, 20);

    service.findBySlug.mockResolvedValue({ slug: 'esp32', featuredProjects: [], totalProjectsCount: 0 } as any);
    await controller.findOne('esp32');
    expect(service.findBySlug).toHaveBeenCalledWith('esp32');

    service.create.mockResolvedValue({ slug: 'new' } as any);
    await controller.create({ slug: 'new' } as any);
    expect(service.create).toHaveBeenCalledWith({ slug: 'new' });

    service.update.mockResolvedValue({ slug: 'updated' } as any);
    await controller.update('id-1', { name: 'Updated' });
    expect(service.update).toHaveBeenCalledWith('id-1', { name: 'Updated' });

    service.remove.mockResolvedValue({ success: true, message: 'ok' });
    await controller.remove('id-1');
    expect(service.remove).toHaveBeenCalledWith('id-1');
  });
});
