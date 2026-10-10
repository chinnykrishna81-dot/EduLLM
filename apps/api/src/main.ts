import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const allowedOrigins = (process.env.WEB_ORIGINS || process.env.CMS_ORIGIN || 'http://localhost:5174,http://localhost:5175,http://localhost:5176').split(',').map(value => value.trim());
  const app = await NestFactory.create(AppModule, { cors: { origin: allowedOrigins }, bodyParser: false });
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const storageDir = resolve(process.env.STORAGE_DIR || join(process.cwd(), 'storage/uploads'));
  mkdirSync(storageDir, { recursive: true });
  app.use('/uploads', express.static(storageDir));
  const openapi = new DocumentBuilder().setTitle('EduLLM Content API').setVersion('0.1').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, openapi));
  const port = Number(process.env.PORT || 3001);
  await app.listen(port);
  console.log(`EduLLM API running at http://localhost:${port}/api`);
}

bootstrap();
