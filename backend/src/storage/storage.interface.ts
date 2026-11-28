import { Readable } from 'stream';

export interface StoredFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  createdAt: Date;
}

export interface UploadOptions {
  subdir?: 'projects' | 'images' | 'avatars' | 'temp' | string;
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

export interface IStorageService {
  saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: UploadOptions,
  ): Promise<StoredFile>;

  getFileStream(storagePath: string): Promise<Readable>;
  getFileBuffer(storagePath: string): Promise<Buffer>;
  deleteFile(storagePath: string): Promise<void>;
  getPublicUrl(storagePath: string): string;
  exists(storagePath: string): Promise<boolean>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
