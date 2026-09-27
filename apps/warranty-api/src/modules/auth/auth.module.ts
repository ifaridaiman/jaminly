import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { env } from '../../env';
import { GoogleModule } from '../../infrastructure/google/google.module';
import { UsersModule } from '../users';
import { AuthCleanup } from './auth.cleanup';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

@Module({
  imports: [
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: '15m', algorithm: 'HS256' },
    }),
    GoogleModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCleanup,
    { provide: APP_GUARD, useClass: JwtGuard },
  ],
})
export class AuthModule {}
