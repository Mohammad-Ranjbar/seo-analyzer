import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: 'seo-analyzer-api';
}

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      service: 'seo-analyzer-api',
    };
  }
}
