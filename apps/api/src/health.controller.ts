import { Controller, Get } from '@nestjs/common';
import { query } from './db/database';

@Controller('health')
export class HealthController {
  @Get() async health() {
    await query('SELECT 1');
    return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() };
  }
}
