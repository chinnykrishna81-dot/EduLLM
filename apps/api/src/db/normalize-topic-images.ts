import 'reflect-metadata';
import {randomUUID} from 'node:crypto';
import {ChapterSchema} from '@edullm/content-schema';
import {pool,query} from './database';

const imageTag=/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const altFrom=(tag:string)=>/\balt=["']([^"']*)["']/i.exec(tag)?.[1]||'';

async function main(){
  const chapterId=String(process.env.NORMALIZE_CHAPTER_ID||'').trim();
  if(!/^[a-f0-9-]{36}$/i.test(chapterId))throw new Error('NORMALIZE_CHAPTER_ID is required');
  const result=await query(`SELECT title,version,content,package FROM chapter_library WHERE chapter_id=$1`,[chapterId]);
  if(!result.rowCount)throw new Error('Chapter not found');
  const row=result.rows[0],content=structuredClone(row.content);let converted=0;
  for(const topic of content.topics||[])for(const page of topic.introductionPages||[]){
    const blocks:any[]=[];
    for(const block of page.blocks||[]){
      if(block.type!=='text'||typeof block.content!=='string'){blocks.push(block);continue}
      let cursor=0,match:RegExpExecArray|null;imageTag.lastIndex=0;
      while((match=imageTag.exec(block.content))){
        const before=block.content.slice(cursor,match.index).trim();
        if(before)blocks.push({...block,id:randomUUID(),content:before});
        blocks.push({id:randomUUID(),type:'image-inline',src:match[1],altText:altFrom(match[0]),caption:''});
        converted++;cursor=match.index+match[0].length;
      }
      const after=block.content.slice(cursor).trim();
      if(after||cursor===0)blocks.push(cursor?{...block,id:randomUUID(),content:after}:block);
    }
    page.blocks=blocks;
  }
  if(!converted){console.log(JSON.stringify({chapterId,converted:0,message:'No topic introduction images required normalization'}));return}
  const parsed=ChapterSchema.safeParse(content);if(!parsed.success)throw new Error(`Normalized chapter failed validation: ${JSON.stringify(parsed.error.issues)}`);
  const packageValue=row.package?{...row.package,content:parsed.data}:null;
  await query(`UPDATE chapter_library SET content=$2::jsonb,package=$3::jsonb,status='draft',version=version+1,approved_at=NULL,updated_at=now() WHERE chapter_id=$1`,[chapterId,JSON.stringify(parsed.data),packageValue?JSON.stringify(packageValue):null]);
  console.log(JSON.stringify({chapterId,title:row.title,previousVersion:row.version,newVersion:row.version+1,converted}));
}

main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1}).finally(()=>pool.end());
