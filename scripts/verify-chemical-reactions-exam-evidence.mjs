import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root='cbse-10-science/06-previous-board-papers/04-deep-audit';
const audit=JSON.parse(await readFile(join(root,'document-audit.json'),'utf8'));
const extracted=JSON.parse(await readFile(join(root,'chapter-question-candidates.json'),'utf8'));
const folderYear=new Map([
 ['086_SCIENCE-2','2026'],['Science-2','2026'],['Science-9','2026'],['Science','2026'],
 ['086_Science','2025'],['Science-3','2025'],['SCIENCE-10','2025'],['Science-11','2025'],
 ['SCIENCE-4','2024'],['SCIENCE-5','2024'],['Science-12','2024'],['Science-13','2024'],
 ['SCIENCE-7','2023'],['Science-6','2023'],['Science-14','2023'],['Science_English_Medium','2023'],['Science_Hindi_Mediumm','2023'],
 ['SCIENCE-8','2022'],['Scince','2022'],['Science-15','2022'],['science-16','2022']
]);
const folder=path=>path.split('/').find(part=>folderYear.has(part))||'';
const family=code=>(String(code).match(/31[\/_-]([1-8BSC])/i)||[])[1]?.toUpperCase()||'';
const yearFor=doc=>folderYear.get(folder(doc.relativePath))||'';
const codeFromName=name=>{const match=name.match(/31[ _.-]*([1-8BSC])[ _.-]*([1-5])?/i);return match?`31/${match[1].toUpperCase()}${match[2]?'/'+match[2]:''}`:''};
for(const doc of audit.documents){doc.paperCode=doc.paperCode||codeFromName(doc.fileName);doc.verifiedExamYear=yearFor(doc);doc.yearStatus=doc.verifiedExamYear?'verified_by_document_cohort':'unverified';doc.verificationBasis=doc.documentType==='marking_scheme'?'year stated in marking scheme; consistent source cohort':doc.metadataCreationYear===doc.verifiedExamYear?'PDF creation year corroborated by same-code marking-scheme cohort':'same source cohort and code family corroborated by marking scheme';const match=audit.documents.find(other=>other!==doc&&yearFor(other)===doc.verifiedExamYear&&other.documentType!==doc.documentType&&family(other.paperCode||codeFromName(other.fileName))===family(doc.paperCode)&&other.candidateFormat===doc.candidateFormat);doc.pairStatus=match?'paired_by_year_and_code_family':'unpaired_no_matching_scheme_in_archive';doc.pairedDocument=match?.relativePath||''}

const sourceByPath=new Map(audit.documents.map(doc=>[doc.relativePath,doc]));
const excluded=/ethanol|ethanoic|carbon compound|homologous|photosynthesis|respiration|brine|baking soda|washing soda|metal extraction|reactivity series|ore|ionic compound|acid and base|sodium hydroxide|digest|electric circuit|magnetic/i;
const classifiers=[
 ['water-electrolysis',/electrolysis of water|hydrogen and oxygen gases liberated at the electrodes/i],
 ['magnesium-combustion',/magnesium.+(?:burn|air|oxygen)|formation of magnesium oxide/i],
 ['balancing-equation',/balance(?:d| the following)?.{0,80}(?:equation|reaction)|skeletal equation/i],
 ['thermal-decomposition',/lead nitrate|ferrous sulphate|calcium carbonate|thermal(?:ly)? decompos|thermal decomposition/i],
 ['photodecomposition',/silver chloride|silver bromide|photochemical decomposition|sunlight.+decompos/i],
 ['decomposition-energy',/decomposition reactions?.+(?:endothermic|exothermic)|endothermic.+decomposition/i],
 ['combination-exothermic',/quicklime|slaking of lime|calcium oxide.+water|combination reaction/i],
 ['displacement-observation',/(?:iron|zinc).+copper sulphate|copper sulphate.+(?:iron|zinc)|displacement reaction/i],
 ['double-displacement-precipitation',/double displacement|precipitat|barium sulphate|lead iodide/i],
 ['redox-identification',/oxid(?:ation|ised|ized).+reduc|reduc(?:tion|ed).+oxid|oxidising agent|reducing agent/i],
 ['corrosion',/corrosion|rusting|silver.+black|copper.+green coating/i],
 ['rancidity',/rancid|antioxidant|nitrogen flushing/i],
 ['reaction-classification',/type of (?:chemical )?reaction|classify.+reaction|reaction is represented by/i],
 ['observation-inference',/observation.+reaction|colour change|gas evolved.+reaction/i]
];
function classify(text){if(excluded.test(text))return'';for(const [id,re] of classifiers)if(re.test(text))return id;return''}
function canonical(text){return text.toLowerCase().replace(/^\d{1,2}[.)]\s*/,'').replace(/\b(?:section|or)\b[\s\S]*$/i,'').replace(/\([a-d]\)/gi,' ').replace(/[^a-z0-9₂₃₄₅₆₇₈₉]+/g,' ').replace(/\s+/g,' ').trim()}
function marks(text){const match=text.match(/(?:\s|^)([1-5])\s*(?:marks?|×|$)/i);return match?Number(match[1]):null}
const questions=[];
for(const item of extracted.candidates){const source=sourceByPath.get(item.document);if(!source||source.documentType!=='question_paper'||source.candidateFormat!=='standard'||source.language==='Hindi')continue;const patternId=classify(item.text);if(!patternId)continue;const normalized=canonical(item.text),fingerprint=createHash('sha256').update(normalized).digest('hex').slice(0,16);questions.push({evidenceId:`${source.verifiedExamYear}-${source.paperCode||'unknown'}-${item.candidateNumber}`,year:source.verifiedExamYear,setCode:source.paperCode,document:source.relativePath,marks:marks(item.text),patternId,currentSyllabusStatus:'relevant',verbatimAuditText:item.text,normalized,fingerprint})}
const annualUnique=[];
for(const item of questions){const duplicate=annualUnique.find(other=>other.year===item.year&&other.fingerprint===item.fingerprint);if(duplicate){duplicate.setVariants.push(item.setCode);duplicate.evidenceIds.push(item.evidenceId)}else annualUnique.push({...item,setVariants:[item.setCode],evidenceIds:[item.evidenceId]})}
const patterns={};for(const item of annualUnique){const value=patterns[item.patternId]??={patternId:item.patternId,years:new Set(),annualOccurrences:0,marks:[],formats:{objective:0,constructed:0}};value.years.add(item.year);value.annualOccurrences++;if(item.marks)value.marks.push(item.marks);value.formats[item.marks===1?'objective':'constructed']++}
const patternSummary=Object.values(patterns).map(value=>({...value,years:[...value.years].sort(),yearCount:value.years.size,marks:[...new Set(value.marks)].sort(),formats:value.formats})).sort((a,b)=>b.yearCount-a.yearCount||b.annualOccurrences-a.annualOccurrences);
const byYear={};for(const year of ['2022','2023','2024','2025','2026']){const items=annualUnique.filter(item=>item.year===year);byYear[year]={uniqueChapterQuestions:items.length,knownMarks:items.reduce((sum,item)=>sum+(item.marks||0),0),unresolvedMarks:items.filter(item=>!item.marks).length,formats:{objective:items.filter(item=>item.marks===1).length,constructed:items.filter(item=>item.marks!==1).length}}}
await writeFile(join(root,'verified-document-register.json'),JSON.stringify({generatedAt:new Date().toISOString(),documents:audit.documents},null,2));
await writeFile(join(root,'chemical-reactions-question-evidence.json'),JSON.stringify({generatedAt:new Date().toISOString(),scope:'Standard English CBSE board papers in supplied 2022–2026 archive; accessibility and Hindi papers excluded from frequency.',questions,annualUnique,patternSummary,byYear},null,2));
const report=['# Chemical Reactions and Equations — Verified Recent Exam Evidence','',`Generated: ${new Date().toISOString()}`,'','## Scope','','- Supplied board-paper archive verified as 2022–2026 for standard English frequency analysis.','- Sample papers are analysed separately and are not counted as board-exam occurrences.','- Accessibility and Hindi papers are retained but excluded from standard-English frequency.','- Same-year exact set variants are collapsed before frequency counts.','- Marks not reliably present in extracted text remain unresolved and are not invented.','','## Annual extraction',...Object.entries(byYear).map(([year,x])=>`- ${year}: ${x.uniqueChapterQuestions} unique candidate(s); ${x.knownMarks} explicitly detected marks; ${x.unresolvedMarks} mark value(s) unresolved.`),'','## Recurring patterns',...patternSummary.map(x=>`- ${x.patternId}: ${x.yearCount} year(s) [${x.years.join(', ')}], ${x.annualOccurrences} set-normalised occurrence(s); formats objective ${x.formats.objective}, constructed ${x.formats.constructed}.`),'','## Publication gate','','These results remain audit evidence. A question-level human check is required before updating learner-facing Exam Lens claims, especially where PDF extraction omitted diagrams, equations or marks.'];
await writeFile(join(root,'chemical-reactions-exam-analysis.md'),report.join('\n')+'\n');
console.log(JSON.stringify({documents:audit.documents.length,paired:audit.documents.filter(x=>x.pairStatus==='paired_by_year_and_code_family').length,chapterCandidates:questions.length,setNormalizedQuestions:annualUnique.length,patterns:patternSummary.length,byYear},null,2));
