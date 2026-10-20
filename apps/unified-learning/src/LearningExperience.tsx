import {useEffect,useMemo,useRef,useState,type DragEvent} from 'react';
import {chapterLearningPages} from '@edullm/content-schema';
import './learning-experience.css';
import './navigation-cleanup.css';
import {shuffleForStudent} from './studentShuffle';
import {CycleTestExperience} from './CycleTestExperience';

const API=import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3001';
const statusKey=(chapterId:string)=>`edullm-progress:${chapterId}`;
type Progress={opened:string[];pageCompleted:string[];completed:string[];resourcesOpened:string[];verified:boolean;mastery:Record<string,'green'|'yellow'|'orange'>;cykRevealed:string[];cycleStartedAt?:string;cycleSubmittedAt?:string;cycleAttempt?:number};
type CykState='green'|'yellow'|'grey';
const blank=():Progress=>({opened:[],pageCompleted:[],completed:[],resourcesOpened:[],verified:false,mastery:{},cykRevealed:[]});
const readProgress=(id:string):Progress=>{try{return {...blank(),...JSON.parse(localStorage.getItem(statusKey(id))||'{}')}}catch{return blank()}};

export function SubjectLearning({subject,back}:{subject:any;back:()=>void}){
  const [chapter,setChapter]=useState<any>();
  if(chapter)return <ChapterLearning subject={subject} chapter={chapter} back={()=>setChapter(undefined)}/>;
  return <main className="sap-subject-shell"><header className="sap-subject-head"><button onClick={back}>← Course</button><div><small>PROGRESSIVE SYLLABUS</small><h1>{subject.title}</h1><p>{subject.board} · Class {subject.grade}</p></div><StatusLegend/></header><section className="sap-folder-list">{subject.units.map((unit:any)=><details open className="sap-unit" key={unit.id}><summary><span>{unit.title}</span><small>{unit.chapters.length} chapter(s)</small></summary>{unit.chapters.map((item:any)=><ChapterFolder chapter={item} open={()=>setChapter(item)} key={item.id}/>)}</details>)}</section></main>
}

function ChapterFolder({chapter,open}:{chapter:any;open:()=>void}){
  const progress=readProgress(chapter.id),pages=chapter.content?chapterLearningPages(chapter.content):chapter.topicItems||[],groups=groupTopics(pages);
  return <details className="sap-chapter-folder"><summary><StatusBox state={progress.verified?'blue':'empty'}/><span><b>{chapter.position}. {chapter.title}</b><small>{groups.length} topic(s)</small></span><i>⌄</i></summary><div>{groups.map((group:any)=>{const complete=topicComplete(group,progress),state=complete?(progress.mastery[group.id]||'blue'):group.pages.some((page:any)=>progress.opened.includes(page.id))?'active':'empty';return <button className="sap-topic-row" onClick={open} key={group.id}><StatusBox state={state}/><span><b>{group.title}</b><small>{group.subtopics.filter((item:any)=>!item.introduction).length} subtopic(s)</small></span><strong>Open ›</strong></button>})}<button className="open-chapter" onClick={open}>Open Chapter</button></div></details>
}

export function ChapterLearning({subject,chapter,back,externalPractice}:{subject:any;chapter:any;back:()=>void;externalPractice?:any}){
  const pages=chapterLearningPages(chapter.content||{topics:[]}) as any[],groups=groupTopics(pages),cp=chapter.content?.chapterPractice,sn=chapter.content?.smartNotes,kg=chapter.content?.knowledgeGraph,initial=useMemo(()=>readProgress(chapter.id),[chapter.id]);
  const cpHasQuestions=((cp?.type1Questions?.length||0)+(cp?.type2Questions?.length||0))>0;
  const [apiPractice,setApiPractice]=useState<any>(null);
  const initMax=useMemo(()=>{
    if(initial.verified)return pages.length+5;
    const topicIds=[...new Set(pages.map((p:any)=>p.topicId))];
    let end=0;
    for(let ti=0;ti<topicIds.length;ti++){
      if(ti===0||initial.completed.includes(topicIds[ti-1])){
        const last=pages.reduce((l:number,pg:any,i:number)=>pg.topicId===topicIds[ti]?i:l,-1);
        if(last>=0)end=last+1;
      }else break;
    }
    return Math.max(1,end);
  },[chapter.id]);
  const [cur,setCur]=useState(()=>{if(!pages.length)return 0;const lastId=[...initial.opened].reverse().find(id=>pages.some((p:any)=>p.id===id));return lastId?Math.max(0,pages.findIndex((p:any)=>p.id===lastId)):0;});
  const [extra,setExtra]=useState<'smart'|'graph'|'practice'|'completion'|null>(null);
  const [practiceIndex,setPracticeIndex]=useState(0);
  const [practiceFilter,setPracticeFilter]=useState<'all'|'type1'|'type2'|'tagged'>('all');
  const [openPracticeFolder,setOpenPracticeFolder]=useState<'type1'|'type2'|null>(null);
  const [tagged,setTagged]=useState<Set<string>>(()=>{try{return new Set(JSON.parse(localStorage.getItem(`edullm-tagged:${chapter.id}`)||'[]'))}catch{return new Set<string>()}});
  const [progress,setProgress]=useState<Progress>(initial);
  const [cykStatus,setCykStatus]=useState<Record<string,CykState>>({});
  const [media,setMedia]=useState<any[]>([]);
  const activeNavRef=useRef<HTMLElement|null>(null);
  const mainRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{fetch(`${API}/api/catalogue/chapters/${chapter.id}/media`).then(r=>r.ok?r.json():[]).then(setMedia).catch(()=>setMedia([]))},[chapter.id]);
  useEffect(()=>{
    if(extra!=='practice'||externalPractice!==undefined||cpHasQuestions)return;
    fetch(`${API}/api/catalogue/chapters/${chapter.id}/assessment`)
      .then(r=>r.ok?r.json():{questions:[]}).then((result:any)=>{
        const qs=Array.isArray(result)?result:(result.questions||[]);
        setApiPractice({title:'Chapter Practice',instructions:'Practice questions · no marks · immediate feedback',type1Questions:qs.filter((q:any)=>q.type!=='type2'),type2Questions:qs.filter((q:any)=>q.type==='type2')});
      }).catch(()=>{});
  },[chapter.id,cpHasQuestions,externalPractice,extra]);
  useEffect(()=>{localStorage.setItem(statusKey(chapter.id),JSON.stringify(progress))},[chapter.id,progress]);
  useEffect(()=>{
    const page=pages[cur];
    if(!page)return;
    setProgress(p=>p.opened.includes(page.id)?p:{...p,opened:[...p.opened,page.id]});
    mainRef.current?.scrollTo({top:0,behavior:'instant' as ScrollBehavior});
    setTimeout(()=>activeNavRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}),120);
  },[cur]);
  const mediaFor=(names:string[]=[])=>(names||[]).map(name=>media.find(item=>mediaKey(item.fileName)===mediaKey(name))).filter(Boolean);
  const page=pages[cur],nextPage=pages[cur+1],topicEnds=!nextPage||nextPage.topicId!==page?.topicId,isLast=cur>=pages.length-1;
  const cykRev=(progress.cykRevealed||[]).includes(page?.topicId),topicDone=progress.completed.includes(page?.topicId);
  const effectiveCp=externalPractice!==undefined?externalPractice:(cpHasQuestions?cp:apiPractice);
  const practiceStep=externalPractice===undefined||!!effectiveCp;
  const allPracticeQs=[...(effectiveCp?.type1Questions||[]),...(effectiveCp?.type2Questions||[])];
  const toggleTag=(id:string)=>setTagged(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);localStorage.setItem(`edullm-tagged:${chapter.id}`,JSON.stringify([...next]));return next;});
  const doNext=()=>{
    if(!page)return;
    if(topicEnds&&page.knowledgeCheck&&!cykRev&&!topicDone){
      setProgress(p=>({...p,cykRevealed:[...new Set([...(p.cykRevealed||[]),page.topicId])]}));
      return;
    }
    if(topicEnds){
      const tid=page.topicId,tp=pages.filter((pg:any)=>pg.topicId===tid);
      setProgress(p=>({...p,pageCompleted:[...new Set([...p.pageCompleted,...tp.map((pg:any)=>pg.id)])],completed:[...new Set([...p.completed,tid])]}));
    }
    if(isLast){setExtra(sn?'smart':kg?'graph':practiceStep?'practice':'completion');return;}
    const ni=cur+1;
    setCur(ni);
  };
  const goPrev=()=>{if(extra){setExtra(null);return;}if(cur>0)setCur(cur-1);};
  const verify=()=>setProgress(p=>({...p,verified:true}));
  const pct=Math.round((groups.filter(g=>topicComplete(g,progress)).length/Math.max(groups.length,1))*100);
  const topicIdx=page?groups.findIndex(g=>g.id===page.topicId):-1;
  const introduction=page?.pageType==='introduction'||page?.syllabusCode==='INTRO';
  const primaryTitle=introduction?page?.topicTitle:page?.subtopicTitle;
  const within=pages.filter((p:any)=>p.subtopicId===page?.subtopicId);
  const position=within.findIndex((p:any)=>p.id===page?.id);
  const nextLabel=isLast?`Continue to ${sn?'Smart Notes':kg?'Knowledge Graph':practiceStep?'Chapter Practice':'Chapter Review'}`:topicEnds&&page?.knowledgeCheck&&!cykRev&&!topicDone?'Check Your Knowledge →':'Next →';
  return <div className="sap-learning-shell">
    <header className="sap-topbar"><button onClick={back}>← Subject</button><b>{subject.title}</b><span>{pct}% COMPLETE</span></header>
    <div className="sap-learning-layout">
      <aside>
        <h2>{chapter.title}</h2>
        <div className="sap-progress-line"><span style={{width:`${pct}%`}}/></div>

        <details open className="sap-sf">
          <summary className="sap-sf-hd">
            <StatusBox state={pct===100?'blue':!extra?'active':'empty'}/>
            <span>Concepts</span>
            <strong>⌄</strong>
          </summary>
          <TreeNavigation groups={groups} pages={pages} progress={progress} cykStatus={cykStatus} cur={extra?-1:cur} navigate={(idx)=>{setCur(idx);setExtra(null);}} activeRef={activeNavRef}/>
          {sn&&<button className="sap-sf-item chapter-resource-index" onClick={()=>{setExtra('smart');setProgress(p=>({...p,resourcesOpened:[...new Set([...p.resourcesOpened,'smart'])]}))}}><StatusBox state={progress.resourcesOpened.includes('smart')?'blue':'empty'}/><span>Smart Notes</span></button>}
          {kg&&<button className="sap-sf-item chapter-resource-index" onClick={()=>{setExtra('graph');setProgress(p=>({...p,resourcesOpened:[...new Set([...p.resourcesOpened,'graph'])]}))}}><StatusBox state={progress.resourcesOpened.includes('graph')?'blue':'empty'}/><span>Knowledge Graph</span></button>}
        </details>

        <details open={extra==='practice'} className="sap-sf">
          <summary className="sap-sf-hd">
            <StatusBox state={progress.verified?'blue':'empty'}/>
            <span>Practice</span>
            <strong>⌄</strong>
          </summary>
          {effectiveCp?<>
            <div className="sap-practice-subfolder"><button className="sap-sf-item chapter-practice-index" onClick={()=>{setOpenPracticeFolder(openPracticeFolder==='type1'?null:'type1');setPracticeFilter('type1');setPracticeIndex(0);setExtra('practice');}}><StatusBox state="empty"/><span>MCQ ({effectiveCp.type1Questions?.length||0})</span><strong>{openPracticeFolder==='type1'?'⌃':'⌄'}</strong></button>{openPracticeFolder==='type1'&&<div className="sap-practice-grid">{(effectiveCp.type1Questions||[]).map((q:any,i:number)=><button key={q.id} className={`sap-practice-num${tagged.has(q.id)?' tagged':''}`} onClick={()=>{setPracticeIndex(i);setPracticeFilter('type1');setExtra('practice');}}>{i+1}</button>)}</div>}</div>
            <div className="sap-practice-subfolder"><button className="sap-sf-item chapter-practice-index" onClick={()=>{setOpenPracticeFolder(openPracticeFolder==='type2'?null:'type2');setPracticeFilter('type2');setPracticeIndex(0);setExtra('practice');}}><StatusBox state="empty"/><span>Guided Questions ({effectiveCp.type2Questions?.length||0})</span><strong>{openPracticeFolder==='type2'?'⌃':'⌄'}</strong></button>{openPracticeFolder==='type2'&&<div className="sap-practice-grid">{(effectiveCp.type2Questions||[]).map((q:any,i:number)=><button key={q.id} className={`sap-practice-num${tagged.has(q.id)?' tagged':''}`} onClick={()=>{setPracticeIndex(i);setPracticeFilter('type2');setExtra('practice');}}>{i+1}</button>)}</div>}</div>
            {tagged.size>0&&<button className="sap-sf-item chapter-practice-tagged" onClick={()=>{setPracticeFilter('tagged');setPracticeIndex(0);setExtra('practice');}}><StatusBox state='empty'/><span>Important ({tagged.size})</span></button>}
          </>:<button className="sap-sf-item chapter-practice-index" onClick={()=>setExtra('practice')}><StatusBox state="empty"/><span>Open Chapter Practice</span></button>}
        </details>

        <button className="cycle-test-index chapter-completion-index" onClick={()=>setExtra('completion')}><StatusBox state='empty'/><span>Cycle Test</span></button>
      </aside>
      <main ref={mainRef} className="pbp-main">
        {!extra&&page&&<>
          <div className="pbp-topic-banner"><small>TOPIC {topicIdx+1} OF {groups.length}</small><h1>{page.topicTitle}</h1></div>
          <article className="topic-webpage">
            {!introduction&&<h1 className="learning-page-primary-title">{primaryTitle}</h1>}
            {page.subtopicDescription&&position===0&&<RichContent className="subtopic-lead" value={page.subtopicDescription}/>}
            {page.title!==primaryTitle&&<h2 className="page-title">{page.title}</h2>}
            <RichContent className="topic-lead" value={page.description}/>
            {page.document?<PdfLearningPage document={page.document}/>:page.blocks?.length?<PageBlocks blocks={page.blocks} mediaFor={mediaFor}/>:page.concepts.map((c:any)=><ConceptPage concept={c} mediaFor={mediaFor} legacyPractice={!effectiveCp&&!page.knowledgeCheck} hideTitle={sameHeading(c.title,primaryTitle)||sameHeading(c.title,page.title)} key={c.id}/>)}
          </article>
          {topicEnds&&page.knowledgeCheck&&cykRev&&<TopicKnowledgeCheck check={page.knowledgeCheck} topicId={page.topicId} mediaFor={mediaFor} node={()=>{}} status={state=>setCykStatus(c=>({...c,[page.topicId]:state}))}/>}
          <div className="pbp-nav">
            <button className="pbp-prev" disabled={cur===0&&!extra} onClick={goPrev}>← Previous</button>
            <span className="pbp-pager">Page {cur+1} of {pages.length}</span>
            <button className="pbp-next" onClick={doNext}>{nextLabel}</button>
          </div>
        </>}
        {extra==='smart'&&sn&&<SmartNotesPage notes={sn} node={()=>{}} next={()=>setExtra(kg?'graph':practiceStep?'practice':'completion')}/>}
        {extra==='graph'&&kg&&<KnowledgeGraphPage graph={kg} node={()=>{}} next={()=>setExtra(practiceStep?'practice':'completion')}/>}
        {extra==='practice'&&!effectiveCp&&<section className="topic-webpage"><h1>Chapter Practice</h1><p>Loading practice questions…</p></section>}
        {extra==='practice'&&effectiveCp&&<ChapterPractice practice={effectiveCp} mediaFor={mediaFor} node={()=>{}} continueToCompletion={()=>setExtra('completion')} index={practiceIndex} setIndex={setPracticeIndex} filter={practiceFilter} tagged={tagged} toggleTag={toggleTag}/>}
        {extra==='completion'&&<CycleTestExperience chapter={chapter} verified={progress.verified} verify={verify} onMastery={mastery=>setProgress(current=>({...current,mastery:{...current.mastery,...mastery}}))}/>}
        {extra&&<div className="pbp-nav"><button className="pbp-prev" onClick={goPrev}>← Back to Chapter</button><span/><span/></div>}
      </main>
    </div>
  </div>
}

function TreeNavigation({groups,pages,progress,cykStatus,cur,navigate,activeRef}:{groups:any[];pages:any[];progress:Progress;cykStatus:Record<string,CykState>;cur:number;navigate:(idx:number)=>void;activeRef:React.MutableRefObject<HTMLElement|null>}){
  const curPage=pages[cur];
  return <div className="tree-navigation">{groups.map(group=>{
    const firstIdx=pages.findIndex((p:any)=>p.id===group.pages[0].id);
    const isTopicActive=curPage?.topicId===group.id;
    const done=group.pages.filter((p:any)=>progress.pageCompleted.includes(p.id)).length;
    const pct=Math.round(done/Math.max(group.pages.length,1)*100);
    const complete=topicComplete(group,progress);
    const state=complete?(progress.mastery[group.id]||'blue'):done||group.pages.some((p:any)=>progress.opened.includes(p.id))?'active':'empty';
    const subtopics=group.subtopics.filter((s:any)=>!s.introduction);
    return <details open={isTopicActive||complete} key={group.id}>
      <summary className={`tree-summary mastery-${state}${isTopicActive?' topic-active':''}`} onClick={()=>navigate(firstIdx)}>
        <StatusBox state={state} percent={pct}/>
        <span ref={isTopicActive&&!subtopics.length?(node=>{activeRef.current=node;}):undefined}>{group.title}</span>
        <strong>⌄</strong>
      </summary>
      <div>{subtopics.map((sub:any)=>{
        const idx=pages.findIndex((p:any)=>p.id===sub.pages[0].id);
        const isActive=sub.pages.some((p:any)=>p.id===curPage?.id);
        const subDone=sub.pages.filter((p:any)=>progress.pageCompleted.includes(p.id)).length;
        const subState=subDone===sub.pages.length?'blue':subDone||sub.pages.some((p:any)=>progress.opened.includes(p.id))?'active':'empty';
        return <button key={sub.id} ref={isActive?(node=>{activeRef.current=node;}):undefined} className={`sub-topic-btn${isActive?' sub-active':''}`} onClick={()=>navigate(idx)}>
          <StatusBox state={subState} percent={Math.round(subDone/Math.max(sub.pages.length,1)*100)}/>
          <span>{sub.title}</span>
        </button>;
      })}{group.pages.some((p:any)=>p.knowledgeCheck)&&<button className="cyk-index" onClick={()=>{const ci=pages.findIndex((p:any)=>p.topicId===group.id&&p.knowledgeCheck);if(ci>=0)navigate(ci);}}><StatusBox state={cykStatus[group.id]||'empty'}/><span>Check Your Knowledge</span></button>}</div>
    </details>;
  })}</div>;
}

function sameHeading(left:string,right:string){return String(left||'').trim().toLocaleLowerCase().replace(/\s+/g,' ')===String(right||'').trim().toLocaleLowerCase().replace(/\s+/g,' ')}
function mediaKey(value:string){return String(value||'').toLocaleLowerCase().replace(/\.(png|jpe?g|webp|svg)$/,'')}
function PageNavigation({position,count,previous,next}:{position:number;count:number;previous?:()=>void;next?:()=>void}){if(count<2)return null;return <nav className="quiet-page-navigation" aria-label="Learning page navigation"><button className="page-navigation-link" disabled={!previous} onClick={previous}>← Previous</button><span>{position+1} of {count}</span><button className="page-navigation-link" disabled={!next} onClick={next}>Next →</button></nav>}

function PdfLearningPage({document}:{document:any}){return <section className="pdf-learning-page"><header><b>{document.fileName}</b><span>Page {document.pageNumber} of {document.pageCount} · Read-only</span></header><iframe tabIndex={-1} title={`${document.fileName}, page ${document.pageNumber}`} src={`${API}${document.url}#page=${document.pageNumber}&toolbar=0&navpanes=0&scrollbar=0`}/><p>Use Continue or the keyboard ↑/↓ arrows to move between pages.</p></section>}

function SmartNotesPage({notes,node,next}:{notes:any;node:(value:HTMLElement|null)=>void;next:()=>void}){const pdfs=(notes.documents||[]).filter((item:any)=>item.mimeType==='application/pdf'),pages=useMemo(()=>smartNotesPages(notes.richContent||''),[notes.richContent]),[position,setPosition]=useState(0),article=useRef<HTMLElement>(null),go=(nextPosition:number)=>{setPosition(nextPosition);window.setTimeout(()=>article.current?.scrollIntoView({behavior:'smooth',block:'start'}),20)};return <article className="topic-webpage chapter-resource-page smart-notes-page" ref={value=>{article.current=value;node(value)}}><small>CHAPTER RESOURCE</small><h1>{notes.title||'Smart Notes'}</h1><p className="topic-lead">Exam-ready teacher notes: important explanations, answer structure, equations and presentation guidance.</p>{pages.length>0&&<section className="smart-notes-sheet"><small>SMART NOTES · PAGE {position+1} OF {pages.length}</small><DocumentHtml value={pages[position]}/><PageNavigation position={position} count={pages.length} previous={position>0?()=>go(position-1):undefined} next={position<pages.length-1?()=>go(position+1):undefined}/></section>}{!pages.length&&<p>No Smart Notes content has been added.</p>}{pdfs.map((item:any)=><section className="resource-document" key={item.id}><header><b>{item.fileName}</b><span>{item.pageCount||1} page(s)</span></header><iframe title={item.fileName} src={`${API}${item.url}#toolbar=0&navpanes=0`}/></section>)}{position===Math.max(0,pages.length-1)&&<footer className="topic-end"><small>SMART NOTES COMPLETE</small><button onClick={next}>Continue⌄</button></footer>}</article>}
function KnowledgeGraphPage({graph,node,next}:{graph:any;node:(value:HTMLElement|null)=>void;next:()=>void}){const item=graph.resource,imageViewer=useRef<HTMLElement>(null),[zoom,setZoom]=useState(100),openFullScreen=()=>{setZoom(100);imageViewer.current?.requestFullscreen()},closeFullScreen=()=>document.fullscreenElement&&document.exitFullscreen();return <article className="topic-webpage chapter-resource-page knowledge-graph-page" ref={node}><small>CHAPTER RESOURCE</small><h1>{graph.title||'Knowledge Graph'}</h1><RichContent className="topic-lead" value={graph.description||'Connect and recall the Chapter concepts through one visual map.'}/>{item?.mimeType?.startsWith('image/')?<section className="knowledge-graph-viewer" ref={imageViewer}><header><span>Use the available width or open the visual in full screen.</span><button type="button" onClick={openFullScreen}>View full screen ⛶</button></header><nav className="knowledge-graph-fullscreen-toolbar" aria-label="Knowledge graph viewer controls"><b>Knowledge Graph</b><button type="button" aria-label="Zoom out" onClick={()=>setZoom(value=>Math.max(50,value-25))}>−</button><span>{zoom}%</span><button type="button" aria-label="Zoom in" onClick={()=>setZoom(value=>Math.min(250,value+25))}>+</button><button type="button" onClick={()=>setZoom(100)}>Fit width</button><button type="button" onClick={closeFullScreen}>Exit full screen ✕</button></nav><div className="knowledge-graph-scroll-area"><img className="knowledge-graph-image" style={{width:`${zoom}%`}} src={`${API}${item.url}`} alt={`${graph.title||'Knowledge Graph'} for this Chapter`}/></div></section>:item?.mimeType==='application/pdf'?<section className="resource-document"><header><b>{item.fileName}</b><span>{item.pageCount||1} page(s)</span></header><iframe title={item.fileName} src={`${API}${item.url}#toolbar=0&navpanes=0`}/></section>:item?.extractedHtml?<DocumentHtml value={item.extractedHtml}/>:<p>No Knowledge Graph has been uploaded.</p>}<footer className="topic-end"><small>KNOWLEDGE GRAPH COMPLETE</small><button onClick={next}>Continue⌄</button></footer></article>}
function DocumentHtml({value}:{value:string}){return value?<section className="chapter-document-html" dangerouslySetInnerHTML={{__html:safeDocumentHtml(value)}}/>:null}
function smartNotesPages(value:string){if(!value)return [];const parsed=new DOMParser().parseFromString(value,'text/html'),nodes=Array.from(parsed.body.children),starts=nodes.flatMap((element,index)=>{const heading=/^H[1-4]$/.test(element.tagName),numbered=/^\d+\.\s+\S/.test(element.textContent?.trim()||''),next=nodes[index+1]?.textContent?.trim()||'',section=heading||numbered&&/Must Remember/i.test(next);return section?[index]:[]});if(starts.length<2)return [value];const boundaries=[0,...starts.slice(1),nodes.length];return boundaries.slice(0,-1).map((start,index)=>nodes.slice(start,boundaries[index+1]).map(element=>element.outerHTML).join('')).filter(Boolean)}
function safeImageSource(value:string){return value.startsWith('data:image/')||/^\/api\/catalogue\/chapters\/[a-f0-9-]+\/embedded-images\/[a-f0-9]{64}$/i.test(value)||/^\/uploads\/[a-z0-9._-]+$/i.test(value)||/^https:\/\/[a-z0-9.-]+\.cloudfront\.net\/edullm\/[a-z0-9._~!$&'()*+,;=:@%/-]+$/i.test(value)||/^https:\/\/media\.learn\.iqlabsacademy\.com\/edullm\/[a-z0-9._~!$&'()*+,;=:@%/-]+$/i.test(value)}
function prepareSafeImage(node:Element){node.setAttribute('loading','lazy');node.setAttribute('decoding','async');node.setAttribute('style','display:block;max-width:100%;height:auto;margin:16px auto;border-radius:6px')}
function safeDocumentHtml(value:string){const parsed=new DOMParser().parseFromString(value,'text/html'),allowed=new Set(['P','BR','B','STRONG','I','EM','U','UL','OL','LI','H1','H2','H3','H4','SUB','SUP','BLOCKQUOTE','HR','TABLE','THEAD','TBODY','TR','TH','TD','IMG']);parsed.body.querySelectorAll('*').forEach(node=>{if(!allowed.has(node.tagName)){node.replaceWith(...Array.from(node.childNodes));return}Array.from(node.attributes).forEach(attribute=>{const keep=node.tagName==='IMG'&&((attribute.name==='src'&&safeImageSource(attribute.value))||attribute.name==='alt');if(!keep)node.removeAttribute(attribute.name)});if(node.tagName==='IMG'&&node.getAttribute('src'))prepareSafeImage(node)});return parsed.body.innerHTML}

function PageBlocks({blocks,mediaFor}:{blocks:any[];mediaFor:(refs:string[])=>any[]}){
  const side=blocks.find(block=>block.type==='image'&&['image-left','image-right'].includes(block.layout)&&mediaFor([block.mediaRef])[0]);
  const renderText=(block:any)=>block.type==='remember'?<aside className="remember-highlight" key={block.id}><b>⚡ REMEMBER</b><RichContent value={block.content}/></aside>:<RichContent value={block.content} key={block.id}/>;
  const image=(block:any)=>{const item=mediaFor([block.mediaRef])[0];return item?<figure className={`learning-image-block ${block.layout||'centered'} ${block.size||'large'}`} key={block.id}><img loading="lazy" src={`${API}${item.url}`} alt={block.altText||item.altText}/>{(block.caption||item.caption)&&<figcaption>{block.caption||item.caption}</figcaption>}</figure>:null};
  const imageInline=(block:any)=><div key={block.id} style={{width:'100%',overflow:'hidden',margin:'12px 0'}}><img loading="lazy" src={block.src} alt={block.altText||''} style={{display:'block',width:'100%',height:'auto',borderRadius:'6px'}}/></div>;
  if(side){const textual=blocks.filter(block=>block.type!=='image'),otherImages=blocks.filter(block=>block.type==='image'&&block!==side);return <section className="learning-page-blocks"><div className={`learning-page-pair ${side.layout}`}><div>{textual.map(renderText)}</div>{image(side)}</div>{otherImages.map(image)}</section>}
  return <section className="learning-page-blocks">{blocks.map(block=>block.type==='image'?image(block):block.type==='image-inline'?imageInline(block):renderText(block))}</section>
}
function RichContent({value,className}:{value:string;className?:string}){if(!value)return null;const html=/<[a-z][\s\S]*>/i.test(value)?safeHtml(value):safeHtml(parseMarkdown(value));return <div className={className} dangerouslySetInnerHTML={{__html:html}}/>}
function safeHtml(value:string){const documentValue=new DOMParser().parseFromString(value,'text/html'),allowed=new Set(['P','BR','B','STRONG','I','EM','U','UL','OL','LI','H2','H3','H4','H5','SUB','SUP','BLOCKQUOTE','HR','CODE','TABLE','THEAD','TBODY','TR','TH','TD','IMG']);documentValue.body.querySelectorAll('*').forEach(node=>{if(!allowed.has(node.tagName))node.replaceWith(...Array.from(node.childNodes));else{Array.from(node.attributes).forEach(attribute=>{const isImg=node.tagName==='IMG';const keepImg=isImg&&(attribute.name==='alt'||(attribute.name==='src'&&safeImageSource(attribute.value)));if(!keepImg)node.removeAttribute(attribute.name)});if(node.tagName==='IMG'&&node.getAttribute('src'))prepareSafeImage(node)}});return documentValue.body.innerHTML}

function ConceptPage({concept,mediaFor,legacyPractice,hideTitle=false}:{concept:any;mediaFor:(refs:string[])=>any[];legacyPractice:boolean;hideTitle?:boolean}){
  const cards=[...(concept.learningCards||[]),...(concept.flashCards||[])];
  return <section className={`concept-web-section${hideTitle?' title-hidden':''}`}>{!hideTitle&&<h2>{concept.title}</h2>}<p>{concept.explanation?.quickUnderstanding||concept.explanation?.summary}</p><p>{concept.explanation?.beginner}</p>{mediaFor(concept.mediaRefs).map((m:any)=><img loading="lazy" src={`${API}${m.url}`} alt={m.altText} key={m.fileName}/>)}{cards.map((card:any)=><section className="learning-callout" key={card.id}><h3>{card.title||card.front}</h3><p>{card.content||card.back}</p>{card.keyPoints?.length>0&&<ul>{card.keyPoints.map((x:string)=><li key={x}>{x}</li>)}</ul>}{mediaFor(card.mediaRefs).map((m:any)=><img loading="lazy" src={`${API}${m.url}`} alt={m.altText} key={m.fileName}/>)}</section>)}{concept.workedExamples?.map((example:any)=><section className="worked-web" key={example.id}><small>WORKED EXAMPLE</small><h3>{example.title}</h3><p>{example.problem}</p><ol>{example.steps?.map((x:string)=><li key={x}>{x}</li>)}</ol><b>{example.answer}</b><p>{example.explanation}</p></section>)}{legacyPractice&&<PracticeBlock concept={concept} mediaFor={mediaFor}/>}</section>
}

function TopicKnowledgeCheck({check,topicId,mediaFor,node,status}:{check:any;topicId:string;mediaFor:(refs:string[])=>any[];node:(value:HTMLElement|null)=>void;status:(value:CykState)=>void}){const questions=[...(check.type1Questions||[]),...(check.type2Questions||[])],[index,setIndex]=useState(0),[answers,setAnswers]=useState<Record<string,any>>({}),[submitted,setSubmitted]=useState(false),root=useRef<HTMLElement|null>(null),question=questions[index],answered=(item:any)=>item.steps?item.steps.every((step:any)=>String(answers[item.id]?.[step.id]||'').trim()):String(answers[item.id]||'').trim(),correct=(item:any)=>item.steps?item.steps.every((step:any)=>normalizeAnswer(answers[item.id]?.[step.id])===normalizeAnswer(step.answer)):normalizeAnswer(answers[item.id])===normalizeAnswer(item.correctAnswer),complete=questions.length>0&&questions.every(answered),score=questions.length?questions.filter(correct).length/questions.length*100:0,submit=()=>{if(complete){setSubmitted(true);status(score>80?'green':score>60?'yellow':'grey')}},retake=()=>{setAnswers({});setSubmitted(false);setIndex(0);status('grey');root.current?.scrollIntoView({behavior:'smooth',block:'start'})};return <article className="topic-webpage cyk-page" ref={value=>{root.current=value;node(value)}} data-topic={topicId}><small>TOPIC CHECK</small><h1>Check Your Knowledge</h1><p className="topic-lead">{check.instructions||'Answer all questions, then submit the complete check. No timer and unlimited retakes.'}</p>{question&&<><div className="practice-position"><b>Question {index+1} of {questions.length}</b><span>{questions.map((item:any,position:number)=><button aria-label={`Open CYK question ${position+1}`} className={position===index?'current':answered(item)?'answered':''} onClick={()=>setIndex(position)} key={item.id}>{position+1}</button>)}</span></div>{question.steps?<CykType2 question={question} value={answers[question.id]||{}} disabled={submitted} change={value=>setAnswers(current=>({...current,[question.id]:value}))}/>:<CykType1 question={question} value={answers[question.id]||''} disabled={submitted} change={value=>setAnswers(current=>({...current,[question.id]:value}))} mediaFor={mediaFor}/>} {submitted&&<CykExplanation question={question} correct={correct(question)}/>}<footer className="practice-navigation"><button disabled={index===0} onClick={()=>setIndex(value=>value-1)}>← Previous</button><button disabled={index===questions.length-1} onClick={()=>setIndex(value=>value+1)}>Next →</button></footer>{index===questions.length-1&&<button className="cyk-submit-all" disabled={!complete||submitted} onClick={submit}>Submit all answers</button>}</>}{submitted&&<section className={`cyk-result ${score>80?'green':score>60?'yellow':'grey'}`}><h2>Your score is {score.toFixed(2)}%</h2><p>{score>80?'Congratulations! You understand this Topic well.':score>60?'Fair attempt. Review the missed concepts and try again.':'Please revise this Topic and try the Check Your Knowledge again.'}</p><button onClick={retake}>↻ Take again</button></section>}</article>}

function CykType1({question,value,disabled,change,mediaFor}:{question:any;value:string;disabled:boolean;change:(value:string)=>void;mediaFor:(refs:string[])=>any[]}){const options=useMemo(()=>jumble(question.options||[],question.id),[question.id,question.options]),textEntry=question.format==='fill_blank'||question.format==='one_line'||!options.length;return <section className="practice-web-question cyk-question"><small>{String(question.format||'MCQ').replace('_',' ')}</small><h3>{question.question}</h3>{mediaFor(question.mediaRefs).map((item:any)=><img loading="lazy" src={`${API}${item.url}`} alt={item.altText} key={item.fileName}/>)}{textEntry?<label className="fill-answer"><span>Your answer</span><input value={value} disabled={disabled} onChange={event=>change(event.target.value)} autoComplete="off" placeholder="Type your answer here"/></label>:<div>{options.map((option:string)=><label key={option}><input type="radio" name={`cyk-${question.id}`} checked={value===option} disabled={disabled} onChange={()=>change(option)}/><span>{option}</span></label>)}</div>}</section>}
function CykType2({question,value,disabled,change}:{question:any;value:Record<string,string>;disabled:boolean;change:(value:Record<string,string>)=>void}){const choose=(stepId:string,option:string)=>{if(!disabled)change({...value,[stepId]:option})},drop=(event:DragEvent<HTMLDivElement>,stepId:string)=>{event.preventDefault();try{const item=JSON.parse(event.dataTransfer.getData('text/plain'));if(item.stepId===stepId)choose(stepId,item.option)}catch{}};return <section className="practice-web-question type2-web cyk-question"><small>GUIDED TYPE 2</small><h3>{question.question}</h3><p>Choose or drag one answer for every step.</p>{question.steps.map((item:any,index:number)=><section className="practice-step" key={item.id}><b>{index+1}. {item.prompt}</b><div className="drag-choice-tray">{jumble(item.options||[],item.id).map((option:string)=><button type="button" draggable={!disabled} disabled={disabled} className={value[item.id]===option?'selected':''} onDragStart={event=>event.dataTransfer.setData('text/plain',JSON.stringify({stepId:item.id,option}))} onClick={()=>choose(item.id,option)} key={option}><i>⠿</i>{option}</button>)}</div><div className="cyk-drop-answer" onDragOver={event=>event.preventDefault()} onDrop={event=>drop(event,item.id)}>{value[item.id]||'Drop or select your answer here'}</div></section>)}</section>}
function CykExplanation({question,correct}:{question:any;correct:boolean}){return <section className={correct?'practice-feedback correct':'practice-feedback wrong'}><b>{correct?'✓ Correct':'✕ Review this answer'}</b><details><summary>View explanation</summary>{question.steps?<><p>{question.finalAnswer}</p>{question.steps.map((item:any)=><p key={item.id}><b>{item.answer}</b> — {item.explanation}</p>)}</>:<><p>{question.explanation}</p><strong>Correct answer: {question.correctAnswer}</strong></>}</details></section>}

function KnowledgeCheck({check,mediaFor}:{check:any;mediaFor:(refs:string[])=>any[]}){const questions=[...(check.type1Questions||[]),...(check.type2Questions||[])];return <section className="knowledge-check"><header><small>CHECK YOUR UNDERSTANDING</small><h2>{check.title}</h2><p>{check.instructions||'Immediate feedback · no marks · no mastery impact'}</p></header>{questions.map((question:any,index:number)=>question.steps?<PracticeType2 key={question.id} question={question} number={index+1}/>:<PracticeType1 key={question.id} question={question} number={index+1} mediaFor={mediaFor}/>)}</section>}

function ChapterPractice({practice,mediaFor,node,continueToCompletion,index,setIndex,filter,tagged,toggleTag}:{practice:any;mediaFor:(refs:string[])=>any[];node:(value:HTMLElement|null)=>void;continueToCompletion:()=>void;index:number;setIndex:(i:number)=>void;filter:'all'|'type1'|'type2'|'tagged';tagged:Set<string>;toggleTag:(id:string)=>void}){const all=[...(practice.type1Questions||[]),...(practice.type2Questions||[])],questions=filter==='tagged'?all.filter((q:any)=>tagged.has(q.id)):filter==='type1'?(practice.type1Questions||[]):filter==='type2'?(practice.type2Questions||[]):all,safeIndex=Math.min(index,Math.max(0,questions.length-1)),question=questions[safeIndex],isLast=safeIndex===questions.length-1;return <article className="topic-webpage chapter-practice-page" ref={node}><small>CHAPTER PRACTICE{filter==='type1'?' · MCQ':filter==='type2'?' · GUIDED QUESTIONS':filter==='tagged'?' · IMPORTANT':''}</small><h1>{filter==='type1'?'MCQ':filter==='type2'?'Guided Questions':practice.title}</h1><p className="topic-lead">{filter==='tagged'?`${questions.length} important question(s) marked for revisit · no marks`:practice.instructions||'Practice only · no marks · immediate feedback'}</p>{question?<><div className="practice-position"><b>Question {safeIndex+1} of {questions.length}</b></div>{question.steps?.length?<PracticeType2 key={question.id} question={question} number={safeIndex+1} tagged={tagged.has(question.id)} onToggleTag={()=>toggleTag(question.id)}/>:<PracticeType1 key={question.id} question={question} number={safeIndex+1} mediaFor={mediaFor} tagged={tagged.has(question.id)} onToggleTag={()=>toggleTag(question.id)}/>}<footer className="practice-navigation"><button disabled={safeIndex===0} onClick={()=>setIndex(safeIndex-1)}>← Previous</button><button disabled={isLast} onClick={()=>setIndex(safeIndex+1)}>Next →</button></footer>{isLast&&<footer className="topic-end"><small>PRACTICE IS OPTIONAL AND DOES NOT AFFECT MASTERY</small><button onClick={continueToCompletion}>Continue to Chapter Completion ⌄</button></footer>}</>:<p className="sap-sf-empty">No questions in this filter.</p>}</article>}

function PracticeBlock({concept,mediaFor}:{concept:any;mediaFor:(refs:string[])=>any[]}){const questions=[...(concept.type1Questions||[]),...(concept.type2Questions||[])];return questions.length?<section className="knowledge-check"><header><small>PRACTICE · KNOWLEDGE CHECK</small><h2>Check your understanding</h2><p>Practice only · no marks · immediate feedback</p></header>{questions.map((question:any,index:number)=>question.type==='type2'||question.steps?<PracticeType2 key={question.id} question={question} number={index+1}/>:<PracticeType1 key={question.id} question={question} number={index+1} mediaFor={mediaFor}/>)}</section>:null}

function PracticeType1({question,number,mediaFor,tagged=false,onToggleTag}:{question:any;number:number;mediaFor:(refs:string[])=>any[];tagged?:boolean;onToggleTag?:()=>void}){const [choice,setChoice]=useState(''),[submitted,setSubmitted]=useState(false),options=useMemo(()=>jumble(question.options||[],question.id),[question.id,question.options]),textEntry=question.format==='fill_blank'||question.format==='one_line'||options.length===0,correct=normalizeAnswer(choice)===normalizeAnswer(question.correctAnswer);const retake=()=>{setChoice('');setSubmitted(false)};return <article className="practice-web-question"><h2 className="practice-main-question">{question.question}</h2>{mediaFor(question.mediaRefs).map((m:any)=><img loading="lazy" src={`${API}${m.url}`} alt={m.altText} key={m.fileName}/>)}{textEntry?<label className={`fill-answer ${submitted?(correct?'correct':'wrong'):''}`}><span>Your answer</span><input type="text" value={choice} disabled={submitted} autoComplete="off" onChange={event=>setChoice(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&choice.trim())setSubmitted(true)}} placeholder="Type your answer here"/></label>:<div>{options.map((option:string)=><label className={submitted?(option===question.correctAnswer?'correct':choice===option?'wrong':''):''} key={option}><input type="radio" name={question.id} checked={choice===option} disabled={submitted} onChange={()=>setChoice(option)}/><span>{option}</span></label>)}</div>}{!submitted&&<div className="practice-action-row"><button className="type2-check-btn" disabled={!choice.trim()} onClick={()=>setSubmitted(true)}>Check</button>{onToggleTag&&<button className={`mark-revision-btn${tagged?' active':''}`} onClick={onToggleTag}>{tagged?'★ Saved for revision':'☆ Save for revision'}</button>}</div>}{submitted&&<section className={correct?'practice-feedback correct':'practice-feedback wrong'}><b>{correct?'✓ Well done — correct':'✕ Not quite — review the answer'}</b>{!correct&&<p className="feedback-correct-ans">Correct answer: <strong>{question.correctAnswer}</strong></p>}{question.explanation&&<div className="explanation-html" dangerouslySetInnerHTML={{__html:question.explanation}}/>}<div className="practice-action-row"><button className="retake-practice" onClick={retake}>↻ Retake</button>{onToggleTag&&<button className={`mark-revision-btn${tagged?' active':''}`} onClick={onToggleTag}>{tagged?'★ Saved for revision':'☆ Save for revision'}</button>}</div></section>}</article>}

function PracticeType2({question,number,tagged=false,onToggleTag}:{question:any;number:number;tagged?:boolean;onToggleTag?:()=>void}){const [answers,setAnswers]=useState<Record<string,string>>({}),[checked,setChecked]=useState(false);const choose=(stepId:string,option:string)=>{if(!checked)setAnswers(current=>({...current,[stepId]:option}))};const drop=(event:DragEvent<HTMLDivElement>,stepId:string)=>{event.preventDefault();try{const item=JSON.parse(event.dataTransfer.getData('text/plain'));if(item.stepId===stepId)choose(stepId,item.option)}catch{}};const retake=()=>{setAnswers({});setChecked(false)};const overallExp=question.finalAnswer||question.explanation;return <article className="practice-web-question type2-web"><h2 className="practice-main-question">{question.question}</h2><p className="practice-subtitle">Choose one answer per step to build the complete response.</p>{question.steps.map((step:any,index:number)=>{const answer=answers[step.id],correct=checked&&answer===step.answer;return <section className="practice-step" key={step.id}><b>{index+1}. {step.prompt}</b><div className="drag-choice-tray">{jumble(step.options||[],step.id).map((option:string)=><button type="button" draggable={!checked} disabled={checked} className={[answers[step.id]===option?'selected':'',checked&&option===step.answer?'opt-correct':'',checked&&answers[step.id]===option&&option!==step.answer?'opt-wrong':''].filter(Boolean).join(' ')} onDragStart={event=>event.dataTransfer.setData('text/plain',JSON.stringify({stepId:step.id,option}))} onClick={()=>choose(step.id,option)} key={option}><i>⠿</i>{option}</button>)}</div>{checked&&<div className={correct?'step-inline-result correct':'step-inline-result wrong'}><b>{correct?'✓ Correct':'✕ Incorrect'}</b>{!correct&&<span> — correct: <b>{step.answer}</b></span>}{step.explanation&&<div className="step-inline-exp" dangerouslySetInnerHTML={{__html:step.explanation}}/>}</div>}</section>})}{!checked&&<div className="practice-action-row"><button className="type2-check-btn" onClick={()=>setChecked(true)}>Check answers</button>{onToggleTag&&<button className={`mark-revision-btn${tagged?' active':''}`} onClick={onToggleTag}>{tagged?'★ Saved for revision':'☆ Save for revision'}</button>}</div>}{checked&&<>{overallExp&&<div className="practice-feedback correct type2-overall-exp"><b>Explanation</b><div className="explanation-html" dangerouslySetInnerHTML={{__html:overallExp}}/></div>}<div className="practice-action-row"><button className="retake-practice" onClick={retake}>↻ Retake</button>{onToggleTag&&<button className={`mark-revision-btn${tagged?' active':''}`} onClick={onToggleTag}>{tagged?'★ Saved for revision':'☆ Save for revision'}</button>}</div></>}</article>}

function ChapterCompletion({chapter,verified,progress,verify,start,submit,node}:{chapter:any;verified:boolean;progress:Progress;verify:()=>void;start:()=>void;submit:()=>void;node:(value:HTMLElement|null)=>void}){const [instructions,setInstructions]=useState(false),test=chapter.cycleTest,started=!!progress.cycleStartedAt,submitted=progress.cycleSubmittedAt?new Date(progress.cycleSubmittedAt).getTime():0,retakeDays=Number(test?.retakeAfterDays??test?.lockingDurationDays??30),cooldown=!!submitted&&Date.now()<submitted+retakeDays*86400000,forms=test?.forms||[],formNumber=((progress.cycleAttempt||0)-1)%Math.max(forms.length,1)+1,form=forms[formNumber-1];return <article className="chapter-completion-page" ref={node}><small>CHAPTER COMPLETION</small><h1>Ready for the Cycle Test?</h1><div><h2>CONFIDENCE CHECK</h2><p>You may learn from this app or any other trusted material. Declare when you feel ready to be assessed on <b>{chapter.title}</b>.</p></div><p>Topics remain open at all times. Only the Cycle Test is controlled by completion verification and its configured retake duration.</p>
<button disabled={verified} onClick={verify}>{verified?'✓ Verify - Chapter Completed':'Verify - Chapter Completed'}</button>
<section id={`cycle-test-${chapter.id}`} className={`chapter-cycle-test ${verified&&test?'unlocked':'locked'}`}><small>NEXT · CYCLE TEST</small><h2>{test?.title||'Cycle Test'}</h2>{test?<><div className="cycle-test-facts"><span><b>{test.totalMarks}</b> marks</span><span><b>{test.durationMinutes}</b> minutes</span><span><b>{test.sections?.length||0}</b> sections</span><span>Results Available in <b>{test.resultDelayHours??24} Hours</b></span></div>
{!verified&&<p><b>Unlock criteria:</b> Select "Verify - Chapter Completed."</p>}{verified&&form&&<p><b>Available form:</b> Form {formNumber} · {form.sections?.reduce((n:number,s:any)=>n+(s.questionIds?.length||0),0)} questions</p>}{cooldown&&<p><b>Retake locked:</b> available after {new Date(submitted+retakeDays*86400000).toLocaleString()}.</p>}
</>:<p>This Cycle Test has not yet been configured by the Teacher.</p>}<button disabled={!verified||!test||cooldown||started} onClick={()=>setInstructions(true)}>{started?'Cycle Test in progress':cooldown?'Cycle Test locked during retake period':verified&&test?'Review instructions and start →':test?'🔒 Confidence declaration required to unlock':'Cycle Test not configured'}</button>{started&&<button onClick={submit}>Submit Cycle Test</button>}{instructions&&test&&!started&&<section className="cycle-instructions"><h3>Before you begin · Form {formNumber}</h3><ul><li>The timer starts after final confirmation and does not pause.</li><li>Duration: {test.durationMinutes} minutes.</li><li>Submitting manually or reaching the time limit locks this test for {retakeDays} day(s).</li></ul><button onClick={()=>{setInstructions(false);start()}}>I understand — Start Cycle Test</button></section>}</section></article>}
function StatusLegend(){return <div className="sap-status-legend"><span><StatusBox state="empty"/>Not started</span><span><StatusBox state="blue"/>Completed</span><span><StatusBox state="green"/>Strong</span><span><StatusBox state="yellow"/>Developing</span><span><StatusBox state="orange"/>Focus</span></div>}
function StatusBox({state,percent=0}:{state:string;percent?:number}){return <i className={`sap-status ${state}`} style={state==='active'&&percent>0?{background:`conic-gradient(var(--sap-bright) ${percent}%,#d6dde3 0)`}:undefined} aria-label={state}>{state!=='empty'&&state!=='active'?'✓':''}</i>}
function groupTopics(pages:any[]){return pages.reduce((groups:any[],page:any)=>{let group=groups.find(item=>item.id===page.topicId);if(!group){group={id:page.topicId,title:page.topicTitle,pages:[],subtopics:[]};groups.push(group)}group.pages.push(page);let subtopic=group.subtopics.find((item:any)=>item.id===page.subtopicId);if(!subtopic){subtopic={id:page.subtopicId,title:page.subtopicTitle,introduction:page.pageType==='introduction'||page.syllabusCode==='INTRO',pages:[]};group.subtopics.push(subtopic)}subtopic.pages.push(page);return groups},[])}
function topicComplete(group:any,progress:Progress){return group.pages.length>0&&group.pages.every((page:any)=>progress.pageCompleted.includes(page.id))}
function normalizeAnswer(value:string){return String(value||'').trim().toLocaleLowerCase().replace(/\s+/g,' ').replace(/[.,;:]$/,'')}
function jumble(values:string[],seedText:string){return shuffleForStudent(values,seedText)}
function inlineMarkdown(text:string):string{return text.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+?)\*/g,'<em>$1</em>').replace(/`([^`]+)`/g,'<code>$1</code>')}
function parseMarkdown(text:string):string{const lines=text.split('\n'),out:string[]=[],para:string[]=[];let listType:string|null=null,listItems:string[]=[],tableRows:string[][]=[];const fi=()=>{if(para.length){out.push(`<p>${para.map(inlineMarkdown).join('<br/>')}</p>`);para.length=0}};const fl=()=>{if(listItems.length&&listType){out.push(`<${listType}>${listItems.map((i:string)=>`<li>${inlineMarkdown(i)}</li>`).join('')}</${listType}>`);listItems.length=0;listType=null}};const ft=()=>{if(!tableRows.length)return;const[h,...b]=tableRows;out.push(`<table><thead><tr>${h.map((c:string)=>`<th>${inlineMarkdown(c.trim())}</th>`).join('')}</tr></thead><tbody>${b.map((r:string[])=>`<tr>${r.map((c:string)=>`<td>${inlineMarkdown(c.trim())}</td>`).join('')}</tr>`).join('')}</tbody></table>`);tableRows.length=0};for(const line of lines){const t=line.trim();if(!t){fi();fl();ft();continue}if(/^---+$/.test(t)){fi();fl();ft();out.push('<hr/>');continue}const hm=t.match(/^(#{1,4})\s+(.+)$/);if(hm){fi();fl();ft();const lv=Math.min(hm[1].length+1,5);out.push(`<h${lv}>${inlineMarkdown(hm[2])}</h${lv}>`);continue}const bq=t.match(/^>\s*(.*)$/);if(bq){fi();fl();ft();out.push(`<blockquote><p>${inlineMarkdown(bq[1])}</p></blockquote>`);continue}if(t.startsWith('|')){fi();fl();if(/^\|[-| :]+\|$/.test(t))continue;tableRows.push(t.replace(/^\||\|$/g,'').split('|'));continue}const ul=t.match(/^[-*]\s+(.+)$/);if(ul){fi();if(listType!=='ul'){fl();listType='ul'}ft();listItems.push(ul[1]);continue}const ol=t.match(/^\d+[.)]\s+(.+)$/);if(ol){fi();if(listType!=='ol'){fl();listType='ol'}ft();listItems.push(ol[1]);continue}fl();ft();para.push(line)}fi();fl();ft();return out.join('\n')}
