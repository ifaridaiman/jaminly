import {
  type INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { validationExceptionFactory } from './common/errors/validation';
import { requestContextMiddleware } from './common/request-context/request-context.middleware';
import { env } from './env';

/** Everything main.ts configures on the app. E2E tests call this too, so they test the real setup. */
export function setupApp(app: INestApplication) {
  app.use(requestContextMiddleware(env.TRUST_REQUEST_ID));
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true, // one error per field: "required", not also "must be a string"
      exceptionFactory: validationExceptionFactory,
    }),
  );
  app.enableCors({
    origin: env.CORS_ORIGINS,
    exposedHeaders: ['x-request-id'],
  });
  app.enableShutdownHooks();

  // Swagger UI at /docs, raw spec at /docs-json. Off in production unless SWAGGER=true.
  if (env.SWAGGER) {
    const config = new DocumentBuilder()
      .setTitle('Jaminly API')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();
    SwaggerModule.setup(
      'docs',
      app,
      () => SwaggerModule.createDocument(app, config),
      {
        swaggerOptions: { persistAuthorization: true },
      },
    );
  }
}
