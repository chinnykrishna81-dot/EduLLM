import {Body,Controller,Delete,Get,Inject,Param,Patch,Post,Put,Req,UploadedFile,UploadedFiles,UseInterceptors} from '@nestjs/common';
import {FileInterceptor,FilesInterceptor} from '@nestjs/platform-express';
import {memoryStorage} from 'multer';
import {QuestionBankService} from './question-bank.service';

@Controller()
export class QuestionBankController{
  constructor(@Inject(QuestionBankService) private readonly bank:QuestionBankService){}
  @Get('question-bank/chapters/:chapterId') list(@Param('chapterId') chapterId:string){return this.bank.list(chapterId)}
  @Get('question-bank/chapters/:chapterId/statistics') statistics(@Param('chapterId') chapterId:string){return this.bank.statistics(chapterId)}
  @Post('question-bank/chapters/:chapterId/import') @UseInterceptors(FilesInterceptor('files',2,{storage:memoryStorage(),limits:{fileSize:15*1024*1024}})) import(@Param('chapterId') chapterId:string,@UploadedFiles() files:Express.Multer.File[],@Body() body:any,@Req() req:any){return this.bank.import(chapterId,files||[],body,req.user.id)}
  @Post('question-bank/cyk/preview') @UseInterceptors(FileInterceptor('file',{storage:memoryStorage(),limits:{fileSize:10*1024*1024}})) previewCyk(@UploadedFile() file:Express.Multer.File){return this.bank.previewCyk(file)}
  @Patch('question-bank/questions/:questionId') update(@Param('questionId') questionId:string,@Body() body:any){return this.bank.update(questionId,body)}
  @Post('question-bank/chapters/:chapterId/enrich') enrich(@Param('chapterId') chapterId:string,@Body() body:any){return this.bank.enrich(chapterId,body.questions||[])}
  @Delete('question-bank/questions/:questionId') remove(@Param('questionId') questionId:string){return this.bank.remove(questionId)}
  @Post('question-bank/chapters/:chapterId/ai-analyse') analyse(@Param('chapterId') chapterId:string,@Body() body:any,@Req() req:any){return this.bank.aiAnalyse(chapterId,body.questionIds||[],req.user)}
  @Get('ai-settings') settings(@Req() req:any){return this.bank.aiSettings(req.user)}
  @Put('ai-settings') saveSettings(@Body() body:any,@Req() req:any){return this.bank.saveAiSettings(body,req.user)}
}
