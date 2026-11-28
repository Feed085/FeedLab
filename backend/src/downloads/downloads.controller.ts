import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { DownloadsService } from './downloads.service';
import { DownloadAuthGuard } from './guards/download-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('downloads')
@UseGuards(DownloadAuthGuard)
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Get('projects/:projectId/files/:fileId')
  async downloadFile(
    @Param('projectId') projectId: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { stream, filename, mimeType } = await this.downloadsService.getDownloadStream(
      projectId,
      fileId,
      user,
    );

    res.setHeader('Content-Type', mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    stream.pipe(res);
  }
}
