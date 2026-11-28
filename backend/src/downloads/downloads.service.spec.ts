import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DownloadsService } from './downloads.service';
import { Project } from '../projects/schemas/project.schema';
import { Order } from '../orders/schemas/order.schema';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';

describe('DownloadsService', () => {
  let service: DownloadsService;
  let mockProjectModel: any;
  let mockOrderModel: any;

  const mockBuyerId = new Types.ObjectId();
  const mockAuthorId = new Types.ObjectId();
  const mockProjectId = new Types.ObjectId();
  const mockFileId = 'file-circuit-zip';

  beforeEach(async () => {
    mockProjectModel = {
      findById: jest.fn(),
    };
    mockOrderModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DownloadsService,
        { provide: getModelToken(Project.name), useValue: mockProjectModel },
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
      ],
    }).compile();

    service = module.get<DownloadsService>(DownloadsService);
  });

  it('rejects directory traversal attempts with RBAC_FORBIDDEN', async () => {
    const user = { _id: mockBuyerId.toString(), role: 'USER' };
    await expect(
      service.getDownloadStream(mockProjectId.toString(), '..%2F..%2Fetc%2Fpasswd', user),
    ).rejects.toThrow(new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN));
  });

  it('rejects download when user has no PAID order with DOWN_UNPURCHASED', async () => {
    const user = { _id: mockBuyerId.toString(), role: 'USER' };
    mockProjectModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: mockProjectId,
        authorId: mockAuthorId,
        publicFiles: [{ fileId: mockFileId, originalName: 'code.zip' }],
      }),
    });
    mockOrderModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.getDownloadStream(mockProjectId.toString(), mockFileId, user),
    ).rejects.toThrow(new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED));
  });

  it('allows download when buyer has a PAID order', async () => {
    const user = { _id: mockBuyerId.toString(), role: 'USER' };
    mockProjectModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: mockProjectId,
        title: 'Arduino Sensor',
        authorId: mockAuthorId,
        publicFiles: [{ fileId: mockFileId, originalName: 'code.zip', fileType: 'application/zip' }],
      }),
    });
    mockOrderModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ status: 'PAID' }),
    });

    const result = await service.getDownloadStream(mockProjectId.toString(), mockFileId, user);
    expect(result.filename).toBe('code.zip');
    expect(result.stream).toBeDefined();
  });

  it('allows author to download own project files without order', async () => {
    const user = { _id: mockAuthorId.toString(), role: 'AUTHOR' };
    mockProjectModel.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: mockProjectId,
        title: 'Arduino Sensor',
        authorId: mockAuthorId,
        publicFiles: [{ fileId: mockFileId, originalName: 'schematics.pdf', fileType: 'application/pdf' }],
      }),
    });

    const result = await service.getDownloadStream(mockProjectId.toString(), mockFileId, user);
    expect(result.filename).toBe('schematics.pdf');
    expect(result.stream).toBeDefined();
  });
});
