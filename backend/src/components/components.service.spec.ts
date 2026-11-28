import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ComponentsService } from './components.service';
import { Component } from './schemas/component.schema';
import { Project } from '../projects/schemas/project.schema';
import { SEED_COMPONENTS } from './components.seed';
import {
  buildComponentLookup,
  normalizeComponentToken,
  resolveTokenToSlug,
} from './component-matcher.util';

describe('ComponentsService', () => {
  let service: ComponentsService;
  let componentModel: any;
  let projectModel: any;

  const makeChainQuery = (resolved: any) => {
    const q: any = {};
    q.select = jest.fn().mockReturnValue(q);
    q.sort = jest.fn().mockReturnValue(q);
    q.skip = jest.fn().mockReturnValue(q);
    q.limit = jest.fn().mockReturnValue(q);
    q.populate = jest.fn().mockReturnValue(q);
    q.exec = jest.fn().mockResolvedValue(resolved);
    return q;
  };

  beforeEach(async () => {
    componentModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn(),
    };

    projectModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComponentsService,
        {
          provide: getModelToken(Component.name),
          useValue: componentModel,
        },
        {
          provide: getModelToken(Project.name),
          useValue: projectModel,
        },
      ],
    }).compile();

    service = module.get<ComponentsService>(ComponentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('SEED_COMPONENTS and seedComponents', () => {
    it('should contain 31 rich educational components including codeExample for programmable modules and null for passives', () => {
      expect(SEED_COMPONENTS.length).toBeGreaterThanOrEqual(31);
      const slugs = new Set(SEED_COMPONENTS.map((c) => c.slug));
      expect(slugs.size).toBe(SEED_COMPONENTS.length);

      const esp32 = SEED_COMPONENTS.find((c) => c.slug === 'esp32');
      expect(esp32?.codeExample?.code).toBeTruthy();
      expect(esp32?.aliases).toContain('ESP32-WROOM-32D İnkişaf Lövhəsi');

      for (const passiveSlug of ['resistor', 'led', 'breadboard-jumper', 'power-supply-5v', 'robot-chassis-4wd']) {
        const passive = SEED_COMPONENTS.find((c) => c.slug === passiveSlug);
        expect(passive).toBeDefined();
        expect(passive?.codeExample).toBeNull();
      }
    });

    it('should create all seed components when none exist', async () => {
      componentModel.findOne.mockResolvedValue(null);
      componentModel.create.mockResolvedValue({});

      await service.seedComponents();

      expect(componentModel.create).toHaveBeenCalledTimes(SEED_COMPONENTS.length);
    });

    it('should backfill missing aliases on existing seed components without recreating them', async () => {
      const saveMock = jest.fn().mockResolvedValue(true);
      componentModel.findOne.mockResolvedValue({
        _id: 'comp-esp32',
        slug: 'esp32',
        aliases: ['ESP32'],
        save: saveMock,
      });

      await service.seedComponents();

      expect(componentModel.create).not.toHaveBeenCalled();
      expect(componentModel.updateOne).toHaveBeenCalledWith(
        { _id: 'comp-esp32' },
        {
          $addToSet: {
            aliases: {
              $each: expect.arrayContaining(['ESP32-WROOM-32D', 'ESP32-WROOM-32D İnkişaf Lövhəsi']),
            },
          },
        },
      );
    });

    it('should idempotently merge missing seed aliases (like DHT22 (AM2302)) into an already-existing Component without overwriting customized fields', async () => {
      const existingDht22Doc: any = {
        _id: 'comp-dht22',
        slug: 'dht22',
        name: 'Custom Admin DHT22 Name',
        definition: 'Custom Admin Definition',
        aliases: ['DHT22', 'AM2302', 'Custom Admin Alias'],
        save: jest.fn().mockResolvedValue(true),
      };

      componentModel.findOne.mockImplementation(async ({ slug }: { slug: string }) => {
        if (slug === 'dht22') return existingDht22Doc;
        const seedItem = SEED_COMPONENTS.find((c) => c.slug === slug);
        return {
          _id: `comp-${slug}`,
          slug,
          aliases: seedItem ? [...seedItem.aliases] : [],
          save: jest.fn().mockResolvedValue(true),
        };
      });

      await service.seedComponents();

      expect(componentModel.updateOne).toHaveBeenCalledTimes(1);
      expect(componentModel.updateOne).toHaveBeenCalledWith(
        { _id: 'comp-dht22' },
        {
          $addToSet: {
            aliases: {
              $each: expect.arrayContaining(['DHT22 (AM2302)']),
            },
          },
        },
      );
      expect(existingDht22Doc.name).toBe('Custom Admin DHT22 Name');
      expect(existingDht22Doc.definition).toBe('Custom Admin Definition');

      // Re-running seedComponents when all aliases are present should be a no-op
      componentModel.updateOne.mockClear();
      const dhtSeed = SEED_COMPONENTS.find((c) => c.slug === 'dht22')!;
      existingDht22Doc.aliases = [...dhtSeed.aliases, 'Custom Admin Alias'];
      await service.seedComponents();
      expect(componentModel.updateOne).not.toHaveBeenCalled();
    });

    it('should resolve parenthesized short aliases and preserve C++ vs C distinction', () => {
      const lookup = buildComponentLookup(SEED_COMPONENTS);
      expect(resolveTokenToSlug('DHT22 (AM2302)', lookup)).toBe('dht22');
      expect(resolveTokenToSlug('STM32F401CCU6', lookup)).toBe('stm32f4');
      expect(resolveTokenToSlug('Arduino Uno R3 (ATmega328P)', lookup)).toBe('arduino-uno');
      expect(resolveTokenToSlug('Arduino Nano V3 (ATmega328P CH340)', lookup)).toBe('arduino-nano');
      expect(resolveTokenToSlug('Raspberry Pi 4 Model B (4GB RAM)', lookup)).toBe('raspberry-pi-4');
      expect(resolveTokenToSlug('BMP280', lookup)).toBe('bmp280');

      expect(normalizeComponentToken('C++')).toBe('c++');
      expect(normalizeComponentToken('C')).toBe('c');
      expect(normalizeComponentToken('C#')).toBe('c#');
      expect(normalizeComponentToken('C++')).not.toBe(normalizeComponentToken('C'));
    });
  });

  describe('findAll', () => {
    it('should return paginated active components, search filter, and category counts', async () => {
      const mockItems = [
        {
          slug: 'esp32',
          name: 'ESP32 İnkişaf Lövhəsi',
          category: 'microcontrollers',
          categoryLabel: 'Mikrokontrollerlər',
          toJSON: () => ({ id: '1', slug: 'esp32', name: 'ESP32 İnkişaf Lövhəsi' }),
        },
      ];
      const listQuery = makeChainQuery(mockItems);
      const facetQuery = makeChainQuery([
        { category: 'microcontrollers', categoryLabel: 'Mikrokontrollerlər' },
        { category: 'microcontrollers', categoryLabel: 'Mikrokontrollerlər' },
        { category: 'sensors', categoryLabel: 'Sensorlar' },
      ]);

      componentModel.find
        .mockReturnValueOnce(listQuery)
        .mockReturnValueOnce(facetQuery);
      componentModel.countDocuments.mockResolvedValue(1);

      const res = await service.findAll({ q: 'ESP32', category: 'microcontrollers', page: 1, limit: 24 });

      expect(componentModel.find).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          isActive: true,
          category: 'microcontrollers',
          $or: expect.any(Array),
        }),
      );
      expect(res.total).toBe(1);
      expect(res.totalPages).toBe(1);
      expect(res.items).toHaveLength(1);
      expect(res.categories).toEqual([
        { key: 'microcontrollers', label: 'Mikrokontrollerlər', count: 2 },
        { key: 'sensors', label: 'Sensorlar', count: 1 },
      ]);
    });
  });

  describe('findBySlug', () => {
    it('should throw NotFoundException when component does not exist', async () => {
      componentModel.findOne.mockReturnValue(makeChainQuery(null));

      await expect(service.findBySlug('missing-comp')).rejects.toThrow(NotFoundException);
    });

    it('should return component detail with up to 4 featuredProjects and avoid led/oled false positives', async () => {
      const ledDoc = {
        _id: new Types.ObjectId(),
        slug: 'led',
        name: '5mm İşıq Saçan Diod (LED)',
        aliases: ['LED', '5mm Qırmızı LED'],
        toJSON: () => ({ id: 'led-1', slug: 'led', name: '5mm İşıq Saçan Diod (LED)' }),
      };

      componentModel.findOne.mockReturnValue(makeChainQuery(ledDoc));
      componentModel.find.mockReturnValue(
        makeChainQuery([
          { _id: 'c1', slug: 'led', name: '5mm İşıq Saçan Diod (LED)', aliases: ['LED', '5mm Qırmızı LED'] },
          { _id: 'c2', slug: 'oled-ssd1306', name: 'OLED Ekran', aliases: ['0.96 düym I2C OLED Ekran'] },
        ]),
      );

      const matchingProjects = Array.from({ length: 5 }, (_, idx) => ({
        _id: `p-${idx}`,
        title: `LED Layihəsi ${idx}`,
        components: [{ name: '5mm Qırmızı LED' }],
        toJSON: () => ({ id: `p-${idx}`, title: `LED Layihəsi ${idx}` }),
      }));
      const nonMatchingOledProject = {
        _id: 'p-oled',
        title: 'OLED Layihəsi',
        components: [{ name: '0.96 düym I2C OLED Ekran' }],
        toJSON: () => ({ id: 'p-oled', title: 'OLED Layihəsi' }),
      };

      projectModel.find.mockReturnValue(
        makeChainQuery([...matchingProjects, nonMatchingOledProject]),
      );

      const res = await service.findBySlug('led');

      expect(res.slug).toBe('led');
      expect(res.totalProjectsCount).toBe(5);
      expect(res.featuredProjects).toHaveLength(4);
      expect(res.featuredProjects.some((p: any) => p.id === 'p-oled')).toBe(false);
    });

    it('should NOT falsely match custom slugs/names containing esp32 or dht22 substrings', async () => {
      const espDoc = {
        _id: new Types.ObjectId(),
        slug: 'esp32',
        name: 'ESP32 İnkişaf Lövhəsi',
        aliases: ['ESP32', 'ESP32-WROOM-32D'],
        toJSON: () => ({ id: 'esp-1', slug: 'esp32', name: 'ESP32 İnkişaf Lövhəsi' }),
      };

      componentModel.findOne.mockReturnValue(makeChainQuery(espDoc));
      componentModel.find.mockReturnValue(
        makeChainQuery([
          { _id: 'c1', slug: 'esp32', name: 'ESP32 İnkişaf Lövhəsi', aliases: ['ESP32', 'ESP32-WROOM-32D'] },
        ]),
      );

      const realEspProject = {
        _id: 'p-real-esp',
        title: 'Real ESP32 Layihəsi',
        components: [{ name: 'ESP32-WROOM-32D', componentSlug: 'esp32' }],
        toJSON: () => ({ id: 'p-real-esp', title: 'Real ESP32 Layihəsi' }),
      };
      const customEspProject = {
        _id: 'p-custom-esp',
        title: 'Custom ESP32 Test Board Project',
        components: [{ name: 'Custom ESP32 Board', componentSlug: 'test-esp32-custom-xyz' }],
        toJSON: () => ({ id: 'p-custom-esp', title: 'Custom ESP32 Test Board Project' }),
      };
      const customNameOnlyProject = {
        _id: 'p-custom-name',
        title: 'Custom Name Project',
        components: [{ name: 'test-esp32-custom-xyz' }],
        toJSON: () => ({ id: 'p-custom-name', title: 'Custom Name Project' }),
      };

      projectModel.find.mockReturnValue(
        makeChainQuery([realEspProject, customEspProject, customNameOnlyProject]),
      );

      const res = await service.findBySlug('esp32');
      expect(res.totalProjectsCount).toBe(1);
      expect(res.featuredProjects.map((p: any) => p.id)).toEqual(['p-real-esp']);
    });
  });

  describe('findProjectsByComponentSlug', () => {
    it('should return paginated APPROVED projects for the component', async () => {
      componentModel.findOne.mockReturnValue(makeChainQuery({ slug: 'esp32', isActive: true }));
      componentModel.find.mockReturnValue(
        makeChainQuery([{ _id: 'c1', slug: 'esp32', name: 'ESP32', aliases: ['ESP32 Node'] }]),
      );

      const projects = [1, 2, 3].map((n) => ({
        title: `ESP32 Project ${n}`,
        components: [{ name: 'ESP32 Node' }],
        toJSON: () => ({ id: `p${n}`, title: `ESP32 Project ${n}` }),
      }));
      projectModel.find.mockReturnValue(makeChainQuery(projects));

      const res = await service.findProjectsByComponentSlug('esp32', 2, 2);
      expect(res.total).toBe(3);
      expect(res.totalPages).toBe(2);
      expect(res.items).toHaveLength(1);
      expect(res.items[0].id).toBe('p3');
    });
  });

  describe('Admin CRUD (create, update, remove)', () => {
    it('should create component when slug is unique', async () => {
      componentModel.findOne.mockReturnValue(makeChainQuery(null));
      componentModel.create.mockResolvedValue({ _id: 'id-1', slug: 'ne555' });

      const res = await service.create({
        slug: 'NE555',
        name: 'NE555 Taymer',
        category: 'passive',
        categoryLabel: 'Passiv',
        shortDescription: 'Taymer çipi',
        definition: 'Tərif',
        workingPrinciple: 'İş prinsipi',
      });

      expect(componentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'ne555', isActive: true }),
      );
      expect(res.slug).toBe('ne555');
    });

    it('should throw ConflictException on duplicate slug during create', async () => {
      componentModel.findOne.mockReturnValue(makeChainQuery({ slug: 'esp32' }));

      await expect(
        service.create({
          slug: 'esp32',
          name: 'ESP32',
          category: 'microcontrollers',
          categoryLabel: 'Mikrokontrollerlər',
          shortDescription: 'Qısa',
          definition: 'Tərif',
          workingPrinciple: 'Prinsip',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException on invalid ObjectId in update and remove', async () => {
      await expect(service.update('not-valid-id', { name: 'Yeni' })).rejects.toThrow(NotFoundException);
      await expect(service.remove('not-valid-id')).rejects.toThrow(NotFoundException);
    });

    it('should update and delete an existing component', async () => {
      const id = new Types.ObjectId().toString();
      const saveMock = jest.fn().mockResolvedValue({ _id: id, name: 'Yeniləndi' });
      componentModel.findById.mockReturnValue(
        makeChainQuery({ _id: id, slug: 'esp32', name: 'ESP32', save: saveMock }),
      );

      const updated = await service.update(id, { name: 'Yeniləndi' });
      expect(saveMock).toHaveBeenCalled();
      expect(updated.name).toBe('Yeniləndi');

      componentModel.deleteOne.mockReturnValue(makeChainQuery({ deletedCount: 1 }));
      const deleted = await service.remove(id);
      expect(deleted.success).toBe(true);
    });
  });
});
