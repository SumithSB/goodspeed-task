import { Module } from '@nestjs/common';
import { UsageModule } from '../usage/usage.module';
import { RagService } from './rag.service';

@Module({
  imports: [UsageModule],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
