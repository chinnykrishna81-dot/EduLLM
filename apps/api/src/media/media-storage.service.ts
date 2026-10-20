import {createHash} from 'node:crypto';
import {readFile,unlink} from 'node:fs/promises';
import {extname} from 'node:path';
import {Injectable} from '@nestjs/common';
import {DeleteObjectCommand,PutObjectCommand,S3Client} from '@aws-sdk/client-s3';
import sharp from 'sharp';

const safe=(value:string)=>String(value||'item').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/(^-|-$)/g,'').slice(0,100)||'item';

@Injectable()
export class MediaStorageService{
  readonly driver=process.env.MEDIA_STORAGE_DRIVER||'local';
  readonly bucket=process.env.MEDIA_S3_BUCKET||'';
  readonly cdnOrigin=String(process.env.MEDIA_CDN_ORIGIN||'').replace(/\/$/,'');
  private readonly s3=this.driver==='s3'?new S3Client({region:process.env.AWS_REGION||'ap-south-1'}):null;

  isS3(){return this.driver==='s3'&&!!this.s3&&!!this.bucket&&!!this.cdnOrigin}
  url(row:any){if(row?.storage_provider==='s3'&&row?.object_key)return `${this.cdnOrigin}/${String(row.object_key).split('/').map(encodeURIComponent).join('/')}`;return `/uploads/${row?.stored_name}`}
  key(chapterId:string,folderType:string,folderRefId:string,mediaId:string,name:string,variant='content'){
    const extension=extname(name).toLowerCase()||'.bin';
    return `edullm/chapters/${safe(chapterId)}/${safe(folderType||'unassigned')}/${safe(folderRefId||'general')}/${safe(mediaId)}/${variant}${extension}`;
  }
  async store(file:Express.Multer.File,keyBase:{chapterId:string;folderType?:string;folderRefId?:string;mediaId:string},preserveSource=false){
    if(!this.isS3())return {storageProvider:'local',storedName:file.filename,objectKey:null,originalObjectKey:null,mimeType:file.mimetype,byteSize:file.size,checksum:null,width:null,height:null,url:`/uploads/${file.filename}`};
    const source=await readFile(file.path),checksum=createHash('sha256').update(source).digest('hex'),originalKey=this.key(keyBase.chapterId,keyBase.folderType||'unassigned',keyBase.folderRefId||'',keyBase.mediaId,file.originalname,'original');
    let content=source,mimeType=file.mimetype,name=file.originalname,width:number|undefined,height:number|undefined;
    const optimized=['image/png','image/jpeg','image/webp','image/avif'].includes(file.mimetype);
    if(optimized){
      const image=sharp(source,{animated:false}).rotate(),metadata=await image.metadata();width=metadata.width;height=metadata.height;
      content=await image.resize({width:1600,withoutEnlargement:true}).webp({quality:84,effort:4}).toBuffer();mimeType='image/webp';name=`${file.originalname.replace(/\.[^.]+$/,'')}.webp`;
    }
    const objectKey=optimized?this.key(keyBase.chapterId,keyBase.folderType||'unassigned',keyBase.folderRefId||'',keyBase.mediaId,name,'content'):originalKey;
    const cache='public, max-age=31536000, immutable';
    await this.s3!.send(new PutObjectCommand({Bucket:this.bucket,Key:originalKey,Body:source,ContentType:file.mimetype,CacheControl:cache,Metadata:{checksum}}));
    if(objectKey!==originalKey)await this.s3!.send(new PutObjectCommand({Bucket:this.bucket,Key:objectKey,Body:content,ContentType:mimeType,CacheControl:cache,Metadata:{checksum}}));
    if(!preserveSource)await unlink(file.path).catch(()=>undefined);
    return {storageProvider:'s3',storedName:file.filename,objectKey,originalObjectKey:originalKey,mimeType,byteSize:content.length,checksum,width:width||null,height:height||null,url:this.url({storage_provider:'s3',object_key:objectKey})};
  }
  async storeBuffer(buffer:Buffer,fileName:string,mimeType:string,keyBase:{chapterId:string;folderType?:string;folderRefId?:string;mediaId:string}){
    const tempFile:any={path:'',filename:`embedded-${keyBase.mediaId}${extname(fileName)||'.bin'}`,originalname:fileName,mimetype:mimeType,size:buffer.length};
    if(!this.isS3())throw new Error('S3 media storage is not configured');
    const checksum=createHash('sha256').update(buffer).digest('hex'),originalKey=this.key(keyBase.chapterId,keyBase.folderType||'unassigned',keyBase.folderRefId||'',keyBase.mediaId,fileName,'original');
    let content=buffer,contentType=mimeType,name=fileName,width:number|undefined,height:number|undefined;
    const optimized=['image/png','image/jpeg','image/webp','image/avif'].includes(mimeType);
    if(optimized){const image=sharp(buffer,{animated:false}).rotate(),metadata=await image.metadata();width=metadata.width;height=metadata.height;content=await image.resize({width:1600,withoutEnlargement:true}).webp({quality:84,effort:4}).toBuffer();contentType='image/webp';name=`${fileName.replace(/\.[^.]+$/,'')}.webp`}
    const objectKey=optimized?this.key(keyBase.chapterId,keyBase.folderType||'unassigned',keyBase.folderRefId||'',keyBase.mediaId,name,'content'):originalKey,cache='public, max-age=31536000, immutable';
    await this.s3!.send(new PutObjectCommand({Bucket:this.bucket,Key:originalKey,Body:buffer,ContentType:mimeType,CacheControl:cache,Metadata:{checksum}}));
    if(objectKey!==originalKey)await this.s3!.send(new PutObjectCommand({Bucket:this.bucket,Key:objectKey,Body:content,ContentType:contentType,CacheControl:cache,Metadata:{checksum}}));
    return {storageProvider:'s3',storedName:tempFile.filename,objectKey,originalObjectKey:originalKey,mimeType:contentType,byteSize:content.length,checksum,width:width||null,height:height||null,url:this.url({storage_provider:'s3',object_key:objectKey})};
  }
  async delete(row:any){if(this.isS3()&&row.storage_provider==='s3'){for(const key of new Set([row.object_key,row.original_object_key].filter(Boolean)))await this.s3!.send(new DeleteObjectCommand({Bucket:this.bucket,Key:String(key)}));return}if(row?.path)await unlink(row.path).catch(()=>undefined)}
}
