import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CategoriesService, DEFAULT_CATEGORIES, DEFAULT_TECHNOLOGIES } from './categories.service';
import { Category } from './schemas/category.schema';
import { Technology } from './schemas/technology.schema';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryModel: any;
  let technologyModel: any;

  beforeEach(async () => {
    categoryModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    technologyModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getModelToken(Category.name),
          useValue: categoryModel,
        },
        {
          provide: getModelToken(Technology.name),
          useValue: technologyModel,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('DEFAULT_CATEGORIES', () => {
    it('should contain 8 unique Azerbaijani categories preserving all 7 existing slugs plus power-energy', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(8);
      const slugs = DEFAULT_CATEGORIES.map((c) => c.slug);
      expect(new Set(slugs).size).toBe(8);
      expect(slugs).toEqual([
        'electronics-iot',
        'smart-home',
        'robotics',
        'sensors',
        'schematics',
        'pcb',
        'wireless',
        'power-energy',
      ]);
      expect(DEFAULT_CATEGORIES[7]).toEqual(
        expect.objectContaining({
          name: 'Energetika və Qida Sistemləri',
          slug: 'power-energy',
          icon: 'zap',
          order: 7,
        }),
      );
      for (const cat of DEFAULT_CATEGORIES) {
        expect(cat.name.length).toBeGreaterThan(2);
        expect(/[əğıöşüçƏĞIİÖŞÜÇ]/.test(`${cat.name} ${cat.description}`)).toBe(true);
      }
    });
  });

  describe('findAllCategories', () => {
    it('should return unique active categories sorted by order', async () => {
      const mockCategories = [
        { name: 'IoT / Ağıllı Ev', slug: 'smart-home', order: 1, isActive: true },
        { name: 'IoT / Ağıllı Ev (dublikat)', slug: 'smart-home', order: 1, isActive: true },
        { name: 'Robototexnika', slug: 'robotics', order: 2, isActive: true },
      ];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockCategories),
      };
      categoryModel.find.mockReturnValue(mockQuery);

      const result = await service.findAllCategories();
      expect(categoryModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockQuery.sort).toHaveBeenCalledWith({ order: 1 });
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.slug)).toEqual(['smart-home', 'robotics']);
    });
  });

  describe('findAllTechnologies', () => {
    it('should return active technologies sorted by name', async () => {
      const mockTechnologies = [
        { name: 'Arduino', slug: 'arduino', isActive: true },
        { name: 'ESP32', slug: 'esp32', isActive: true },
      ];
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockTechnologies),
      };
      technologyModel.find.mockReturnValue(mockQuery);

      const result = await service.findAllTechnologies();
      expect(technologyModel.find).toHaveBeenCalledWith({ isActive: true });
      expect(mockQuery.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual(mockTechnologies);
    });
  });

  describe('seedCategoriesAndTechnologies', () => {
    it('should seed all 8 default categories and technologies if not present (without .db)', async () => {
      categoryModel.find.mockResolvedValue([]);
      categoryModel.findOne.mockResolvedValue(null);
      categoryModel.create.mockResolvedValue({});
      technologyModel.findOne.mockResolvedValue(null);
      technologyModel.create.mockResolvedValue({});

      await service.seedCategoriesAndTechnologies();

      expect(categoryModel.create).toHaveBeenCalledTimes(8);
      expect(technologyModel.create).toHaveBeenCalledTimes(DEFAULT_TECHNOLOGIES.length);
    });

    it('should skip creation if items already exist', async () => {
      categoryModel.find.mockResolvedValue([]);
      categoryModel.findOne.mockResolvedValue({ _id: 'cat-1', slug: 'smart-home' });
      technologyModel.findOne.mockResolvedValue({ _id: 'tech-1', slug: 'arduino' });

      await service.seedCategoriesAndTechnologies();

      expect(categoryModel.create).not.toHaveBeenCalled();
      expect(technologyModel.create).not.toHaveBeenCalled();
    });

    it('should deduplicate duplicate categories by slug and re-point project references when .db is present', async () => {
      const updateManyMock = jest.fn().mockResolvedValue({ modifiedCount: 2 });
      categoryModel.db = {
        collection: jest.fn().mockReturnValue({ updateMany: updateManyMock }),
      };
      categoryModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
      categoryModel.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { _id: 'cat-canon', slug: 'pcb', isActive: true },
          { _id: 'cat-dup-1', slug: 'pcb', isActive: true },
        ]),
      });
      categoryModel.findOne.mockResolvedValue({ _id: 'cat-canon', slug: 'pcb' });
      technologyModel.findOne.mockResolvedValue({ _id: 'tech-1', slug: 'arduino' });

      await service.seedCategoriesAndTechnologies();

      expect(categoryModel.db.collection).toHaveBeenCalledWith('projects');
      expect(updateManyMock).toHaveBeenCalledWith(
        { categoryId: { $in: ['cat-dup-1', 'cat-dup-1'] } },
        { $set: { categoryId: 'cat-canon' } },
      );
      expect(categoryModel.deleteMany).toHaveBeenCalledWith({
        _id: { $in: ['cat-dup-1'] },
      });
    });
  });
});
