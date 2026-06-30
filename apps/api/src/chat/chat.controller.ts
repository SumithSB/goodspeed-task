import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { createConversationSchema, sendMessageSchema } from '@goodspeed/shared';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { ChatService } from './chat.service';

@Controller('conversations')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = createConversationSchema.parse(body);
    return this.chat.createConversation(user.id, input.title);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.chat.listConversations(
      user.id,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 50,
    );
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.chat.deleteIfEmpty(user.id, id);
    return { ok: true };
  }

  @Get(':id/messages')
  getMessages(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.getMessages(user.id, id);
  }

  @Post(':id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = sendMessageSchema.parse(body);
    return this.chat.sendMessage(user.id, id, input.content);
  }

  @Post(':id/messages/stream')
  async stream(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res() res: Response,
  ) {
    const input = sendMessageSchema.parse(body);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    for await (const event of this.chat.streamMessage(
      user.id,
      id,
      input.content,
    )) {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    }
    res.end();
  }
}
