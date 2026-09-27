import {
  Body,
  Controller,
  Delete,
  Get,
  INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
} from '@nestjs/core';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { Test } from '@nestjs/testing';
import { ThrottlerException } from '@nestjs/throttler';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import {
  API_RESULT,
  ApiResult,
} from '../src/common/api-response/api-result.decorator';
import { Public } from '../src/common/decorators/public.decorator';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ServiceUnavailableError,
} from '../src/common/errors/app-error';

class ItemDto {
  @Min(1, { message: 'Quantity must be at least 1.' }) qty!: number;
}
class CreateThingDto {
  @IsString() @IsNotEmpty({ message: 'Name is required.' }) name!: string;
  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  @ArrayMinSize(1)
  items!: ItemDto[];
}

// Test-only routes that exercise every branch of the contract.
@Controller('_test')
@Public()
class ContractTestController {
  @Get('ok')
  @ApiResult({ code: 'THING_FETCHED', message: 'Thing retrieved.' })
  ok() {
    return { id: 't1' };
  }

  @Post()
  @ApiResult({ code: 'THING_CREATED', message: 'Thing saved.', status: 201 })
  create(@Body() dto: CreateThingDto) {
    return dto;
  }

  @Delete()
  @ApiResult({ code: 'THING_DELETED', message: 'Thing deleted.', status: 204 })
  remove() {}

  @Get('401') @ApiResult({ code: 'X', message: 'X' }) e401() {
    throw new AuthenticationError(
      'INVALID_REFRESH_TOKEN',
      'Please sign in again.',
    );
  }
  @Get('404') @ApiResult({ code: 'X', message: 'X' }) e404() {
    throw new NotFoundError('THING_NOT_FOUND', 'Thing not found.');
  }
  @Get('409') @ApiResult({ code: 'X', message: 'X' }) e409() {
    throw new ConflictError('THING_LIMIT_REACHED', 'Limit reached.');
  }
  @Get('429') @ApiResult({ code: 'X', message: 'X' }) e429() {
    throw new ThrottlerException();
  }
  @Get('503') @ApiResult({ code: 'X', message: 'X' }) e503() {
    throw new ServiceUnavailableError(
      'SERVICE_UNAVAILABLE',
      'db at 10.0.0.5 down',
    );
  }
  @Get('500') @ApiResult({ code: 'X', message: 'X' }) e500() {
    throw new Error('SELECT * FROM "User" failed at /srv/app/x.ts');
  }
  @Get('p2002')
  @ApiResult({ code: 'X', message: 'X' })
  p2002() {
    throw Object.assign(new Error('Unique constraint failed on googleSub'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
    });
  }
}

@Module({ controllers: [ContractTestController] })
class ContractTestModule {}

describe('API response contract (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, ContractTestModule, DiscoveryModule],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
  });
  afterAll(() => app.close());

  const expectEnvelope = (
    body: any,
    success: boolean,
    code: string,
    version = 'v1',
  ) => {
    expect(body).toMatchObject({
      success,
      code,
      errors: expect.any(Array),
      meta: { version },
    });
    expect(body.meta.requestId).toMatch(/^req_[0-9a-f-]{36}$/);
    expect(new Date(body.meta.timestamp).toISOString()).toBe(
      body.meta.timestamp,
    );
  };

  describe('success', () => {
    it('200 wraps the return value', async () => {
      const res = await http().get('/api/v1/_test/ok').expect(200);
      expectEnvelope(res.body, true, 'THING_FETCHED');
      expect(res.body).toMatchObject({
        message: 'Thing retrieved.',
        data: { id: 't1' },
        errors: [],
      });
    });

    it('201 on create', async () => {
      const res = await http()
        .post('/api/v1/_test')
        .send({ name: 'TV', items: [{ qty: 1 }] })
        .expect(201);
      expectEnvelope(res.body, true, 'THING_CREATED');
    });

    it('204 has no body but keeps x-request-id', async () => {
      const res = await http().delete('/api/v1/_test').expect(204);
      expect(res.text).toBe('');
      expect(res.headers['x-request-id']).toMatch(/^req_/);
    });

    it('/health is unprefixed and checks the database', async () => {
      const res = await http().get('/health').expect(200);
      expectEnvelope(res.body, true, 'HEALTHY');
    });
  });

  describe('errors', () => {
    it.each([
      ['/api/v1/_test/401', 401, 'INVALID_REFRESH_TOKEN'],
      ['/api/v1/_test/404', 404, 'THING_NOT_FOUND'],
      ['/api/v1/_test/409', 409, 'THING_LIMIT_REACHED'],
      ['/api/v1/_test/429', 429, 'RATE_LIMITED'],
      ['/api/v1/_test/p2002', 409, 'CONFLICT'],
      ['/api/v1/nope', 404, 'RESOURCE_NOT_FOUND'],
    ])('%s → %i %s', async (url, status, code) => {
      const res = await http().get(url).expect(status);
      expectEnvelope(res.body, false, code);
      expect(res.body.data).toBeNull();
    });

    it('unknown version → 404, meta reports the requested version', async () => {
      const res = await http().get('/api/v2/_test/ok').expect(404);
      expectEnvelope(res.body, false, 'RESOURCE_NOT_FOUND', 'v2');
    });

    it('400 on malformed JSON', async () => {
      const res = await http()
        .post('/api/v1/_test')
        .set('content-type', 'application/json')
        .send('{"name":')
        .expect(400);
      expectEnvelope(res.body, false, 'BAD_REQUEST');
    });

    it.each([
      ['/api/v1/_test/500', 500, 'INTERNAL_ERROR'],
      ['/api/v1/_test/503', 503, 'SERVICE_UNAVAILABLE'],
    ])('%s → %i never leaks internals', async (url, status, code) => {
      const res = await http().get(url).expect(status);
      expectEnvelope(res.body, false, code);
      expect(res.body.message).toBe(
        `Something went wrong. Please try again. Reference: ${res.body.meta.requestId}`,
      );
      expect(JSON.stringify(res.body)).not.toMatch(
        /SELECT|\/srv|10\.0\.0\.5|stack/,
      );
    });
  });

  describe('validation (422)', () => {
    it('reports missing, nested and unknown fields together', async () => {
      const res = await http()
        .post('/api/v1/_test')
        .send({ name: '', items: [{ qty: 1 }, { qty: 0 }], extra: true })
        .expect(422);
      expectEnvelope(res.body, false, 'VALIDATION_ERROR');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          { field: 'name', code: 'REQUIRED', message: 'Name is required.' },
          {
            field: 'items[1].qty',
            code: 'OUT_OF_RANGE',
            message: 'Quantity must be at least 1.',
          },
          expect.objectContaining({ field: 'extra', code: 'UNKNOWN_FIELD' }),
        ]),
      );
    });
  });

  describe('request id', () => {
    it('is returned in meta and the header, and ignores an untrusted inbound id', async () => {
      const res = await http()
        .get('/api/v1/_test/ok')
        .set('x-request-id', 'attacker-chosen-id')
        .expect(200);
      expect(res.headers['x-request-id']).toBe(res.body.meta.requestId);
      expect(res.body.meta.requestId).not.toBe('attacker-chosen-id');
    });

    it('is unique per request', async () => {
      const [a, b] = await Promise.all([
        http().get('/api/v1/_test/ok'),
        http().get('/api/v1/_test/ok'),
      ]);
      expect(a.body.meta.requestId).not.toBe(b.body.meta.requestId);
    });
  });

  it('every route handler declares @ApiResult', () => {
    const discovery = app.get(DiscoveryService);
    const scanner = app.get(MetadataScanner);
    const missing: string[] = [];
    for (const { instance, metatype } of discovery.getControllers()) {
      if (!instance) continue;
      const proto = Object.getPrototypeOf(instance);
      for (const name of scanner.getAllMethodNames(proto)) {
        const handler = proto[name];
        if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined)
          continue;
        if (!Reflect.getMetadata(API_RESULT, handler))
          missing.push(`${metatype?.name}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
