import {
  Controller,
  Get,
  type INestApplication,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

@Controller({ path: 'contract-test', version: '1' })
class ContractTestController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('failure')
  fail(): never {
    throw new Error('internal test detail');
  }

  @Get('validation')
  validationFailure(): never {
    throw new UnprocessableEntityException({
      title: 'Request validation failed',
      detail: 'One or more request values are invalid.',
      code: 'VALIDATION_FAILED',
      errors: [{ code: 'INVALID_VALUE', pointer: '/value', detail: 'Value is invalid.' }],
    });
  }
}

describe('Health API (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ContractTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('GET /api/health', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect('X-Request-ID', /^[0-9a-f-]{36}$/)
      .expect({
        status: 'ok',
        service: 'seo-analyzer-api',
      });
  });

  it('requires API-Version for versioned API paths', async () => {
    const response = await request(app.getHttpServer()).get('/api/projects').expect(400);

    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.body).toMatchObject({
      type: 'tag:github.com,2026:Mohammad-Ranjbar/seo-analyzer/problem/api-version-required',
      title: 'API version is required',
      status: 400,
      code: 'API_VERSION_REQUIRED',
    });
    expect(response.body.instance).toBe(`urn:uuid:${response.headers['x-request-id']}`);
  });

  it('rejects a malformed API-Version', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/projects')
      .set('API-Version', 'v1')
      .expect(400);

    expect(response.body.code).toBe('API_VERSION_INVALID');
  });

  it('rejects an unsupported API-Version', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/projects')
      .set('API-Version', '2')
      .expect(406);

    expect(response.body.code).toBe('API_VERSION_UNSUPPORTED');
  });

  it('routes a supported API-Version', () => {
    return request(app.getHttpServer())
      .get('/api/contract-test')
      .set('API-Version', '1')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('formats framework errors as problem details', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/projects')
      .set('API-Version', '1')
      .expect(404);

    expect(response.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(response.body).toMatchObject({
      type: 'tag:github.com,2026:Mohammad-Ranjbar/seo-analyzer/problem/resource-not-found',
      title: 'Not Found',
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
    });
  });

  it('preserves structured validation problems', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/contract-test/validation')
      .set('API-Version', '1')
      .expect(422);

    expect(response.body).toMatchObject({
      title: 'Request validation failed',
      status: 422,
      detail: 'One or more request values are invalid.',
      code: 'VALIDATION_FAILED',
      errors: [{ code: 'INVALID_VALUE', pointer: '/value', detail: 'Value is invalid.' }],
    });
  });

  it('does not expose an unexpected server error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await request(app.getHttpServer())
      .get('/api/contract-test/failure')
      .set('API-Version', '1')
      .expect(500);

    expect(response.body).toMatchObject({
      type: 'tag:github.com,2026:Mohammad-Ranjbar/seo-analyzer/problem/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'The server could not complete the request.',
      code: 'INTERNAL_SERVER_ERROR',
    });
    expect(JSON.stringify(response.body)).not.toContain('internal test detail');
    expect(consoleError).toHaveBeenCalledOnce();
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain('internal test detail');
    consoleError.mockRestore();
  });

  afterEach(async () => {
    await app.close();
  });
});
