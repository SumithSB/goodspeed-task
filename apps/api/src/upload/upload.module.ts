import { Module } from '@nestjs/common';
import { DocumentsModule } from '../documents/documents.module';
import { UploadController } from './upload.controller';

@Module({
  imports: [DocumentsModule],
  controllers: [UploadController],
})
export class UploadModule {}
