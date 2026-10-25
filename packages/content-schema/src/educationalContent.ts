export type EducationalIssue={severity:'error'|'warning';topicId:string;subtopicId:string;path:string;message:string};
export type CanonicalSubtopic={id:string;title:string;content:Record<string,any>;source:Record<string,any>};
export type CanonicalTopic={id:string;title:string;subtopics:CanonicalSubtopic[]};
export type EducationalImport={topics:CanonicalTopic[];issues:EducationalIssue[]};

const esc=(value:unknown)=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const label=(key:string)=>key.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const scalar=(value:any)=>typeof value==='string'||typeof value==='number'||typeof value==='boolean';
const list=(values:any[])=>`<ul>${values.map(value=>`<li>${scalar(value)?esc(value):renderUnknown(value)}</li>`).join('')}</ul>`;
const renderUnknown=(value:any):string=>{
  if(value==null)return '';
  if(scalar(value))return `<p>${esc(value)}</p>`;
  if(Array.isArray(value))return value.every(scalar)?list(value):value.map(item=>`<div class="content-record">${renderUnknown(item)}</div>`).join('');
  return Object.entries(value).map(([key,item])=>`<section class="content-field"><h4>${esc(label(key))}</h4>${renderUnknown(item)}</section>`).join('');
};
const formula=(value:any)=>`<div class="math-line"><strong>${esc(value).replaceAll('**','')}</strong></div>`;

function renderSection(key:string,value:any):string{
  if(value==null)return '';
  if(key==='what_is_this_pattern'){
    const rows=(value.recognition_explained||[]).map((row:any)=>`<tr><td>${esc(row.question_clue)}</td><td>${esc(row.what_to_recognise)}</td><td>${esc(row.student_action)}</td></tr>`).join('');
    return `<section class="panel sky"><h2>1. What is this pattern?</h2><p>${esc(value.plain_language_explanation)}</p><h3>Recognise this pattern when</h3>${list(value.recognition_clues||[])}${rows?`<div class="table-scroll"><table><thead><tr><th>Question clue</th><th>What to recognise</th><th>What to do</th></tr></thead><tbody>${rows}</tbody></table></div>`:''}<div class="tip"><strong>Decision rule:</strong> ${esc(value.quick_decision_rule)}</div></section>`;
  }
  if(key==='how_to_use_this_template'){
    const steps=(value.fully_explained_steps||value.step_by_step_method||[]).map((step:any)=>`<div class="step"><div class="step-title"><span class="step-num">${esc(step.step)}</span><strong>${esc(step.instruction||step.action)}</strong></div><div class="step-grid"><div><span class="micro-label">WHY</span><p>${esc(step.why_this_step_matters||step.conceptual_reason)}</p></div><div><span class="micro-label">HOW · CALCULATION</span>${formula(step.how_to_do_it_with_calculation||step.calculation_or_example)}</div></div>${step.watch_out_for?`<div class="watch"><strong>Watch out:</strong> ${esc(step.watch_out_for)}</div>`:''}</div>`).join('');
    const walk=value.complex_walkthrough; const walkthrough=walk?.question?`<h3>Detailed guided walkthrough</h3><div class="question">${esc(walk.question)}</div>${(walk.steps||[]).map((step:any)=>`<div class="calc-step"><strong>${esc(step.step)}. ${esc(step.title)}</strong>${formula(step.calculation)}<p class="why">${esc(step.why)}</p></div>`).join('')}<div class="answer"><strong>Final answer:</strong> ${esc(walk.final_answer)}</div>`:'';
    return `<section class="panel mint"><h2>2. How to use this solving template</h2><p>${esc(value.goal)}</p>${formula(value.essential_formula)}${steps}${walkthrough}</section>`;
  }
  if(key==='three_worked_examples')return `<section class="panel lavender"><h2>3. Three worked examples — different possibilities</h2>${(value||[]).map((example:any)=>`<article class="example"><h3>Example ${esc(example.example_number)}: ${esc(example.possibility)}</h3><div class="question">${esc(example.question)}</div><p><strong>Why this pattern applies:</strong> ${esc(example.why_this_pattern_applies)}</p><p><strong>How to adapt:</strong> ${esc(example.how_to_adapt_the_template)}</p>${(example.step_by_step_solution||[]).map((step:any)=>`<div class="calc-step"><strong>Step ${esc(step.step)}</strong>${formula(step.explanation)}<p class="why">${esc(step.why_this_step)}</p></div>`).join('')}<div class="answer"><strong>Final answer:</strong> ${esc(example.final_answer)}</div></article>`).join('')}</section>`;
  if(key==='possible_variations')return `<section class="panel sky"><h2>4. Possible variations and how to adapt</h2>${(value||[]).map((item:any)=>`<div class="variation"><h3>${esc(item.variation)}</h3><p><strong>Recognise and solve:</strong> ${esc(item.how_to_recognise_and_solve)}</p><p><strong>Template adjustment:</strong> ${esc(item.template_adjustment||item.adaptation_tip)}</p></div>`).join('')}</section>`;
  if(key==='key_points_to_remember')return `<section class="panel mint"><h2>5. Key points to remember</h2>${list(value||[])}</section>`;
  if(key==='common_mistakes_and_how_to_avoid')return `<section class="panel peach"><h2>6. Common mistakes and how to avoid them</h2>${(value||[]).map((item:any)=>`<div class="mistake"><strong>Common mistake:</strong> ${esc(item.mistake)}<p><strong>How to avoid:</strong> ${esc(item.how_to_avoid)}</p><p><strong>Correct habit:</strong> ${esc(item.correct_habit)}</p></div>`).join('')}</section>`;
  if(key==='try_yourself_extended')return `<section class="panel gold"><h2>7. Try yourself</h2><div class="question">${esc(value.question)}</div>${list(value.student_instructions||[])}<p>${esc(value.reflection)}</p><details><summary>Show answer and explanation</summary><p>${esc(value.answer||'See teacher key.')}</p></details></section>`;
  return `<section class="panel generic-section" data-field="${esc(key)}"><h2>${esc(label(key))}</h2>${renderUnknown(value)}</section>`;
}

export function renderEducationalSubtopic(subtopic:CanonicalSubtopic,imageUrl?:string):string{
  const value=subtopic.content,order:Array<string>=value.layout?.section_order||value.teaching_sections||Object.keys(value).filter(key=>!['layout','diagram','page_number','page_marker','start_on_new_page','source_reference'].includes(key));
  const seen=new Set<string>(),sections=order.filter(key=>key in value).map(key=>{seen.add(key);return renderSection(key,value[key])});
  Object.keys(value).filter(key=>!seen.has(key)&&!['layout','diagram','page_number','page_marker','start_on_new_page','source_reference','pattern_id','pattern_title','competency','class_level','subject','chapter','primary_topic_id','primary_topic','associated_topic_ids','subtopic_id','subtopic_name','parent_topic_id','start_subtopic_marker','end_subtopic_marker','teaching_sections','pedagogical_note'].includes(key)).forEach(key=>sections.push(renderSection(key,value[key])));
  const diagram=value.diagram,src=imageUrl||diagram?.data_uri; if(src){const first=sections.findIndex(section=>section.includes('</section>'));const image=`<figure><img src="${esc(src)}" alt="${esc(diagram?.alt_text||subtopic.title)}"><figcaption>${esc(diagram?.alt_text||subtopic.title)}</figcaption></figure>`;if(first>=0)sections[first]=sections[first].replace('</section>',`${image}</section>`)}
  return `<article class="pattern-page edullm-competency-pattern" id="${esc(subtopic.id)}"><header class="hero"><div class="eyebrow">${esc(value.subject||'EDULLM')} · ${esc(value.chapter||'')}</div><div class="pattern-code">${esc(value.pattern_id||subtopic.id)}</div><h1>${esc(subtopic.title)}</h1><p class="subtitle">${esc(value.competency||'')}</p></header>${sections.join('')}<footer>${esc(value.end_reference_topic||value.primary_topic||'')}</footer></article>`;
}
export function renderEducationalPrintable(topic:CanonicalTopic,imageUrls:Record<string,string>={}):string{return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(topic.title)}</title></head><body>${topic.subtopics.map(item=>renderEducationalSubtopic(item,imageUrls[item.id])).join('')}</body></html>`}

export function validateEducationalImport(topic:CanonicalTopic):EducationalIssue[]{
  const issues:EducationalIssue[]=[],ids=new Set<string>();
  topic.subtopics.forEach(sub=>{const base=(path:string,message:string,severity:'error'|'warning'='warning')=>issues.push({severity,topicId:topic.id,subtopicId:sub.id,path,message});if(ids.has(sub.id))base('id','Duplicate subtopic identifier','error');ids.add(sub.id);const c=sub.content;
    for(const key of ['what_is_this_pattern','how_to_use_this_template','three_worked_examples','possible_variations','key_points_to_remember','common_mistakes_and_how_to_avoid','try_yourself_extended'])if(!(key in c))base(key,`Missing educational section ${key}`);
    (c.three_worked_examples||[]).forEach((x:any,i:number)=>{if(!x.question||!x.step_by_step_solution?.length)base(`three_worked_examples.${i}`,'Worked example is empty or has no solution steps')});
    if(c.how_to_use_this_template&&!c.how_to_use_this_template.essential_formula)base('how_to_use_this_template.essential_formula','Formula content is missing');
    const texts=(c.what_is_this_pattern?.recognition_explained||[]).map((x:any)=>x.student_action).filter(Boolean);if(texts.length>1&&new Set(texts).size===1)base('what_is_this_pattern.recognition_explained','Repeated identical “What to do” text across recognition rows');
    if(c.diagram?.file_name&&!c.diagram?.data_uri)base('diagram.file_name',`Image reference ${c.diagram.file_name} needs a matching upload`);
  });return issues;
}

export function importEducationalContent(input:any):EducationalImport{
  const issues:EducationalIssue[]=[],patterns=new Map((input.patterns||[]).map((item:any)=>[String(item.pattern_id||item.subtopic_id),item]));
  const topicMeta=input.topic||{},blocks=input.content_blocks||[];let subtopics:CanonicalSubtopic[]=[];
  const contentBlocks=blocks.filter((block:any)=>block.type==='SUBTOPIC_CONTENT');
  if(contentBlocks.length)subtopics=contentBlocks.map((block:any)=>{const source:any=block.content||patterns.get(String(block.pattern_id||block.subtopic_id))||{};return{id:String(block.subtopic_id||source.subtopic_id||source.pattern_id),title:String(source.subtopic_name||source.pattern_title||block.subtopic_name||'Untitled subtopic'),content:source,source:block}});
  else subtopics=(input.subtopics||input.patterns||[]).map((source:any)=>({id:String(source.subtopic_id||source.pattern_id||source.id),title:String(source.subtopic_name||source.pattern_title||source.title||'Untitled subtopic'),content:source.content||source,source}));
  const topic={id:String(topicMeta.topic_id||input.topic_id||input.id||'imported-topic'),title:String(topicMeta.topic_name||input.topic_name||input.title||'Imported Content'),subtopics};issues.push(...validateEducationalImport(topic));return{topics:[topic],issues};
}
