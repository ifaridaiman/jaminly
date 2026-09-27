import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { env } from './env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: env.NODE_ENV === 'production' }),
  });
  setupApp(app);
  await app.listen(env.PORT);
}
void bootstrap();
