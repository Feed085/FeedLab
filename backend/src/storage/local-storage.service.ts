import {
  Injectable,
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import {
  IStorageService,
  StoredFile,
  UploadOptions,
} from './storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly basePath: string;
  private readonly defaultMaxBytes: number;

  constructor(private readonly configService: ConfigService) {
    const localDir =
      this.configService.get<string>('storage.localPath') || './uploads';
    this.basePath = path.resolve(process.cwd(), localDir);
    const maxMb =
      this.configService.get<number>('storage.maxFileSizeMb') || 100;
    this.defaultMaxBytes = maxMb * 1024 * 1024;

    this.ensureBaseDirectories();
  }

  private ensureBaseDirectories(): void {
    const subdirs = ['projects', 'images', 'avatars', 'temp'];
    for (const subdir of subdirs) {
      const dirPath = path.join(this.basePath, subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  private sanitizeSubdir(subdir?: string): string {
    if (!subdir) {
      return 'temp';
    }

    // Reject explicit directory traversal characters and absolute paths
    if (path.isAbsolute(subdir) || subdir.includes('..')) {
      throw new BadRequestException('Yolverilməz qovluq yolu');
    }

    const normalized = path.normalize(subdir).replace(/^(\.\.(\/|\\|$))+/, '');
    const resolved = path.resolve(this.basePath, normalized);

    if (resolved !== this.basePath && !resolved.startsWith(this.basePath + path.sep)) {
      throw new BadRequestException('Yolverilməz qovluq yolu');
    }

    return normalized;
  }

  private resolveStoragePath(storagePath: string): string {
    if (!storagePath || path.isAbsolute(storagePath) || storagePath.includes('..')) {
      throw new BadRequestException('Yolverilməz fayl yolu');
    }

    const safePath = path.normalize(storagePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const resolved = path.resolve(this.basePath, safePath);

    if (resolved !== this.basePath && !resolved.startsWith(this.basePath + path.sep)) {
      throw new BadRequestException('Yolverilməz fayl yolu');
    }

    return resolved;
  }

  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<StoredFile> {
    const maxBytes = options?.maxSizeBytes || this.defaultMaxBytes;
    if (buffer.length > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      throw new PayloadTooLargeException(
        `Faylın həcmi icazə verilən limiti aşır (Maksimum: ${maxMb} MB)`,
      );
    }

    if (
      options?.allowedMimeTypes &&
      options.allowedMimeTypes.length > 0 &&
      !options.allowedMimeTypes.includes(mimeType)
    ) {
      throw new BadRequestException('Bu fayl formatı dəstəklənmir');
    }

    const sanitizedSubdir = this.sanitizeSubdir(options?.subdir);
    const targetDir = path.resolve(this.basePath, sanitizedSubdir);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const ext = path.extname(originalName) || '';
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const filename = `${uniqueId}${ext}`;
    const relativePath = path.join(sanitizedSubdir, filename).replace(/\\/g, '/');
    const fullPath = path.join(targetDir, filename);

    await fs.promises.writeFile(fullPath, buffer);

    return {
      filename,
      originalName,
      mimeType,
      size: buffer.length,
      path: relativePath,
      url: this.getPublicUrl(relativePath),
      createdAt: new Date(),
    };
  }

  async getFileStream(storagePath: string): Promise<Readable> {
    const fullPath = this.resolveStoragePath(storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Fayl tapılmadı');
    }
    return fs.createReadStream(fullPath);
  }

  async getFileBuffer(storagePath: string): Promise<Buffer> {
    const fullPath = this.resolveStoragePath(storagePath);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Fayl tapılmadı');
    }
    return fs.promises.readFile(fullPath);
  }

  async deleteFile(storagePath: string): Promise<void> {
    const fullPath = this.resolveStoragePath(storagePath);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  getPublicUrl(storagePath: string): string {
    const normalized = storagePath.replace(/\\/g, '/');
    return `/uploads/${normalized}`;
  }

  async exists(storagePath: string): Promise<boolean> {
    const fullPath = this.resolveStoragePath(storagePath);
    return fs.existsSync(fullPath);
  }
}
