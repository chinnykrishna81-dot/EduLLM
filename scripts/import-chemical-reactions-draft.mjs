import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const api=process.env.EDULLM_API_URL||'http://127.0.0.1:3001/api';
const email=process.env.EDULLM_ADMIN_EMAIL||'admin@edullm.local';
const password=process.env.EDULLM_ADMIN_PASSWORD||'Admin@123';
const root='content-packages/cbse-10-science/chemical-reactions-and-equations';
const call=async(path,options={})=>{const response=await fetch(`${api}${path}`,options);const payload=await response.json().catch(()=>({}));if(!response.ok)throw new Error(`${response.status} ${JSON.stringify(payload)}`);return payload};
const login=await call('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password})});
const headers={authorization:`Bearer ${login.token}`,'content-type':'application/json'};
const chapter=JSON.parse(await readFile(join(root,'chapter.json'),'utf8'));
const cycle=JSON.parse(await readFile(join(root,'cycle-test.json'),'utf8'));
const imported=await call('/library/chapter-packages/import',{method:'POST',headers,body:JSON.stringify(chapter)});
const id=imported.chapter.id;
await call(`/library/chapters/${id}/cycle-test`,{method:'PUT',headers,body:JSON.stringify(cycle)});
const form=new FormData();
for(const name of await readdir(join(root,'media'))){if(!name.endsWith('.svg'))continue;const bytes=await readFile(join(root,'media',name));form.append('files',new Blob([bytes],{type:'image/svg+xml'}),basename(name));}
await call(`/library/chapters/${id}/media`,{method:'POST',headers:{authorization:`Bearer ${login.token}`},body:form});
const saved=await call(`/library/chapters/${id}`,{headers:{authorization:`Bearer ${login.token}`}});
console.log(JSON.stringify({id:saved.id,title:saved.title,status:saved.status,version:saved.version,topics:saved.content.topics.length,questionBank:saved.cycleTest.questionBank.length,forms:saved.cycleTest.forms.length,media:chapter.mediaManifest.length},null,2));
