import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, Req, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PlatformService } from './platform.service';

const chapterStorage=resolve(process.env.STORAGE_DIR||'storage/uploads');

@ApiTags('content-first platform')
@Controller()
export class PlatformController {
  constructor(@Inject(PlatformService) private readonly platform:PlatformService) {}
  @Get('library/chapters') listChapters(){return this.platform.listChapters()}
  @Get('library/chapters/:id') getChapter(@Param('id') id:string){return this.platform.getChapter(id)}
  @Get('library/chapters/:id/media') chapterMedia(@Param('id') id:string){return this.platform.chapterMedia(id)}
  @Post('library/chapters/:id/media') @UseInterceptors(FilesInterceptor('files',75,{storage:diskStorage({destination:chapterStorage,filename:(_req,file,cb)=>cb(null,`${randomUUID()}${extname(file.originalname).toLowerCase()}`)}),limits:{fileSize:15*1024*1024},fileFilter:(_req,file,cb)=>cb(null,['image/png','image/jpeg','image/webp','image/svg+xml','image/gif','image/avif','image/bmp'].includes(file.mimetype))})) uploadChapterMedia(@Param('id') id:string,@UploadedFiles() files:Express.Multer.File[]){return this.platform.uploadChapterMedia(id,files||[])}
  @Post('library/chapters/:id/documents/:nodeType/:nodeId') @UseInterceptors(FileInterceptor('file',{storage:diskStorage({destination:chapterStorage,filename:(_req,_file,cb)=>cb(null,`${randomUUID()}.pdf`)}),limits:{fileSize:5*1024*1024},fileFilter:(_req,file,cb)=>cb(null,file.mimetype==='application/pdf'&&extname(file.originalname).toLowerCase()==='.pdf')})) uploadChapterDocument(@Param('id') id:string,@Param('nodeType') nodeType:string,@Param('nodeId') nodeId:string,@UploadedFile() file:Express.Multer.File){return this.platform.uploadChapterDocument(id,nodeType,nodeId,file)}
  @Post('library/chapters/:id/resources/:resourceType') @UseInterceptors(FileInterceptor('file',{storage:diskStorage({destination:chapterStorage,filename:(_req,file,cb)=>cb(null,`${randomUUID()}${extname(file.originalname).toLowerCase()}`)}),limits:{fileSize:10*1024*1024},fileFilter:(_req,file,cb)=>cb(null,['.pdf','.docx','.png','.jpg','.jpeg'].includes(extname(file.originalname).toLowerCase()))})) uploadChapterResource(@Param('id') id:string,@Param('resourceType') resourceType:string,@Query('mode') mode:string,@UploadedFile() file:Express.Multer.File){return this.platform.uploadChapterResource(id,resourceType,mode,file)}
  @Post('library/chapters') createChapter(@Body() body:any){return this.platform.createChapter(body)}
  @Post('library/chapter-packages/validate') validateChapterPackage(@Body() body:any){return this.platform.validateChapterPackage(body)}
  @Post('library/chapter-packages/import') importChapterPackage(@Body() body:any){return this.platform.importChapterPackage(body)}
  @Put('library/chapters/:id') updateChapter(@Param('id') id:string,@Body() body:any){return this.platform.updateChapter(id,body)}
  @Post('library/chapters/:id/topics') importTopics(@Param('id') id:string,@Body() body:any){return this.platform.importTopics(id,body)}
  @Delete('library/chapters/:id') deleteChapter(@Param('id') id:string){return this.platform.deleteChapter(id)}
  @Put('library/chapters/:id/cycle-test') updateCycleTest(@Param('id') id:string,@Body() body:any){return this.platform.updateCycleTest(id,body)}
  @Delete('library/chapters/:id/cycle-test/forms') deleteCycleTestForms(@Param('id') id:string){return this.platform.deleteCycleTestForms(id)}
  @Patch('library/chapters/:id/status/:status') reviewChapter(@Param('id') id:string,@Param('status') status:string){return this.platform.reviewChapter(id,status)}
  @Get('subjects') listSubjects(){return this.platform.listSubjects()}
  @Get('subjects/:id') getSubject(@Param('id') id:string){return this.platform.getSubject(id)}
  @Post('subjects') createSubject(@Body() body:any){return this.platform.createSubject(body)}
  @Delete('subjects/:id') deleteSubject(@Param('id') id:string){return this.platform.deleteSubject(id)}
  @Post('subjects/:id/units') addUnit(@Param('id') id:string,@Body() body:any){return this.platform.addUnit(id,body)}
  @Delete('subjects/:id/units/:unitId') deleteUnit(@Param('id') id:string,@Param('unitId') unitId:string){return this.platform.deleteUnit(id,unitId)}
  @Post('subjects/:id/units/:unitId/chapters') addChapter(@Param('id') id:string,@Param('unitId') unitId:string,@Body() body:any){return this.platform.addChapterToUnit(id,unitId,body)}
  @Put('subjects/:id/units/:unitId/semester-test') updateSemesterTest(@Param('id') id:string,@Param('unitId') unitId:string,@Body() body:any){return this.platform.updateSemesterTest(id,unitId,body)}
  @Patch('subjects/:id/status/:status') reviewSubject(@Param('id') id:string,@Param('status') status:string){return this.platform.reviewSubject(id,status)}
  @Get('offerings') listOfferings(){return this.platform.listOfferings()}
  @Get('offerings/:id') getOffering(@Param('id') id:string){return this.platform.getOffering(id)}
  @Post('offerings') createOffering(@Body() body:any){return this.platform.createOffering(body)}
  @Patch('offerings/:id') updateOffering(@Param('id') id:string,@Body() body:any){return this.platform.updateOffering(id,body)}
  @Delete('offerings/:id') deleteOffering(@Param('id') id:string){return this.platform.deleteOffering(id)}
  @Put('offerings/:id/subjects') setSubjects(@Param('id') id:string,@Body() body:any){return this.platform.setOfferingSubjects(id,body)}
  @Post('offerings/:id/publish') publish(@Param('id') id:string){return this.platform.publishOffering(id)}
  @Post('offerings/:id/unpublish') unpublish(@Param('id') id:string){return this.platform.unpublishOffering(id)}
  @Get('catalogue/courses') catalogue(){return this.platform.listOfferings(true)}
  @Get('catalogue/courses/:id') catalogueCourse(@Param('id') id:string){return this.platform.getOffering(id,true)}
  @Get('student/enrolments') studentEnrolments(@Req() req:any){return this.platform.studentEnrolments(req.user.id)}
  @Post('catalogue/courses/:id/enrol') enrol(@Req() req:any,@Param('id') id:string){return this.platform.enrol(req.user.id,id)}
  @Get('catalogue/courses/:id/access') access(@Req() req:any,@Param('id') id:string){return this.platform.hasAccess(req.user.id,id)}
  @Get('catalogue/subjects/:id/index') subjectIndex(@Param('id') id:string){return this.platform.getSubject(id)}
  @Get('catalogue/subjects/:id/chapters') subjectChapters(@Param('id') id:string){return this.platform.catalogueSubjectChapters(id)}
  @Get('catalogue/chapters/:id/media') catalogueChapterMedia(@Param('id') id:string){return this.platform.chapterMedia(id)}
  @Get('catalogue/chapters/:id/assessment') catalogueChapterAssessment(@Param('id') id:string){return this.platform.chapterAssessmentUnified(id)}
}
