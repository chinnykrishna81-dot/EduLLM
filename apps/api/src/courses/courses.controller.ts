import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CoursesService } from './courses.service';

@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(@Inject(CoursesService) private readonly courses: CoursesService) {}
  @Get() list() { return this.courses.list(); }
  @Get(':id') get(@Param('id') id: string) { return this.courses.get(id); }
  @Post('import') import(@Body() body: unknown) { return this.courses.import(body); }
  @Put(':id/content') replace(@Param('id') id: string, @Body() body: unknown) { return this.courses.replace(id, body); }
  @Patch(':id/review/:status') review(@Param('id') id: string, @Param('status') status: string) { return this.courses.review(id, status); }
  @Post(':id/publish') publish(@Param('id') id: string) { return this.courses.publish(id); }
  @Post(':id/unpublish') unpublish(@Param('id') id: string) { return this.courses.unpublish(id); }
  @Delete(':id') async remove(@Param('id') id: string) { await this.courses.remove(id); return { deleted: true }; }
}
