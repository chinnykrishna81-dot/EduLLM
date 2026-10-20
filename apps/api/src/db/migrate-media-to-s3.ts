import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {pool,query} from './database';
import {MediaStorageService} from '../media/media-storage.service';

const uploadRoot=resolve(process.env.STORAGE_DIR||'/app/storage/uploads');
const storage=new MediaStorageService();

async function main(){
  if(!storage.isS3())throw new Error('S3 media storage is not fully configured');
  await query(`ALTER TABLE media_asset ADD COLUMN IF NOT EXISTS folder_type VARCHAR(30),ADD COLUMN IF NOT EXISTS folder_ref_id TEXT,ADD COLUMN IF NOT EXISTS folder_label TEXT,ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(20) NOT NULL DEFAULT 'local',ADD COLUMN IF NOT EXISTS object_key TEXT,ADD COLUMN IF NOT EXISTS original_object_key TEXT,ADD COLUMN IF NOT EXISTS checksum TEXT,ADD COLUMN IF NOT EXISTS width INTEGER,ADD COLUMN IF NOT EXISTS height INTEGER,ADD COLUMN IF NOT EXISTS migrated_at TIMESTAMPTZ`);
  const assets=await query(`SELECT * FROM media_asset WHERE COALESCE(storage_provider,'local')<>'s3' ORDER BY created_at`);
  let copied=0,embedded=0;
  for(const row of assets.rows){
    const file:any={path:resolve(uploadRoot,row.stored_name),filename:row.stored_name,originalname:row.original_name,mimetype:row.mime_type,size:Number(row.byte_size)};
    const saved=await storage.store(file,{chapterId:row.chapter_id,folderType:row.folder_type||'unassigned',folderRefId:row.folder_ref_id||'',mediaId:row.media_id},true);
    await query(`UPDATE media_asset SET storage_provider='s3',object_key=$2,original_object_key=$3,mime_type=$4,byte_size=$5,checksum=$6,width=$7,height=$8,migrated_at=now() WHERE media_id=$1`,[row.media_id,saved.objectKey,saved.originalObjectKey,saved.mimeType,saved.byteSize,saved.checksum,saved.width,saved.height]);copied++;
  }
  const chapters=await query(`SELECT chapter_id,content,package FROM chapter_library WHERE content::text LIKE '%data:image/%'`);
  for(const chapter of chapters.rows){
    let json=JSON.stringify(chapter.content),packageJson=chapter.package?JSON.stringify(chapter.package):null;
    const matches=[...new Set(json.match(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/gi)||[])];
    for(const dataUri of matches){
      const match=/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUri);if(!match)continue;
      const mime=match[1],buffer=Buffer.from(match[2],'base64'),extension=mime==='image/jpeg'?'.jpg':mime==='image/svg+xml'?'.svg':`.${mime.split('/')[1]}`,mediaId=randomUUID(),fileName=`embedded-${mediaId}${extension}`;
      const saved=await storage.storeBuffer(buffer,fileName,mime,{chapterId:chapter.chapter_id,folderType:'topic',folderRefId:'embedded',mediaId});
      await query(`INSERT INTO media_asset(media_id,chapter_id,original_name,stored_name,mime_type,byte_size,title,caption,alt_text,folder_type,folder_ref_id,folder_label,storage_provider,object_key,original_object_key,checksum,width,height,migrated_at) VALUES($1,$2,$3,$4,$5,$6,$7,'',$8,'topic','embedded','Embedded concept images','s3',$9,$10,$11,$12,$13,now())`,[mediaId,chapter.chapter_id,fileName,saved.storedName,saved.mimeType,saved.byteSize,fileName,fileName,saved.objectKey,saved.originalObjectKey,saved.checksum,saved.width,saved.height]);
      json=json.split(dataUri).join(saved.url);if(packageJson)packageJson=packageJson.split(dataUri).join(saved.url);embedded++;
    }
    await query(`UPDATE chapter_library SET content=$2::jsonb,package=$3::jsonb,updated_at=now() WHERE chapter_id=$1`,[chapter.chapter_id,json,packageJson]);
  }
  const totals=await query(`SELECT storage_provider,count(*)::int count FROM media_asset GROUP BY storage_provider ORDER BY storage_provider`);
  console.log(JSON.stringify({copied,embedded,totals:totals.rows}));
}
main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1}).finally(()=>pool.end());
