import { Global, Module, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { SUPABASE_CLIENT } from '../common/tokens';

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      scope: Scope.REQUEST,
      inject: [REQUEST, ConfigService],
      useFactory: (
        request: { headers: { authorization?: string } },
        config: ConfigService,
      ) => {
        const authHeader = request.headers.authorization ?? '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        return createClient(
          config.getOrThrow('NEXT_PUBLIC_SUPABASE_URL'),
          config.getOrThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
          {
            global: {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
          },
        ) as SupabaseClient;
      },
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class SupabaseModule {}
