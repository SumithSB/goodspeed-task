import { Controller, Get } from '@nestjs/common';
import { CurrentUser, AuthUser } from './current-user.decorator';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
    };
  }

  @Public()
  @Get('health-check')
  authHealth() {
    return { ok: true };
  }
}
