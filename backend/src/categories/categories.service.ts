import { Injectable, OnModuleInit, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Technology, TechnologyDocument } from './schemas/technology.schema';

export const DEFAULT_CATEGORIES = [
  {
    name: 'Elektronika və IoT',
    slug: 'electronics-iot',
    icon: 'cpu',
    order: 0,
    description: 'Mikrokontrollerlər, mikrosxemlər və əşyaların interneti layihələri',
  },
  {
    name: 'IoT / Ağıllı Ev',
    slug: 'smart-home',
    icon: 'home',
    order: 1,
    description: 'Ağıllı ev avtomatlaşdırılması, sensor şəbəkələri və məsafədən idarəetmə sistemləri',
  },
  {
    name: 'Robototexnika',
    slug: 'robotics',
    icon: 'bot',
    order: 2,
    description: 'Avtonom robotlar, manipulyatorlar və hərəkət mexanizmləri',
  },
  {
    name: 'Sensorlar və Avtomatlaşdırma',
    slug: 'sensors',
    icon: 'activity',
    order: 3,
    description: 'Ətraf mühit və sənaye sensor monitorinq sistemləri',
  },
  {
    name: 'Elektron Sxemlər',
    slug: 'schematics',
    icon: 'cpu',
    order: 4,
    description: 'Elektron sxem dizaynı və analoq/rəqəmsal modullar',
  },
  {
    name: 'PCB Layihələri',
    slug: 'pcb',
    icon: 'circuit-board',
    order: 5,
    description: 'Çap lövhəsi dizaynı və istehsal faylları (Gerber)',
  },
  {
    name: 'Simsiz Əlaqə və Şəbəkələr',
    slug: 'wireless',
    icon: 'radio',
    order: 6,
    description: 'Bluetooth, Wi-Fi, LoRa və NFC/RFID əsaslı rabitə modulları',
  },
  {
    name: 'Energetika və Qida Sistemləri',
    slug: 'power-energy',
    icon: 'zap',
    order: 7,
    description: 'Günəş enerjisi, batareya idarəetməsi (BMS), gərginlik çeviriciləri və qida blokları',
  },
];

export const DEFAULT_TECHNOLOGIES = [
  { name: 'Arduino', slug: 'arduino', icon: 'cpu' },
  { name: 'ESP32', slug: 'esp32', icon: 'wifi' },
  { name: 'Raspberry Pi', slug: 'raspberry-pi', icon: 'cpu' },
  { name: 'STM32', slug: 'stm32', icon: 'cpu' },
  { name: 'ESP8266', slug: 'esp8266', icon: 'wifi' },
  { name: 'Bluetooth', slug: 'bluetooth', icon: 'bluetooth' },
  { name: 'LoRa', slug: 'lora', icon: 'radio' },
  { name: 'MQTT', slug: 'mqtt', icon: 'network' },
  { name: 'Zigbee', slug: 'zigbee', icon: 'share-2' },
  { name: 'C/C++', slug: 'c-cpp', icon: 'code' },
  { name: 'Python', slug: 'python', icon: 'code' },
];

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Technology.name) private readonly technologyModel: Model<TechnologyDocument>,
  ) {}

  async onModuleInit() {
    await this.seedCategoriesAndTechnologies();
  }

  async seedCategoriesAndTechnologies() {
    try {
      // Safely deduplicate existing Category documents by slug
      await this.deduplicateCategoriesBySlug();

      // Seed Categories
      for (const cat of DEFAULT_CATEGORIES) {
        const exists = await this.categoryModel.findOne({ slug: cat.slug });
        if (!exists) {
          await this.categoryModel.create({
            ...cat,
            isActive: true,
          });
        }
      }

      // Seed Technologies
      for (const tech of DEFAULT_TECHNOLOGIES) {
        const exists = await this.technologyModel.findOne({ slug: tech.slug });
        if (!exists) {
          await this.technologyModel.create({
            ...tech,
            isActive: true,
          });
        }
      }

      this.logger.log('Categories and technologies seed check completed.');
    } catch (err: any) {
      this.logger.warn(`Taxonomy seeding skipped: ${err?.message || err}`);
    }
  }

  private async deduplicateCategoriesBySlug() {
    if (typeof this.categoryModel.find !== 'function') {
      return;
    }

    const queryResult = this.categoryModel.find({});
    const allCategories: CategoryDocument[] =
      queryResult && typeof (queryResult as any).exec === 'function'
        ? await (queryResult as any).sort({ createdAt: 1, _id: 1 }).exec()
        : await (queryResult as any);

    if (!Array.isArray(allCategories) || allCategories.length === 0) {
      return;
    }

    const groupedBySlug = new Map<string, CategoryDocument[]>();
    for (const doc of allCategories) {
      const normalizedSlug = (doc.slug || '').toLowerCase().trim();
      if (!normalizedSlug) continue;
      const list = groupedBySlug.get(normalizedSlug) || [];
      list.push(doc);
      groupedBySlug.set(normalizedSlug, list);
    }

    for (const [slug, docs] of groupedBySlug.entries()) {
      if (docs.length <= 1) continue;

      const canonical = docs.find((d) => d.isActive !== false) || docs[0];
      const duplicates = docs.filter(
        (d) => d._id && canonical._id && d._id.toString() !== canonical._id.toString(),
      );

      if (duplicates.length === 0) continue;
      const duplicateIds = duplicates.map((d) => d._id);
      const duplicateIdStrings = duplicateIds.map((id) => id.toString());

      // Re-point any projects referencing duplicate category _ids before deletion
      const db = (this.categoryModel as any).db;
      if (db && typeof db.collection === 'function') {
        try {
          const projectsCollection = db.collection('projects');
          if (projectsCollection && typeof projectsCollection.updateMany === 'function') {
            await projectsCollection.updateMany(
              { categoryId: { $in: [...duplicateIds, ...duplicateIdStrings] } },
              { $set: { categoryId: canonical._id } },
            );
          }
        } catch (remapErr: any) {
          this.logger.warn(`Category project remap warning for ${slug}: ${remapErr?.message || remapErr}`);
        }
      }

      if (typeof (this.categoryModel as any).deleteMany === 'function') {
        await (this.categoryModel as any).deleteMany({ _id: { $in: duplicateIds } });
      } else if (typeof (this.categoryModel as any).deleteOne === 'function') {
        for (const dupId of duplicateIds) {
          await (this.categoryModel as any).deleteOne({ _id: dupId });
        }
      }

      this.logger.log(`Deduplicated ${duplicates.length} duplicate category docs for slug "${slug}".`);
    }
  }

  async findAllCategories(): Promise<CategoryDocument[]> {
    const categories = await this.categoryModel.find({ isActive: true }).sort({ order: 1 }).exec();
    const seen = new Set<string>();
    const unique: CategoryDocument[] = [];
    for (const cat of categories) {
      const slug = (cat.slug || '').toLowerCase().trim();
      if (slug && seen.has(slug)) continue;
      if (slug) seen.add(slug);
      unique.push(cat);
    }
    return unique;
  }

  async findAllTechnologies(): Promise<TechnologyDocument[]> {
    return this.technologyModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async findCategoryBySlug(slug: string): Promise<CategoryDocument | null> {
    return this.categoryModel.findOne({ slug: slug.toLowerCase().trim() }).exec();
  }

  async findCategoryById(id: string | Types.ObjectId): Promise<CategoryDocument | null> {
    return this.categoryModel.findById(id).exec();
  }

  async findTechnologyBySlug(slug: string): Promise<TechnologyDocument | null> {
    return this.technologyModel.findOne({ slug: slug.toLowerCase().trim() }).exec();
  }

  async findTechnologyById(id: string | Types.ObjectId): Promise<TechnologyDocument | null> {
    return this.technologyModel.findById(id).exec();
  }

  async createCategory(dto: any): Promise<CategoryDocument> {
    const slug = (dto.slug || dto.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return this.categoryModel.create({
      name: dto.name,
      slug,
      icon: dto.icon || 'tag',
      description: dto.description || '',
      order: dto.order || 99,
      isActive: true,
    });
  }

  async updateCategory(id: string, dto: any): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException('Kateqoriya tapılmadı');
    }
    if (dto.name !== undefined) category.name = dto.name;
    if (dto.slug !== undefined) category.slug = dto.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (dto.icon !== undefined) category.icon = dto.icon;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.order !== undefined) category.order = dto.order;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;
    return category.save();
  }

  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) {
      throw new NotFoundException('Kateqoriya tapılmadı');
    }
    await this.categoryModel.deleteOne({ _id: category._id }).exec();
    return { success: true, message: 'Kateqoriya uğurla silindi' };
  }
}
