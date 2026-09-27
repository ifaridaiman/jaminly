import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ApiResponseInterceptor } from './common/api-response/api-response.interceptor';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { env } from './env';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',

        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                  translateTime: 'SYS:standard',
                },
              }
            : undefined,

        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'password',
            'passwordHash',
            'accessToken',
            'refreshToken',
          ],
          remove: true,
        },
      },
    }),
    // ponytail: in-memory store, per instance. Redis storage when running > 1 instance.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      skipIf: () => env.NODE_ENV === 'test', // Jest sets NODE_ENV=test so suites can sign in repeatedly
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
