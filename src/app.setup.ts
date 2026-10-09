import { type INestApplication, VersioningType } from '@nestjs/common';
import { apiVersionMiddleware } from './http/api-version.middleware.js';
import { ProblemDetailsFilter } from './http/problem-details.filter.js';
import { requestIdMiddleware } from './http/request-id.middleware.js';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(requestIdMiddleware);
  app.use(apiVersionMiddleware);
  app.enableVersioning({
    type: VersioningType.HEADER,
    header: 'API-Version',
  });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
}
