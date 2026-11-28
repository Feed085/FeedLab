import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';

@Injectable()
export class DownloadsService {
  constructor(
    @InjectModel(Project.name)
    private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getDownloadStream(
    projectId: string,
    fileId: string,
    user: any,
  ): Promise<{ stream: Readable; filename: string; mimeType: string }> {
    // 1. Directory traversal prevention
    const decodedFileId = decodeURIComponent(fileId);
    if (
      decodedFileId.includes('..') ||
      decodedFileId.includes('/') ||
      decodedFileId.includes('\\') ||
      projectId.includes('..') ||
      projectId.includes('/') ||
      projectId.includes('\\')
    ) {
      throw new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.RBAC_FORBIDDEN);
    }

    // 2. Project ID validation
    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(projectId)) {
      project = await this.projectModel.findById(projectId).exec();
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: projectId }).exec();
    }
    if (!project) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_PROJECT);
    }

    // 3. Authorization check (Admin, Author, or Buyer with PAID order)
    const isAdmin = user.role === 'ADMIN';
    const isAuthor =
      project.authorId && project.authorId.toString() === user._id.toString();

    let hasPaidOrder = false;
    if (!isAdmin && !isAuthor) {
      const paidOrder = await this.orderModel.findOne({
        buyerId: new Types.ObjectId(user._id),
        projectId: project._id,
        status: 'PAID',
      }).exec();

      if (paidOrder) {
        hasPaidOrder = true;
      }
    }

    if (!isAdmin && !isAuthor && !hasPaidOrder) {
      throw new ForbiddenException(AZERBAIJANI_ERROR_MESSAGES.DOWN_UNPURCHASED);
    }

    // 4. File lookup in project publicFiles
    const publicFiles = project.publicFiles || [];
    const targetFile = publicFiles.find(
      (f) =>
        f.fileId === fileId ||
        (f as any)._id?.toString() === fileId ||
        f.originalName === fileId ||
        f.fileId === decodedFileId,
    );

    if (!targetFile) {
      throw new NotFoundException(AZERBAIJANI_ERROR_MESSAGES.NF_FILE);
    }

    const filename = targetFile.originalName || `asset_${fileId}.bin`;
    const mimeType = targetFile.fileType || 'application/octet-stream';

    // 5. Streaming asset (disk file or fallback stream for seed projects)
    let stream: Readable;
    if (targetFile.storagePath && fs.existsSync(targetFile.storagePath)) {
      stream = fs.createReadStream(targetFile.storagePath);
    } else {
      // Defensive fallback for seed data or virtual test files
      const content = Buffer.from(
        `FeedLab Engineering Asset\nProject: ${project.title} (${project._id})\nFile: ${filename}\nOriginal Size: ${targetFile.fileSize || 0} bytes\nDownload Date: ${new Date().toISOString()}\nLicense: Personal engineering use only.\n`,
      );
      stream = Readable.from([content]);
    }

    return {
      stream,
      filename,
      mimeType,
    };
  }
}
