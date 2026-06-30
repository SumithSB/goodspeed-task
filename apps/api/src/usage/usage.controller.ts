import { Controller, Get } from '@nestjs/common';
import { CurrentUser, AuthUser } from '../auth/current-user.decorator';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get()
  summary(@CurrentUser() user: AuthUser) {
    return this.usage.summary(user.id);
  }
}
