import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import {
  NotFoundException,
  BadRequestException,
  PayloadTooLargeException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

describe('LocalStorageService', () => {
  let service: LocalStorageService;
  const testUploadDir = path.resolve(process.cwd(), './test-uploads');

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStorageService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'storage.localPath') return './test-uploads';
              if (key === 'storage.maxFileSizeMb') return 1; // 1 MB limit for tests
              return null;
            },
          },
        },
      ],
    }).compile();

    service = module.get<LocalStorageService>(LocalStorageService);
  });

  afterAll(async () => {
    if (fs.existsSync(testUploadDir)) {
      await fs.promises.rm(testUploadDir, { recursive: true, force: true });
    }
  });

  it('should save a file and return StoredFile metadata', async () => {
    const buffer = Buffer.from('hello feed lab storage');
    const result = await service.saveFile(buffer, 'test.txt', 'text/plain', {
      subdir: 'temp',
    });

    expect(result.filename).toBeDefined();
    expect(result.originalName).toBe('test.txt');
    expect(result.mimeType).toBe('text/plain');
    expect(result.size).toBe(buffer.length);
    expect(result.url).toBe(`/uploads/${result.path}`);

    const exists = await service.exists(result.path);
    expect(exists).toBe(true);

    const retrievedBuffer = await service.getFileBuffer(result.path);
    expect(retrievedBuffer.toString()).toBe('hello feed lab storage');

    await service.deleteFile(result.path);
    const existsAfterDelete = await service.exists(result.path);
    expect(existsAfterDelete).toBe(false);
  });

  it('should reject file that exceeds maximum size limit', async () => {
    // 1 MB + 1 byte
    const bigBuffer = Buffer.alloc(1 * 1024 * 1024 + 1);

    await expect(
      service.saveFile(bigBuffer, 'large.bin', 'application/octet-stream'),
    ).rejects.toThrow(PayloadTooLargeException);
  });

  it('should reject file with disallowed MIME type', async () => {
    const buffer = Buffer.from('executable binary code');

    await expect(
      service.saveFile(buffer, 'app.exe', 'application/x-msdownload', {
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException when accessing non-existent file', async () => {
    await expect(service.getFileBuffer('non-existent-file.zip')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should reject directory traversal attempts in saveFile subdir with BadRequestException', async () => {
    const buffer = Buffer.from('adversarial payload');

    await expect(
      service.saveFile(buffer, 'exploit.txt', 'text/plain', {
        subdir: '../escaped_vault',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.saveFile(buffer, 'exploit.txt', 'text/plain', {
        subdir: '../../root_escape',
      }),
    ).rejects.toThrow(BadRequestException);

    const outsidePath = path.resolve(process.cwd(), './escaped_vault');
    expect(fs.existsSync(outsidePath)).toBe(false);
  });

  it('should reject directory traversal in file access methods with BadRequestException', async () => {
    await expect(service.getFileBuffer('../../../etc/passwd')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.getFileStream('..\\..\\windows\\win.ini')).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.deleteFile('../escaped.txt')).rejects.toThrow(
      BadRequestException,
    );
  });
});
