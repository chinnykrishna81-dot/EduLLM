import { Body, Controller, Get, Inject, Param, Patch, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { MediaService } from './media.service';

const storageDir = resolve(process.env.STORAGE_DIR || 'storage/uploads');

@ApiTags('media')
@Controller('courses/:courseId/media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}
  @Get() list(@Param('courseId') courseId: string) { return this.media.list(courseId); }
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 30, { storage: diskStorage({ destination: storageDir, filename: (_req,file,cb) => cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`) }), limits: { fileSize: 15 * 1024 * 1024 }, fileFilter: (_req,file,cb) => cb(null, ['image/png','image/jpeg','image/webp','image/svg+xml'].includes(file.mimetype)) }))
  upload(@Param('courseId') courseId: string, @UploadedFiles() files: Express.Multer.File[], @Body() body: Record<string,string>) { return Promise.all((files || []).map(file => this.media.add(courseId,file,body))); }
  @Patch(':mediaId') update(@Param('mediaId') mediaId: string, @Body() body: Record<string,string>) { return this.media.update(mediaId,body); }
}
