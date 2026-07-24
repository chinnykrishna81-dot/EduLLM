import {Body,Controller,Delete,Get,Inject,Param,Patch,Post,Req,UploadedFile,UseInterceptors} from '@nestjs/common';
import {FileInterceptor} from '@nestjs/platform-express';
import {memoryStorage} from 'multer';
import {ContentBaseService} from './content-base.service';

@Controller('content-base')
export class ContentBaseController{
  constructor(@Inject(ContentBaseService) private readonly content:ContentBaseService){}
  @Get() batches(){return this.content.batches()}
  @Get(':batchId') batch(@Param('batchId') id:string){return this.content.batch(id)}
  @Delete(':batchId') remove(@Param('batchId') id:string){return this.content.remove(id)}
  @Post('import') @UseInterceptors(FileInterceptor('file',{storage:memoryStorage(),limits:{fileSize:15*1024*1024}})) import(@UploadedFile() file:Express.Multer.File,@Body() body:any,@Req() req:any){return this.content.import(file,body,req.user.id)}
  @Patch('items/:itemId') update(@Param('itemId') id:string,@Body() body:any){return this.content.updateItem(id,body)}
  @Get(':batchId/proposal') proposal(@Param('batchId') id:string){return this.content.proposal(id)}
  @Post(':batchId/load') load(@Param('batchId') id:string,@Body() body:any){return this.content.load(id,body)}
}
