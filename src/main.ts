import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import { getHttpPort } from './config/http.config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = getHttpPort(process.env.PORT);
  await app.listen(port);

  Logger.log(`HTTP server listening on port ${port}`, 'Bootstrap');
}
await bootstrap();
