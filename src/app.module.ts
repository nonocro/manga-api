import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { StorageModule } from './storage/storage.module';
import { MangasModule } from './mangas/mangas.module';
import { AuthModule } from './auth/auth.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { APP_GUARD } from '@nestjs/core';
import { AdminGuard } from './common/guards/admin.guard';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'default',
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    StorageModule,
    MangasModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: ApiKeyGuard },
    { provide: APP_GUARD, useClass: AdminGuard },
  ],
})
export class AppModule {}
