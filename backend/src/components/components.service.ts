import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Component, ComponentDocument } from './schemas/component.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { QueryComponentsDto } from './dto/query-components.dto';
import { CreateComponentDto } from './dto/create-component.dto';
import { UpdateComponentDto } from './dto/update-component.dto';
import { SEED_COMPONENTS } from './components.seed';
import {
  buildComponentLookup,
  doesProjectUseComponent,
  escapeRegex,
} from './component-matcher.util';

@Injectable()
export class ComponentsService implements OnModuleInit {
  private readonly logger = new Logger(ComponentsService.name);

  constructor(
    @InjectModel(Component.name) private readonly componentModel: Model<ComponentDocument>,
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
  ) {}

  async onModuleInit() {
    await this.seedComponents();
  }

  async seedComponents() {
    try {
      for (const item of SEED_COMPONENTS) {
        const exists = await this.componentModel.findOne({ slug: item.slug });
        if (!exists) {
          await this.componentModel.create(item);
        } else if (Array.isArray(item.aliases) && item.aliases.length > 0) {
          const currentAliases = Array.isArray(exists.aliases) ? exists.aliases : [];
          const missingAliases = Array.from(new Set(item.aliases)).filter(
            (a) => !currentAliases.includes(a),
          );
          if (missingAliases.length > 0) {
            if (typeof this.componentModel.updateOne === 'function') {
              await this.componentModel.updateOne(
                { _id: exists._id },
                { $addToSet: { aliases: { $each: missingAliases } } },
              );
            } else {
              exists.aliases = [...currentAliases, ...missingAliases];
              await exists.save();
            }
          }
        }
      }
      this.logger.log(`Electronics components seed check completed (${SEED_COMPONENTS.length} entries).`);
    } catch (err: any) {
      this.logger.warn(`Components seeding skipped: ${err?.message || err}`);
    }
  }

  private mapProjectSummary(doc: any) {
    const item = doc && typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc };
    if (item.categoryId && typeof item.categoryId === 'object') {
      item.category = item.categoryId.slug || item.categoryId.name;
    }
    return item;
  }

  private async findApprovedProjectsForComponent(componentSlug: string): Promise<any[]> {
    const allActiveComponents = await this.componentModel
      .find({ isActive: true })
      .select('_id slug name aliases category categoryLabel')
      .exec();

    const lookup = buildComponentLookup(allActiveComponents);
    const candidateProjects = await this.projectModel
      .find({ status: 'APPROVED', 'components.0': { $exists: true } })
      .sort({ featured: -1, salesCount: -1, rating: -1, createdAt: -1 })
      .populate('categoryId', 'name slug icon description')
      .populate('technologies', 'name slug icon')
      .populate('authorId', 'fullName email role')
      .exec();

    return candidateProjects
      .filter((proj) => doesProjectUseComponent(proj.components, componentSlug, lookup))
      .map((proj) => this.mapProjectSummary(proj));
  }

  async findAll(query: QueryComponentsDto) {
    const filter: any = { isActive: true };

    if (query.category && query.category.trim() && query.category.trim().toLowerCase() !== 'all') {
      filter.category = query.category.trim().toLowerCase();
    }

    if (query.q && query.q.trim()) {
      const qTrimmed = query.q.trim();
      const pattern = escapeRegex(qTrimmed);
      filter.$or = [
        { name: { $regex: pattern, $options: 'i' } },
        { slug: { $regex: pattern, $options: 'i' } },
        { aliases: { $regex: pattern, $options: 'i' } },
        { shortDescription: { $regex: pattern, $options: 'i' } },
        { definition: { $regex: pattern, $options: 'i' } },
        { categoryLabel: { $regex: pattern, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 24));
    const skip = (page - 1) * limit;

    const [itemsDocs, total, allActiveForFacets] = await Promise.all([
      this.componentModel
        .find(filter)
        .sort({ category: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.componentModel.countDocuments(filter),
      this.componentModel
        .find({ isActive: true })
        .select('category categoryLabel')
        .exec(),
    ]);

    const categoryMap = new Map<string, { key: string; label: string; count: number }>();
    for (const c of allActiveForFacets) {
      const key = (c.category || '').toLowerCase().trim();
      if (!key) continue;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        categoryMap.set(key, {
          key,
          label: c.categoryLabel || key,
          count: 1,
        });
      }
    }

    const items = itemsDocs.map((doc: any) =>
      typeof doc.toJSON === 'function' ? doc.toJSON() : { ...doc },
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      categories: Array.from(categoryMap.values()),
    };
  }

  async findBySlug(slug: string) {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const component = await this.componentModel
      .findOne({ slug: cleanSlug, isActive: true })
      .exec();

    if (!component) {
      throw new NotFoundException('Komponent tapılmadı');
    }

    const matchingProjects = await this.findApprovedProjectsForComponent(cleanSlug);
    const compObj =
      typeof (component as any).toJSON === 'function'
        ? (component as any).toJSON()
        : { ...component };

    return {
      ...compObj,
      featuredProjects: matchingProjects.slice(0, 4),
      totalProjectsCount: matchingProjects.length,
    };
  }

  async findProjectsByComponentSlug(
    slug: string,
    pageParam?: number,
    limitParam?: number,
  ) {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const component = await this.componentModel
      .findOne({ slug: cleanSlug, isActive: true })
      .exec();

    if (!component) {
      throw new NotFoundException('Komponent tapılmadı');
    }

    const page = Math.max(1, Number(pageParam) || 1);
    const limit = Math.min(100, Math.max(1, Number(limitParam) || 20));
    const allProjects = await this.findApprovedProjectsForComponent(cleanSlug);
    const total = allProjects.length;
    const start = (page - 1) * limit;
    const items = allProjects.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  async create(dto: CreateComponentDto) {
    const cleanSlug = dto.slug.trim().toLowerCase();
    const existing = await this.componentModel.findOne({ slug: cleanSlug }).exec();
    if (existing) {
      throw new ConflictException('Bu slug ilə komponent artıq mövcuddur');
    }

    try {
      const created = await this.componentModel.create({
        ...dto,
        slug: cleanSlug,
        category: dto.category.trim().toLowerCase(),
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      });
      return created;
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException('Bu slug ilə komponent artıq mövcuddur');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateComponentDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Komponent tapılmadı');
    }

    const component = await this.componentModel.findById(id).exec();
    if (!component) {
      throw new NotFoundException('Komponent tapılmadı');
    }

    if (dto.slug !== undefined) {
      const cleanSlug = dto.slug.trim().toLowerCase();
      if (cleanSlug !== component.slug) {
        const duplicate = await this.componentModel
          .findOne({ slug: cleanSlug, _id: { $ne: component._id } })
          .exec();
        if (duplicate) {
          throw new ConflictException('Bu slug ilə komponent artıq mövcuddur');
        }
        component.slug = cleanSlug;
      }
    }

    if (dto.name !== undefined) component.name = dto.name;
    if (dto.aliases !== undefined) component.aliases = dto.aliases;
    if (dto.category !== undefined) component.category = dto.category.trim().toLowerCase();
    if (dto.categoryLabel !== undefined) component.categoryLabel = dto.categoryLabel;
    if (dto.shortDescription !== undefined) component.shortDescription = dto.shortDescription;
    if (dto.definition !== undefined) component.definition = dto.definition;
    if (dto.workingPrinciple !== undefined) component.workingPrinciple = dto.workingPrinciple;
    if (dto.applications !== undefined) component.applications = dto.applications;
    if (dto.specs !== undefined) component.specs = dto.specs;
    if (dto.pinout !== undefined) component.pinout = dto.pinout;
    if (dto.pinoutImageUrl !== undefined) component.pinoutImageUrl = dto.pinoutImageUrl;
    if (dto.wiringGuide !== undefined) component.wiringGuide = dto.wiringGuide;
    if (dto.wiringImageUrl !== undefined) component.wiringImageUrl = dto.wiringImageUrl;
    if (dto.codeExample !== undefined) component.codeExample = dto.codeExample;
    if (dto.pros !== undefined) component.pros = dto.pros;
    if (dto.limitations !== undefined) component.limitations = dto.limitations;
    if (dto.alternatives !== undefined) component.alternatives = dto.alternatives;
    if (dto.imageUrl !== undefined) component.imageUrl = dto.imageUrl;
    if (dto.isActive !== undefined) component.isActive = dto.isActive;

    return component.save();
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Komponent tapılmadı');
    }

    const component = await this.componentModel.findById(id).exec();
    if (!component) {
      throw new NotFoundException('Komponent tapılmadı');
    }

    await this.componentModel.deleteOne({ _id: component._id }).exec();
    return { success: true, message: 'Komponent uğurla silindi' };
  }
}
