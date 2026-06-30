import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import pdfParse from 'pdf-parse';
import { MAX_UPLOAD_BYTES } from '@goodspeed/shared';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { DocumentsService } from '../documents/documents.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_UPLOAD_BYTES },
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const mime = file.mimetype;
    const filename = file.originalname;
    let text = '';

    if (mime === 'text/plain' || filename.endsWith('.txt')) {
      text = file.buffer.toString('utf8');
    } else if (mime === 'application/pdf' || filename.endsWith('.pdf')) {
      const parsed = await pdfParse(file.buffer);
      text = parsed.text;
    } else {
      throw new BadRequestException('Only PDF and TXT files are supported');
    }

    if (!text.trim()) {
      throw new BadRequestException('Could not extract text from file');
    }

    const title = filename.replace(/\.(pdf|txt)$/i, '');
    return this.documents.create(
      user.id,
      { title, content: text.trim(), tags: ['upload'] },
      'upload',
      filename,
    );
  }
}
