import { Global, Module } from '@nestjs/common';
import { createAIProviderFromEnv } from '@goodspeed/ai';
import { AI_PROVIDER } from '../common/tokens';

@Global()
@Module({
  providers: [
    {
      provide: AI_PROVIDER,
      useFactory: () => createAIProviderFromEnv(),
    },
  ],
  exports: [AI_PROVIDER],
})
export class AiModule {}
