import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { PDFParse } from '/tmp/edullm-pdf-audit/node_modules/pdf-parse/dist/pdf-parse/esm/index.js';

const sourceRoot='cbse-10-science/06-previous-board-papers';
const auditRoot=join(sourceRoot,'04-deep-audit');
const roots=[join(sourceRoot,'01-source-batches-year-unverified'),join(sourceRoot,'02-hindi-excluded-from-english-pilot')];
const chapterTerms=/chemical reaction|chemical equation|oxid(?:ation|ised|ized)|reduc(?:tion|ed)|decomposition|displacement|precipitat|corrosion|rancid|magnesium|ferrous sulphate|lead nitrate|silver chloride|silver bromide|copper sulphate|barium sulphate|electrolysis of water|quicklime|slaked lime/gi;

const walk=async dir=>(await readdir(dir,{withFileTypes:true})).flatMap(()=>[]); // replaced below to keep recursion explicit
async function pdfs(dir){const output=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())output.push(...await pdfs(path));else if(/\.pdf$/i.test(entry.name))output.push(path)}return output}
const normal=value=>String(value||'').replace(/\s+/g,' ').trim();
const csv=value=>`"${String(value??'').replaceAll('"','""')}"`;
const inferType=(path,text)=>/marking scheme|\bms\b|model answer/i.test(`${path} ${text.slice(0,2500)}`)?'marking_scheme':'question_paper';
const inferFormat=(path,text)=>/visually impaired|blind candidate/i.test(text.slice(0,3000))||/(?:blind|visually impaired|for[ _-]?vi|31[_. -]?b(?:[_ .-]|$))/i.test(basename(path))?'accessibility':'standard';
const inferLanguage=path=>path.includes('02-hindi-excluded')?'Hindi':'English_or_bilingual';
const findCode=text=>normal((text.match(/(?:Q\.?P\.?\s*Code|Question Paper Code)[\s\S]{0,100}?((?:31|086)[\s/_-]*[A-Z0-9][\s/_-]*[A-Z0-9](?:[\s/_-]*[A-Z0-9])?)/i)||text.match(/\b(31[\/_-][A-Z0-9][\/_-][A-Z0-9])\b/i)||[])[1]).replaceAll(' ','');
const explicitYears=text=>[...new Set((text.match(/\b20(?:20|21|22|23|24|25|26)(?:\s*[-–]\s*\d{2})?\b/g)||[]))];
const metadataYear=value=>(String(value||'').match(/D:(20\d{2})/)||[])[1]||'';
function snippets(text){const blocks=text.split(/\n\s*\n|(?=\n\s*\d{1,2}[.)]\s+)/).map(normal).filter(Boolean),hits=[];for(const block of blocks){chapterTerms.lastIndex=0;if(chapterTerms.test(block)){hits.push(block.slice(0,1800))}}return [...new Set(hits)].slice(0,40)}

await mkdir(auditRoot,{recursive:true});
const documents=[];
for(const path of (await Promise.all(roots.map(pdfs))).flat().sort()){
  const bytes=await readFile(path),sha256=createHash('sha256').update(bytes).digest('hex');
  let text='',info={},error='';
  try{const textParser=new PDFParse({data:bytes});const textResult=await textParser.getText();text=textResult.text||'';await textParser.destroy();const infoParser=new PDFParse({data:bytes});const infoResult=await infoParser.getInfo();info=infoResult.info||{};await infoParser.destroy()}catch(reason){error=String(reason?.message||reason)}
  const rel=relative(sourceRoot,path),years=explicitYears(text.slice(0,12000)),created=metadataYear(info.CreationDate),questionSnippets=snippets(text);
  documents.push({relativePath:rel,fileName:basename(path),sha256,documentType:inferType(path,text),candidateFormat:inferFormat(path,text),language:inferLanguage(path),paperCode:findCode(text.slice(0,10000)),explicitYearCandidates:years,metadataCreationYear:created,yearStatus:years.length===1?'text_candidate':'unverified',verifiedExamYear:'',pairStatus:'unpaired',pairedDocument:'',textExtractable:text.length>500,chapterCandidateCount:questionSnippets.length,chapterCandidates:questionSnippets,error});
}
await writeFile(join(auditRoot,'document-audit.json'),JSON.stringify({generatedAt:new Date().toISOString(),rule:'No year is verified from file metadata alone. verifiedExamYear stays blank until corroborated by document text/code and pairing.',documents},null,2));
const header=['relative_path','sha256','document_type','candidate_format','language','paper_code','explicit_year_candidates','metadata_creation_year','year_status','verified_exam_year','pair_status','paired_document','text_extractable','chapter_candidate_count','error'];
const rows=documents.map(d=>[d.relativePath,d.sha256,d.documentType,d.candidateFormat,d.language,d.paperCode,d.explicitYearCandidates.join('|'),d.metadataCreationYear,d.yearStatus,d.verifiedExamYear,d.pairStatus,d.pairedDocument,d.textExtractable,d.chapterCandidateCount,d.error].map(csv).join(','));
await writeFile(join(auditRoot,'document-audit.csv'),[header.join(','),...rows].join('\n')+'\n');
const candidates=documents.flatMap(d=>d.chapterCandidates.map((text,index)=>({document:d.relativePath,paperCode:d.paperCode,documentType:d.documentType,candidateFormat:d.candidateFormat,verifiedExamYear:d.verifiedExamYear,candidateNumber:index+1,text,status:'candidate_needs_human_verification',currentSyllabusMapping:'',uniquePatternId:'',marks:''})));
await writeFile(join(auditRoot,'chapter-question-candidates.json'),JSON.stringify({generatedAt:new Date().toISOString(),candidates},null,2));
console.log(JSON.stringify({documents:documents.length,questionPapers:documents.filter(d=>d.documentType==='question_paper').length,markingSchemes:documents.filter(d=>d.documentType==='marking_scheme').length,standard:documents.filter(d=>d.candidateFormat==='standard').length,accessibility:documents.filter(d=>d.candidateFormat==='accessibility').length,textExtractable:documents.filter(d=>d.textExtractable).length,chapterCandidates:candidates.length},null,2));
