import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProjectsService } from './projects.service';
import { Project } from './schemas/project.schema';
import { Category } from '../categories/schemas/category.schema';
import { Technology } from '../categories/schemas/technology.schema';
import { Order } from '../orders/schemas/order.schema';
import { User } from '../users/schemas/user.schema';
import { Component } from '../components/schemas/component.schema';
import { SEED_COMPONENTS } from '../components/components.seed';
import { LocalStorageService } from '../storage/local-storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let projectModel: any;
  let categoryModel: any;
  let technologyModel: any;
  let orderModel: any;
  let userModel: any;
  let componentModel: any;
  let storageService: any;

  beforeEach(async () => {
    projectModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
    };

    categoryModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    technologyModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    orderModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    userModel = {
      findOne: jest.fn(),
    };

    componentModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    storageService = {
      saveFile: jest.fn(),
      deleteFile: jest.fn(),
      getFileBuffer: jest.fn(),
      getFileStream: jest.fn(),
      getPublicUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: getModelToken(Project.name),
          useValue: projectModel,
        },
        {
          provide: getModelToken(Category.name),
          useValue: categoryModel,
        },
        {
          provide: getModelToken(Technology.name),
          useValue: technologyModel,
        },
        {
          provide: getModelToken(Order.name),
          useValue: orderModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: getModelToken(Component.name),
          useValue: componentModel,
        },
        {
          provide: LocalStorageService,
          useValue: storageService,
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockQueryBuilder = (returnVal: any) => {
      const q: any = {};
      q.sort = jest.fn().mockReturnValue(q);
      q.skip = jest.fn().mockReturnValue(q);
      q.limit = jest.fn().mockReturnValue(q);
      q.populate = jest.fn().mockReturnValue(q);
      q.exec = jest.fn().mockResolvedValue(returnVal);
      return q;
    };

    it('should strictly filter by status: APPROVED', async () => {
      const builder = mockQueryBuilder([{ title: 'Test Project' }]);
      projectModel.find.mockReturnValue(builder);
      projectModel.countDocuments.mockResolvedValue(1);

      const res = await service.findAll({});

      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'APPROVED' }),
      );
      expect(res.data).toHaveLength(1);
      expect(res.meta.total).toBe(1);
    });

    it('should filter with text regex when q is provided', async () => {
      const builder = mockQueryBuilder([]);
      projectModel.find.mockReturnValue(builder);
      projectModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ q: 'Weather' });

      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'APPROVED',
          $or: [
            { title: { $regex: 'Weather', $options: 'i' } },
            { shortDescription: { $regex: 'Weather', $options: 'i' } },
          ],
        }),
      );
    });

    it('should filter by category slug by looking up Category model', async () => {
      const catId = new Types.ObjectId();
      categoryModel.findOne.mockResolvedValue({ _id: catId, slug: 'sensors' });

      const builder = mockQueryBuilder([]);
      projectModel.find.mockReturnValue(builder);
      projectModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ category: 'sensors' });

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'sensors' });
      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: catId,
          status: 'APPROVED',
        }),
      );
    });

    it('should return empty data when category slug does not exist', async () => {
      categoryModel.findOne.mockResolvedValue(null);

      const res = await service.findAll({ category: 'nonexistent-category' });

      expect(res.data).toEqual([]);
      expect(res.meta.total).toBe(0);
    });

    it('should filter by technology slug', async () => {
      const techId = new Types.ObjectId();
      technologyModel.find.mockResolvedValue([{ _id: techId, slug: 'esp32' }]);

      const builder = mockQueryBuilder([]);
      projectModel.find.mockReturnValue(builder);
      projectModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ tech: 'esp32' });

      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          technologies: { $in: [techId] },
          status: 'APPROVED',
        }),
      );
    });

    it('should apply price range filters', async () => {
      const builder = mockQueryBuilder([]);
      projectModel.find.mockReturnValue(builder);
      projectModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ minPrice: 10, maxPrice: 50 });

      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'APPROVED',
          price: { $gte: 10, $lte: 50 },
        }),
      );
    });

    it('should sort by popular (salesCount and rating)', async () => {
      const builder = mockQueryBuilder([]);
      projectModel.find.mockReturnValue(builder);
      projectModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ sort: 'popular' });

      expect(builder.sort).toHaveBeenCalledWith({
        salesCount: -1,
        rating: -1,
        createdAt: -1,
      });
    });

    it('should sort by price_asc', async () => {
      const builder = mockQueryBuilder([]);
      projectModel.find.mockReturnValue(builder);
      projectModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ sort: 'price_asc' });

      expect(builder.sort).toHaveBeenCalledWith({
        price: 1,
        createdAt: -1,
      });
    });
  });

  describe('findBySlug', () => {
    it('should return project by slug and trigger viewsCount increment', async () => {
      const mockProject = {
        _id: new Types.ObjectId(),
        slug: 'test-project',
        title: 'Test Project',
        status: 'APPROVED',
      };

      const query: any = {};
      query.populate = jest.fn().mockReturnValue(query);
      query.exec = jest.fn().mockResolvedValue(mockProject);
      projectModel.findOne.mockReturnValue(query);

      const updateQuery: any = { exec: jest.fn().mockResolvedValue(null) };
      projectModel.findByIdAndUpdate.mockReturnValue(updateQuery);

      const result = await service.findBySlug('test-project');

      expect(projectModel.findOne).toHaveBeenCalledWith({
        slug: 'test-project',
        status: 'APPROVED',
      });
      expect(projectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProject._id,
        { $inc: { viewsCount: 1 } },
      );
      expect(result).toEqual(mockProject);
    });

    it('should throw NotFoundException if project not found', async () => {
      const query: any = {};
      query.populate = jest.fn().mockReturnValue(query);
      query.exec = jest.fn().mockResolvedValue(null);
      projectModel.findOne.mockReturnValue(query);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('claimFree', () => {
    const validProjectId = new Types.ObjectId().toString();
    const mockUser = { _id: new Types.ObjectId().toString(), email: 'buyer@feedlab.az' };

    it('should throw BadRequestException if projectId is not a valid ObjectId', async () => {
      await expect(service.claimFree('invalid-id', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if project not found or not approved', async () => {
      projectModel.findById.mockResolvedValue(null);

      await expect(service.claimFree(validProjectId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if project price > 0', async () => {
      projectModel.findById.mockResolvedValue({
        _id: new Types.ObjectId(validProjectId),
        status: 'APPROVED',
        price: 25.0,
      });

      await expect(service.claimFree(validProjectId, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return alreadyClaimed: true if user has already claimed the project', async () => {
      const projectObjId = new Types.ObjectId(validProjectId);
      projectModel.findById.mockResolvedValue({
        _id: projectObjId,
        status: 'APPROVED',
        price: 0,
        authorId: new Types.ObjectId(),
      });

      const existingOrder = {
        _id: new Types.ObjectId(),
        orderNumber: 'ORD-FREE-TEST',
      };
      orderModel.findOne.mockResolvedValue(existingOrder);

      const res = await service.claimFree(validProjectId, mockUser);

      expect(res.success).toBe(true);
      expect(res.alreadyClaimed).toBe(true);
      expect(res.orderId).toBe(existingOrder._id.toString());
      expect(orderModel.create).not.toHaveBeenCalled();
    });

    it('should successfully create order and increment salesCount when claim is valid', async () => {
      const projectObjId = new Types.ObjectId(validProjectId);
      const authorObjId = new Types.ObjectId();
      projectModel.findById.mockResolvedValue({
        _id: projectObjId,
        status: 'APPROVED',
        price: 0,
        authorId: authorObjId,
      });

      orderModel.findOne.mockResolvedValue(null);
      const newOrder = {
        _id: new Types.ObjectId(),
        orderNumber: 'ORD-FREE-1234',
      };
      orderModel.create.mockResolvedValue(newOrder);
      projectModel.findByIdAndUpdate.mockResolvedValue(null);

      const res = await service.claimFree(validProjectId, mockUser);

      expect(res.success).toBe(true);
      expect(res.orderId).toBe(newOrder._id.toString());
      expect(orderModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerId: new Types.ObjectId(mockUser._id),
          projectId: projectObjId,
          amount: 0,
          currency: 'AZN',
          status: 'PAID',
          paymentMethod: 'FREE_CLAIM',
        }),
      );
      expect(projectModel.findByIdAndUpdate).toHaveBeenCalledWith(
        projectObjId,
        { $inc: { salesCount: 1 } },
      );
    });
  });

  describe('Milestone 4: Creator & Moderation Methods', () => {
    const authorId = new Types.ObjectId();
    const mockAuthorUser = { _id: authorId.toString(), role: 'AUTHOR' };
    const mockAdminUser = { _id: new Types.ObjectId().toString(), role: 'ADMIN' };

    describe('createDraft', () => {
      it('should create a project draft with slug and status DRAFT', async () => {
        categoryModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() });
        projectModel.findOne.mockResolvedValue(null);
        projectModel.create.mockImplementation((doc: any) => Promise.resolve({ ...doc, _id: new Types.ObjectId() }));

        const res = await service.createDraft(
          {
            title: 'Arduino Əsaslı Layihə Testi',
            price: 25,
            shortDescription: 'Qısa təsvir',
            fullDescription: 'Geniş təsvir mətni burada yer alır',
            components: ['Arduino Uno', 'Sensor'],
          },
          authorId,
        );

        expect(res.status).toBe('DRAFT');
        expect(res.title).toBe('Arduino Əsaslı Layihə Testi');
        expect(res.price).toBe(25);
        expect(res.slug).toContain('arduino');
        expect(projectModel.create).toHaveBeenCalled();
      });

      it('should throw BadRequestException if title is shorter than 5 chars', async () => {
        await expect(
          service.createDraft({ title: 'IoT', price: 10 } as any, authorId),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if price is negative', async () => {
        await expect(
          service.createDraft({ title: 'Test Layihəsi', price: -5 } as any, authorId),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('submitProject', () => {
      it('should throw BadRequestException if project has no files', async () => {
        const projId = new Types.ObjectId();
        projectModel.findById.mockResolvedValue({
          _id: projId,
          authorId,
          status: 'DRAFT',
          publicFiles: [],
          title: 'Tam layihə adı',
          save: jest.fn(),
        });

        await expect(service.submitProject(projId.toString(), mockAuthorUser)).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should transition status to SUBMITTED when project has files', async () => {
        const projId = new Types.ObjectId();
        const saveMock = jest.fn().mockResolvedValue(true);
        const mockDoc = {
          _id: projId,
          authorId,
          status: 'DRAFT',
          publicFiles: [{ fileId: 'f1', originalName: 'src.zip' }],
          title: 'Tam layihə adı',
          save: saveMock,
        };
        projectModel.findById.mockResolvedValue(mockDoc);

        const res = await service.submitProject(projId.toString(), mockAuthorUser);

        expect(mockDoc.status).toBe('SUBMITTED');
        expect(saveMock).toHaveBeenCalled();
      });
    });

    describe('reviewProject', () => {
      it('should approve project on action APPROVE', async () => {
        const projId = new Types.ObjectId();
        const saveMock = jest.fn().mockResolvedValue(true);
        const mockDoc = {
          _id: projId,
          status: 'SUBMITTED',
          save: saveMock,
        };
        projectModel.findById.mockResolvedValue(mockDoc);

        await service.reviewProject(projId.toString(), { action: 'APPROVE' }, mockAdminUser);

        expect(mockDoc.status).toBe('APPROVED');
        expect(saveMock).toHaveBeenCalled();
      });

      it('should reject project with reason on action REJECT', async () => {
        const projId = new Types.ObjectId();
        const saveMock = jest.fn().mockResolvedValue(true);
        const mockDoc = {
          _id: projId,
          status: 'SUBMITTED',
          save: saveMock,
        };
        projectModel.findById.mockResolvedValue(mockDoc);

        await service.reviewProject(
          projId.toString(),
          { action: 'REJECT', rejectionReason: 'Sxem aydın deyil' },
          mockAdminUser,
        );

        expect(mockDoc.status).toBe('REJECTED');
        expect((mockDoc as any).rejectionReason).toBe('Sxem aydın deyil');
      });

      it('should throw BadRequestException if rejectionReason is missing on REJECT', async () => {
        const projId = new Types.ObjectId();
        projectModel.findById.mockResolvedValue({
          _id: projId,
          status: 'SUBMITTED',
          save: jest.fn(),
        });

        await expect(
          service.reviewProject(projId.toString(), { action: 'REJECT' }, mockAdminUser),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('M1 Extensions: findAll filters, matchComponents, homepage dedup & seed backfill', () => {
    const makeFindQuery = (resolved: any) => {
      const q: any = {};
      q.sort = jest.fn().mockReturnValue(q);
      q.skip = jest.fn().mockReturnValue(q);
      q.limit = jest.fn().mockReturnValue(q);
      q.populate = jest.fn().mockReturnValue(q);
      q.select = jest.fn().mockReturnValue(q);
      q.exec = jest.fn().mockResolvedValue(resolved);
      return q;
    };

    it('findAll should filter by domain, difficulty, freeOnly/isFree, and component slug', async () => {
      componentModel.find.mockReturnValue(
        makeFindQuery([
          { _id: 'c1', slug: 'esp32', name: 'ESP32', aliases: ['ESP32-WROOM-32D'] },
        ]),
      );
      projectModel.find.mockReturnValue(makeFindQuery([]));
      projectModel.countDocuments.mockResolvedValue(0);

      await service.findAll({
        domain: 'Energetika',
        difficulty: 'INTERMEDIATE',
        isFree: true,
        maxPrice: 0,
        component: 'esp32',
      });

      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'APPROVED',
          domains: { $in: ['Energetika'] },
          difficulty: 'INTERMEDIATE',
          price: { $lte: 0 },
          $and: expect.arrayContaining([
            expect.objectContaining({
              $or: expect.arrayContaining([{ 'components.componentSlug': 'esp32' }]),
            }),
          ]),
        }),
      );
    });

    it('matchComponents should return empty results when components array is empty', async () => {
      const res = await service.matchComponents({ components: [] });
      expect(res).toEqual({
        selectedComponents: [],
        fullMatches: [],
        partialMatches: [],
        totalFull: 0,
        totalPartial: 0,
      });
    });

    it('matchComponents should throw BadRequestException with VAL_INVERTED_PRICE when minPrice > maxPrice', async () => {
      await expect(
        service.matchComponents({ components: ['esp32'], minPrice: 50, maxPrice: 10 }),
      ).rejects.toThrow(new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE));
    });

    it('matchComponents should classify full vs partial matches, resolve aliases, deduplicate BOM items, and prevent led/oled false positives', async () => {
      componentModel.find.mockReturnValue(
        makeFindQuery([
          {
            _id: 'comp-esp',
            slug: 'esp32',
            name: 'ESP32 İnkişaf Lövhəsi',
            aliases: ['ESP32', 'ESP32-WROOM-32D İnkişaf Lövhəsi'],
          },
          {
            _id: 'comp-relay',
            slug: 'relay-module',
            name: 'Rele Modulu',
            aliases: ['4-Kanallı Optocütləşdiricili 5V Rele Modulu'],
          },
          {
            _id: 'comp-dht',
            slug: 'dht22',
            name: 'DHT22',
            aliases: ['DHT22 Sensor'],
          },
          {
            _id: 'comp-led',
            slug: 'led',
            name: '5mm LED',
            aliases: ['LED', '5mm Qırmızı LED'],
          },
          {
            _id: 'comp-oled',
            slug: 'oled-ssd1306',
            name: 'OLED Ekran',
            aliases: ['0.96 düym I2C OLED Ekran'],
          },
        ]),
      );

      const fullProj = {
        _id: new Types.ObjectId(),
        title: 'Tam Uyğun ESP32 Layihəsi',
        price: 0,
        featured: true,
        rating: 4.9,
        components: [
          { name: 'ESP32-WROOM-32D İnkişaf Lövhəsi' },
          { name: 'ESP32', componentSlug: 'esp32' }, // duplicate canonical BOM entry
          { name: '4-Kanallı Optocütləşdiricili 5V Rele Modulu' },
        ],
        toJSON() {
          return { id: 'p-full', title: this.title, price: this.price, featured: this.featured, rating: this.rating };
        },
      };

      const partialProj = {
        _id: new Types.ObjectId(),
        title: 'Qismən Uyğun Layihə',
        price: 20,
        featured: false,
        rating: 4.5,
        components: [
          { name: 'ESP32', componentSlug: 'esp32' },
          { name: 'DHT22 Sensor' },
        ],
        toJSON() {
          return { id: 'p-partial', title: this.title, price: this.price, featured: this.featured, rating: this.rating };
        },
      };

      const oledOnlyProj = {
        _id: new Types.ObjectId(),
        title: 'OLED Layihəsi (LED seçimi ilə uyğun gəlməməlidir)',
        price: 10,
        components: [{ name: '0.96 düym I2C OLED Ekran' }],
        toJSON() {
          return { id: 'p-oled', title: this.title };
        },
      };

      projectModel.find.mockReturnValue(makeFindQuery([fullProj, partialProj, oledOnlyProj]));

      const res = await service.matchComponents({
        components: ['ESP32', 'relay-module', 'led'],
        domain: 'Energetika',
        difficulty: 'INTERMEDIATE',
        priceType: 'all',
      });

      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'APPROVED',
          'components.0': { $exists: true },
          domains: { $in: ['Energetika'] },
          difficulty: 'INTERMEDIATE',
        }),
      );
      expect(res.selectedComponents).toEqual(['esp32', 'relay-module', 'led']);
      expect(res.totalFull).toBe(1);
      expect(res.totalPartial).toBe(1);
      expect(res.fullMatches[0].matchLabel).toBe('2/2 komponent mövcuddur');
      expect(res.fullMatches[0].missingComponents).toEqual([]);
      expect(res.partialMatches[0].matchLabel).toBe('1/2 komponent mövcuddur');
      expect(res.partialMatches[0].missingComponents).toEqual(['DHT22 Sensor']);
    });

    it('matchComponents should match unseeded BOMComponent.componentSlug directly even when BOMComponent.name differs from componentSlug', async () => {
      componentModel.find.mockReturnValue(
        makeFindQuery([
          {
            _id: 'comp-esp',
            slug: 'esp32',
            name: 'ESP32 İnkişaf Lövhəsi',
            aliases: ['ESP32'],
          },
        ]),
      );

      const customSlugProject = {
        _id: new Types.ObjectId(),
        title: 'Xüsusi Komponentli Layihə',
        price: 0,
        featured: false,
        rating: 4.8,
        components: [
          {
            name: 'Tamamilə Fərqli Ekran Adı',
            componentSlug: 'custom-unseeded-sensor-x99',
          },
        ],
        toJSON() {
          return { id: 'p-custom', title: this.title, price: this.price };
        },
      };

      const esp32Project = {
        _id: new Types.ObjectId(),
        title: 'Standart ESP32 Layihəsi',
        price: 10,
        components: [{ name: 'ESP32', componentSlug: 'esp32' }],
        toJSON() {
          return { id: 'p-esp', title: this.title, price: this.price };
        },
      };

      projectModel.find.mockReturnValue(makeFindQuery([customSlugProject, esp32Project]));

      const res = await service.matchComponents({
        components: ['CUSTOM-UNSEEDED-SENSOR-X99'],
      });

      expect(res.totalFull).toBe(1);
      expect(res.totalPartial).toBe(0);
      expect(res.fullMatches[0].project.id).toBe('p-custom');
      expect(res.fullMatches[0].matchLabel).toBe('1/1 komponent mövcuddur');
      expect(res.fullMatches[0].matchedComponents).toEqual(['Tamamilə Fərqli Ekran Adı']);
    });

    it('matchComponents should NOT produce false-positive substring matches for custom slugs/names containing esp32 or dht22', async () => {
      componentModel.find.mockReturnValue(
        makeFindQuery([
          {
            _id: 'comp-esp',
            slug: 'esp32',
            name: 'ESP32 İnkişaf Lövhəsi',
            aliases: ['ESP32', 'ESP32-WROOM-32D'],
          },
          {
            _id: 'comp-dht',
            slug: 'dht22',
            name: 'DHT22 (AM2302) Temperatur və Rütubət Sensoru',
            aliases: ['DHT22', 'DHT22 Sensor'],
          },
        ]),
      );

      const seededEsp32Proj = {
        _id: new Types.ObjectId(),
        title: 'Real ESP32 Layihəsi',
        price: 15,
        components: [{ name: 'ESP32-WROOM-32D', componentSlug: 'esp32' }],
        toJSON() {
          return { id: 'p-real-esp', title: this.title };
        },
      };

      const seededDht22Proj = {
        _id: new Types.ObjectId(),
        title: 'Real DHT22 Layihəsi',
        price: 12,
        components: [{ name: 'DHT22 Sensor', componentSlug: 'dht22' }],
        toJSON() {
          return { id: 'p-real-dht', title: this.title };
        },
      };

      const customEsp32Proj = {
        _id: new Types.ObjectId(),
        title: 'Xüsusi Test ESP32 Kartı Layihəsi',
        price: 0,
        components: [
          {
            name: 'Custom ESP32 Test Board',
            componentSlug: 'test-esp32-custom-xyz',
          },
        ],
        toJSON() {
          return { id: 'p-custom-esp', title: this.title };
        },
      };

      const customDht22Proj = {
        _id: new Types.ObjectId(),
        title: 'Xüsusi DHT22 Lövhəsi Layihəsi',
        price: 0,
        components: [{ name: 'custom-dht22-board' }],
        toJSON() {
          return { id: 'p-custom-dht', title: this.title };
        },
      };

      const allProjects = [seededEsp32Proj, seededDht22Proj, customEsp32Proj, customDht22Proj];

      // 1. Selecting seeded esp32 + dht22 must NOT match test-esp32-custom-xyz or custom-dht22-board
      projectModel.find.mockReturnValue(makeFindQuery(allProjects));
      const seededRes = await service.matchComponents({ components: ['esp32', 'dht22'] });
      expect(seededRes.fullMatches.map((m: any) => m.project.id).sort()).toEqual([
        'p-real-dht',
        'p-real-esp',
      ]);
      expect(seededRes.totalPartial).toBe(0);

      // 2. Selecting unseeded test-esp32-custom-xyz must match ONLY p-custom-esp, NOT p-real-esp
      projectModel.find.mockReturnValue(makeFindQuery(allProjects));
      const customEspRes = await service.matchComponents({ components: ['test-esp32-custom-xyz'] });
      expect(customEspRes.fullMatches.map((m: any) => m.project.id)).toEqual(['p-custom-esp']);
      expect(customEspRes.totalPartial).toBe(0);

      // 3. Selecting unseeded custom-dht22-board must match ONLY p-custom-dht, NOT p-real-dht
      projectModel.find.mockReturnValue(makeFindQuery(allProjects));
      const customDhtRes = await service.matchComponents({ components: ['custom-dht22-board'] });
      expect(customDhtRes.fullMatches.map((m: any) => m.project.id)).toEqual(['p-custom-dht']);
      expect(customDhtRes.totalPartial).toBe(0);
    });

    it('findAll with component query should use exact anchored matching (avoiding substring false positives)', async () => {
      componentModel.find.mockReturnValue(
        makeFindQuery([
          { _id: 'c1', slug: 'esp32', name: 'ESP32 İnkişaf Lövhəsi', aliases: ['ESP32'] },
        ]),
      );
      projectModel.find.mockReturnValue(makeFindQuery([]));
      projectModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ component: 'test-esp32-custom-xyz' });

      expect(projectModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'APPROVED',
          $and: expect.arrayContaining([
            expect.objectContaining({
              $or: expect.arrayContaining([
                { 'components.componentSlug': 'test-esp32-custom-xyz' },
                { 'components.componentSlug': { $regex: '^test-esp32-custom-xyz$', $options: 'i' } },
              ]),
            }),
          ]),
        }),
      );
      const passedFilter = projectModel.find.mock.calls[0][0];
      const serializedFilter = JSON.stringify(passedFilter);
      expect(serializedFilter).not.toContain('"components.componentSlug":"esp32"');
    });

    it('getHomepageFeed should deduplicate duplicate category slugs and set PUBLISHED status on projects', async () => {
      const mockProj = {
        toJSON: () => ({ id: '1', title: 'Test', status: 'APPROVED' }),
      };
      projectModel.find
        .mockReturnValueOnce(makeFindQuery([mockProj]))
        .mockReturnValueOnce(makeFindQuery([mockProj]));
      categoryModel.find.mockReturnValue(
        makeFindQuery([
          { slug: 'pcb', name: 'PCB', order: 5 },
          { slug: 'pcb', name: 'PCB Dup', order: 5 },
          { slug: 'power-energy', name: 'Energetika və Qida Sistemləri', order: 7 },
        ]),
      );

      const feed = await service.getHomepageFeed();
      expect(feed.featuredProjects[0].status).toBe('PUBLISHED');
      expect(feed.categories).toHaveLength(2);
      expect(feed.categories.map((c: any) => c.slug)).toEqual(['pcb', 'power-energy']);
    });

    it('seedProjects should idempotently backfill domains, difficulty, thumbnailUrl, and componentSlug on existing docs without overwriting price/status', async () => {
      const authorId = new Types.ObjectId();
      userModel.findOne.mockResolvedValue({ _id: authorId, role: 'AUTHOR' });
      categoryModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(), slug: 'sensors' });
      technologyModel.findOne.mockResolvedValue({ _id: new Types.ObjectId(), slug: 'arduino' });
      orderModel.findOne.mockResolvedValue({ _id: new Types.ObjectId() });
      orderModel.updateOne.mockResolvedValue({});

      const existingPlantDoc: any = {
        slug: 'avtonom-bitki-suvarma-ve-torpaq-rutubeti',
        authorId,
        price: 0,
        status: 'APPROVED',
        domains: [],
        difficulty: undefined,
        thumbnailUrl: null,
        images: [],
        components: [
          { name: 'Arduino Nano V3 (ATmega328P CH340)', quantity: 1 },
        ],
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue(true),
      };

      projectModel.findOne.mockImplementation((filter: any) => {
        const orList = filter?.$or || [];
        const matchesPlant = orList.some((c: any) => c.slug === 'avtonom-bitki-suvarma-ve-torpaq-rutubeti');
        if (matchesPlant) return Promise.resolve(existingPlantDoc);
        return Promise.resolve({ slug: 'other', authorId, save: jest.fn() });
      });

      await service.seedProjects();

      expect(existingPlantDoc.domains).toEqual(['Kənd təsərrüfatı', 'Ekologiya']);
      expect(existingPlantDoc.difficulty).toBe('BEGINNER');
      expect(existingPlantDoc.thumbnailUrl).toBe('/images/project-plant-watering.jpg');
      expect(existingPlantDoc.components[0].componentSlug).toBe('arduino-nano');
      expect(existingPlantDoc.price).toBe(0);
      expect(existingPlantDoc.status).toBe('APPROVED');
      expect(existingPlantDoc.save).toHaveBeenCalled();
    });

    it('findAll should escape regex metacharacters for single-token q queries like (test, [test, *bad, and C++', async () => {
      for (const [input, expectedPattern] of [
        ['(test', '\\(test'],
        ['[test', '\\[test'],
        ['*bad', '\\*bad'],
        ['C++', 'C\\+\\+'],
      ]) {
        projectModel.find.mockReturnValue(makeFindQuery([]));
        projectModel.countDocuments.mockResolvedValue(0);

        await service.findAll({ q: input });

        const filter = projectModel.find.mock.calls.at(-1)[0];
        expect(filter.$or).toEqual([
          { title: { $regex: expectedPattern, $options: 'i' } },
          { shortDescription: { $regex: expectedPattern, $options: 'i' } },
        ]);
        expect(() => new RegExp(expectedPattern, 'i')).not.toThrow();
      }
    });

    it('matchComponents({ components: ["dht22"] }) should match { name: "DHT22 (AM2302)" } without componentSlug, and findAll({ component: "DHT22 (AM2302)" }) should resolve to dht22', async () => {
      componentModel.find.mockReturnValue(makeFindQuery(SEED_COMPONENTS));

      const dhtNoSlugProj = {
        _id: new Types.ObjectId(),
        title: 'DHT22 Başlıqsız Layihə',
        price: 0,
        components: [{ name: 'DHT22 (AM2302)', quantity: 1 }],
        toJSON() {
          return { id: 'p-dht-no-slug', title: this.title, price: this.price };
        },
      };
      projectModel.find.mockReturnValue(makeFindQuery([dhtNoSlugProj]));

      const matchRes = await service.matchComponents({ components: ['dht22'] });
      expect(matchRes.totalFull).toBe(1);
      expect(matchRes.fullMatches[0].project.id).toBe('p-dht-no-slug');
      expect(matchRes.fullMatches[0].matchLabel).toBe('1/1 komponent mövcuddur');

      // Now verify findAll({ component: 'DHT22 (AM2302)' }) resolves to canonical slug dht22 and all aliases
      componentModel.find.mockReturnValue(makeFindQuery(SEED_COMPONENTS));
      projectModel.find.mockReturnValue(makeFindQuery([]));
      projectModel.countDocuments.mockResolvedValue(0);

      await service.findAll({ component: 'DHT22 (AM2302)' });

      const filter = projectModel.find.mock.calls.at(-1)[0];
      const serialized = JSON.stringify(filter);
      expect(serialized).toContain('"components.componentSlug":"dht22"');
      expect(serialized).toContain('DHT22 \\\\(AM2302\\\\)');
      expect(serialized).toContain('^DHT22$');
    });

    it('matchComponents({ components: ["C++"] }) should match { name: "C++" } and NOT match { name: "C" } or { name: "C#" }, while preserving existing electronics aliases', async () => {
      componentModel.find.mockReturnValue(makeFindQuery(SEED_COMPONENTS));

      const cppProj = {
        _id: new Types.ObjectId(),
        title: 'C++ Layihəsi',
        price: 0,
        components: [{ name: 'C++' }],
        toJSON() {
          return { id: 'p-cpp', title: this.title };
        },
      };
      const cOnlyProj = {
        _id: new Types.ObjectId(),
        title: 'C Layihəsi',
        price: 0,
        components: [{ name: 'C' }],
        toJSON() {
          return { id: 'p-c', title: this.title };
        },
      };
      const cSharpProj = {
        _id: new Types.ObjectId(),
        title: 'C# Layihəsi',
        price: 0,
        components: [{ name: 'C#' }],
        toJSON() {
          return { id: 'p-csharp', title: this.title };
        },
      };

      projectModel.find.mockReturnValue(makeFindQuery([cppProj, cOnlyProj, cSharpProj]));

      const cppRes = await service.matchComponents({ components: ['C++'] });
      expect(cppRes.totalFull).toBe(1);
      expect(cppRes.totalPartial).toBe(0);
      expect(cppRes.fullMatches.map((m: any) => m.project.id)).toEqual(['p-cpp']);

      // Verify existing electronics aliases continue to match cleanly
      componentModel.find.mockReturnValue(makeFindQuery(SEED_COMPONENTS));
      const electronicsProj = {
        _id: new Types.ObjectId(),
        title: 'Tam Elektronika Layihəsi',
        price: 0,
        components: [
          { name: 'ESP32-WROOM-32D' },
          { name: 'DHT22 (AM2302)' },
          { name: '2.8 düym TFT SPI 240x320 Ekran ILI9341' },
          { name: '220 Ohm Rezistor' },
          { name: 'Arduino Nano V3 (ATmega328P CH340)' },
        ],
        toJSON() {
          return { id: 'p-elec', title: this.title };
        },
      };
      projectModel.find.mockReturnValue(makeFindQuery([electronicsProj]));

      const elecRes = await service.matchComponents({
        components: ['esp32', 'dht22', 'tft-ili9341', 'resistor', 'arduino-nano'],
      });
      expect(elecRes.totalFull).toBe(1);
      expect(elecRes.fullMatches[0].matchLabel).toBe('5/5 komponent mövcuddur');
    });
  });
});
