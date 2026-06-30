import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { UsageModule } from '../usage/usage.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [RagModule, UsageModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
