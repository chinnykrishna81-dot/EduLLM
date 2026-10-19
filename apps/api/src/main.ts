import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { AppModule } from './app.module';
import { query } from './db/database';
import { readFileSync } from 'node:fs';

for (const envPath of [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'apps/api/.env')]) { try { const env=readFileSync(envPath,'utf8'); for(const line of env.split(/\r?\n/)){const m=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}} catch {} }

async function bootstrap() {
  const allowedOrigins = (process.env.WEB_ORIGINS || process.env.CMS_ORIGIN || 'http://localhost:5174,http://localhost:5175,http://localhost:5176').split(',').map(value => value.trim());
  const app = await NestFactory.create(AppModule, { cors: { origin: allowedOrigins }, bodyParser: false });
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const storageDir = resolve(process.env.STORAGE_DIR || join(process.cwd(), 'storage/uploads'));
  mkdirSync(storageDir, { recursive: true });
  app.use('/uploads', express.static(storageDir));
  // Health endpoint as plain middleware (avoids tsx decorator issues with HealthController)
  app.use('/api/health', async (_req: any, res: any) => {
    try { await query('SELECT 1'); res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() }); }
    catch { res.status(503).json({ status: 'error' }); }
  });
  const openapi = new DocumentBuilder().setTitle('EduLLM Content API').setVersion('0.1').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, openapi));
  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(`EduLLM API running at http://localhost:${port}/api`);
}

bootstrap();
