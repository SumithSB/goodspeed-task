import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { createDocumentSchema, updateDocumentSchema } from '@goodspeed/shared';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('tag') tag?: string,
  ) {
    return this.documents.list(
      user.id,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
      tag,
    );
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documents.getById(user.id, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const input = createDocumentSchema.parse(body);
    return this.documents.create(user.id, input);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = updateDocumentSchema.parse(body);
    return this.documents.update(user.id, id, input);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.documents.delete(user.id, id);
    return { ok: true };
  }
}
