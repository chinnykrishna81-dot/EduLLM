import { useEffect, useRef, useState } from 'react';
import {API,platformApi} from './api';
import {RichTextEditor} from './RichTextEditor';
import './assessment-builder.css';

const ALL_DIFF = ['easy','medium','hard','competency'] as const;
type Diff = 'easy'|'medium'|'hard'|'competency';

// Difficulty sort weight — hard questions repeat first when all are used
const DIFF_WEIGHT: Record<string,number> = { competency:0, hard:1, medium:2, easy:3 };

const defaults = [
  {id:'section-1',title:'Section 1 · MCQ',       questionType:'type1',format:'mcq',       questionsPresented:5,questionsRequired:5,marksPerQuestion:1,difficulties:[...ALL_DIFF]},
  {id:'section-2',title:'Section 2 · Fill blanks',questionType:'type1',format:'fill_blank',questionsPresented:5,questionsRequired:5,marksPerQuestion:1,difficulties:[...ALL_DIFF]},
  {id:'section-3',title:'Section 3 · Short answer',questionType:'type2',format:'guided',   questionsPresented:5,questionsRequired:5,marksPerQuestion:3,difficulties:[...ALL_DIFF]},
  {id:'section-4',title:'Section 4 · Long answer', questionType:'type2',format:'guided',   questionsPresented:4,questionsRequired:3,marksPerQuestion:5,difficulties:['medium','hard']},
];

/** Return step marks when a type2 question is placed in a section */
function stepMarks(question: any, sectionMarksEach: number): number {
  const steps = question.steps?.length || 1;
  return Math.round((sectionMarksEach / steps) * 100) / 100;
}

// ── Cycle Test Preview helpers — replicate student CYK look ───────────────────

const S = {
  shell:    { fontFamily:'"72",Arial,sans-serif', fontSize:17, color:'#1d2d3e', background:'#f4f5f6' } as const,
  testCard: { background:'#fff', border:'2px solid #0788f5', padding:30, marginBottom:0 } as const,
  factGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, margin:'20px 0' } as const,
  fact:     { background:'#edf4fa', padding:14, fontSize:13 } as const,
  factVal:  { fontSize:18, fontWeight:800, display:'block' } as const,
  sectionBand: { background:'#0a6ed1', color:'#fff', padding:'14px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' } as const,
  qCard:    { background:'#fff', padding:26, margin:'0 0 0 0', borderLeft:'none', borderRight:'none', borderBottom:'1px solid #d0d8df' } as const,
  qLabel:   { color:'#0a6ed1', fontSize:12, fontWeight:800, letterSpacing:'.08em', display:'block', marginBottom:8 } as const,
  qText:    { fontSize:20, lineHeight:1.5, margin:'0 0 16px', fontWeight:650 } as const,
  optGrid:  { display:'grid', gap:10 } as const,
  optRow:   { display:'flex', alignItems:'center', gap:14, border:'2px solid #c2cbd3', padding:15, cursor:'default', background:'#fff' } as const,
  fillBox:  { border:'2px solid #aab8c4', borderRadius:4, padding:14, fontSize:17, color:'#90a0ae', fontStyle:'italic', marginTop:8 } as const,
  stepSec:  { borderTop:'1px solid #d5dce2', paddingTop:20, marginTop:20 } as const,
  stepLbl:  { fontWeight:700, display:'block', marginBottom:10 } as const,
  tray:     { display:'flex', flexWrap:'wrap' as const, gap:9, marginBottom:10 } as const,
  choice:   { display:'flex', alignItems:'center', gap:8, border:'1px solid #aebbc6', background:'#fff', padding:'11px 13px', cursor:'default', opacity:.85 } as const,
  dropZone: { border:'2px dashed #a8b7c3', background:'#f7f9fa', padding:13, color:'#51687b', fontSize:14 } as const,
  instr:    { color:'#50677b', margin:'0 0 14px', fontSize:16 } as const,
  stepMeta: { fontSize:11, color:'#6b8494', marginTop:6 } as const,
};

function FpType1({question,num,sectionMarks}:{question:any;num:number;sectionMarks:number}){
  const isFill = question.format==='fill_blank'||question.format==='one_line'||(question.options||[]).length===0;
  return <div style={S.qCard}>
    <span style={S.qLabel}>Q{num} · {String(question.format||'MCQ').replace('_',' ').toUpperCase()} · {sectionMarks} mark{sectionMarks!==1?'s':''}</span>
    <p style={S.qText}>{question.question}</p>
    {isFill
      ? <div style={S.fillBox}>Your answer: ___________________________</div>
      : <div style={S.optGrid}>
          {(question.options||[]).map((opt:string,i:number)=>(
            <label key={i} style={S.optRow}>
              <input type="radio" disabled style={{width:18,height:18,flexShrink:0}}/>
              <span>{opt}</span>
            </label>
          ))}
        </div>
    }
  </div>;
}

function FpType2({question,num,sectionMarks}:{question:any;num:number;sectionMarks:number}){
  const perStep = Math.round((sectionMarks/(question.steps?.length||1))*100)/100;
  return <div style={S.qCard}>
    <span style={S.qLabel}>Q{num} · GUIDED TYPE 2 · {sectionMarks} marks total</span>
    <p style={S.qText}>{question.question}</p>
    <p style={S.instr}>Choose or drag one answer for every step.</p>
    {(question.steps||[]).map((step:any,si:number)=>(
      <div key={step.id||si} style={S.stepSec}>
        <b style={S.stepLbl}>{si+1}. {step.prompt}</b>
        <div style={S.tray}>
          {(step.options||[]).map((opt:string,oi:number)=>(
            <button key={oi} style={S.choice} disabled><i style={{color:'#728596'}}>⠿</i>{opt}</button>
          ))}
        </div>
        <div style={S.dropZone}>Drop or select your answer here</div>
        <span style={S.stepMeta}>{perStep} mark{perStep!==1?'s':''}</span>
      </div>
    ))}
  </div>;
}

function FormPreview({form,sections,bank,testTitle,durationMinutes,totalMarks}:{
  form:any; sections:any[]; bank:any[];
  testTitle:string; durationMinutes:number; totalMarks:number;
}){
  let counter = 0;
  const sectionData = sections.map((section,si)=>{
    const fs = form.sections.find((x:any)=>x.sectionId===section.id);
    const qs = (fs?.questionIds||[]).map((id:string)=>bank.find((q:any)=>q.id===id)).filter(Boolean);
    return { section, si, questions: qs.map((q:any)=>({...q,globalNum:++counter})) };
  }).filter(sd=>sd.questions.length>0);

  return <div style={S.shell}>
    {/* ── Test card header ── */}
    <div style={S.testCard}>
      <small style={{ color:'#0a6ed1', fontSize:12, fontWeight:800, letterSpacing:'.08em' }}>
        CYCLE TEST · FORM {form.number}
      </small>
      <h2 style={{ fontSize:28, margin:'8px 0 20px', lineHeight:1.2 }}>{testTitle}</h2>
      <div style={S.factGrid}>
        {([
          ['Total Marks', totalMarks],
          ['Duration',    `${durationMinutes} min`],
          ['Sections',    sections.length],
          ['Results in',  `${form.resultDelayHours??24} hrs`],
        ] as [string,any][]).map(([label,val])=>(
          <div key={label} style={S.fact}>
            <span style={S.factVal}>{val}</span>{label}
          </div>
        ))}
      </div>
    </div>

    {counter===0 && <p style={{padding:20,color:'#8a6a5a',fontStyle:'italic',fontSize:13}}>No questions selected in this form yet.</p>}

    {/* ── Sections ── */}
    {sectionData.map(({section,si,questions})=>{
      const first = questions[0].globalNum, last = questions[questions.length-1].globalNum;
      return <div key={section.id} style={{marginTop:20}}>
        <div style={S.sectionBand}>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>Section {si+1}: {section.title}</div>
            <div style={{fontSize:12,opacity:.85,marginTop:3}}>
              Q{first}–Q{last} · {section.questionType.toUpperCase()} · {section.marksPerQuestion} mark{section.marksPerQuestion!==1?'s':''} each
            </div>
          </div>
          <div style={{fontWeight:800,fontSize:20,letterSpacing:-.5}}>
            {questions.length*section.marksPerQuestion} M
          </div>
        </div>
        <div style={{border:'1px solid #d0d8df',borderTop:'none'}}>
          {questions.map((q:any)=>
            q.type==='type1'
              ? <FpType1 key={q.id} question={q} num={q.globalNum} sectionMarks={section.marksPerQuestion}/>
              : <FpType2 key={q.id} question={q} num={q.globalNum} sectionMarks={section.marksPerQuestion}/>
          )}
        </div>
      </div>;
    })}
  </div>;
}

export function AssessmentBuilder({kind,value,sourceBank=[],topics=[],chapterId,busy,close,save}:{
  kind:'Cycle Test'|'Semester Test'; value:any; sourceBank?:any[];
  topics?:any[];
  questionCount?:number; chapterId?:string; busy:boolean;
  close:()=>void; save:(value:any)=>Promise<void>|void;
}){
  const [data,setData] = useState<any>({
    title:            value?.title || kind,
    totalMarks:       value?.totalMarks || 40,
    durationMinutes:  value?.durationMinutes || (kind==='Cycle Test' ? 40 : 90),
    resultDelayHours: value?.resultDelayHours ?? 24,
    retakeAfterDays:  value?.retakeAfterDays || 30,
    formCycleCount:   value?.formCycleCount || 5,
    practicePercent:  value?.practicePercent ?? 0,
    competencyQuestionsPerForm: value?.competencyQuestionsPerForm ?? 1,
    competencyRepeatLimit: value?.competencyRepeatLimit ?? 0,
    importantTopicIds: value?.importantTopicIds || [],
    greenPercent:     value?.mastery?.greenPercent ?? 90,
    yellowPercent:    value?.mastery?.yellowPercent ?? 60,
    sections:         value?.sections?.length
                        ? value.sections.map((s:any) => ({difficulties:[...ALL_DIFF],...s}))
                        : defaults,
    questionBank:     sourceBank.length ? sourceBank : (value?.questionBank || []),
    forms:            value?.forms || [],
  });

  const [active,setActive]   = useState(1);
  const [preview,setPreview] = useState(false);
  const [message,setMessage] = useState('');
  const [saveErr,setSaveErr] = useState('');
  const [media,setMedia]     = useState<any[]>([]);
  const prevSectionsRef = useRef<any>(null);

  const mediaChapterId = chapterId || sourceBank[0]?.chapterId;
  useEffect(()=>{
    if(mediaChapterId) platformApi.chapterMedia(mediaChapterId).then(setMedia).catch(()=>setMedia([]));
  },[mediaChapterId]);

  const update = (key:string, next:any) => setData((c:any)=>({...c,[key]:next}));
  const topicOptions = topics.length ? topics : [...new Set(data.questionBank.map((q:any)=>q.topicId).filter(Boolean))].map(id=>({id,title:id}));
  const unmappedQuestions = data.questionBank.filter((q:any)=>!q.topicId).length;

  // Keep form count in sync
  useEffect(()=>{
    setData((c:any)=>({...c,forms:Array.from({length:c.formCycleCount},(_,i)=>
      c.forms[i] || {number:i+1,status:'draft',sections:c.sections.map((s:any)=>({sectionId:s.id,questionIds:[]}))}
    )}));
    setActive(n => Math.min(n, data.formCycleCount));
  },[data.formCycleCount]);

  // When section structure changes after initial load: wipe questionIds so stale
  // assignments don't survive into the new structure — user must re-propose.
  // Uses a ref comparison instead of didMount so React Strict Mode's double-invoke
  // doesn't wipe pre-loaded form question IDs on the second fire.
  useEffect(()=>{
    const prev = prevSectionsRef.current;
    prevSectionsRef.current = data.sections;
    if(prev === null || prev === data.sections) return;
    setData((c:any)=>{
      const newMarks=c.sections.reduce((n:number,s:any)=>n+Number(s.questionsRequired)*Number(s.marksPerQuestion),0);
      return {
        ...c,
        totalMarks:newMarks,
        forms:c.forms.map((paper:any)=>({
          ...paper,status:'draft',
          sections:c.sections.map((s:any)=>({sectionId:s.id,questionIds:[]}))
        }))
      };
    });
  },[data.sections]);

  const paper    = data.forms[active-1];
  const selected = (id:string) => paper?.sections.find((x:any)=>x.sectionId===id)?.questionIds || [];

  /** Questions from bank that match section criteria.
   *  For type2: marks are normalized to sectionMarksPerQuestion so no marks filter.
   *  For type1: exact marks match required. */
  const eligible = (s:any): any[] => {
    const diffs: string[] = s.difficulties?.length ? s.difficulties : [...ALL_DIFF];
    return data.questionBank.filter((q:any) => {
      if(q.type !== s.questionType) return false;
      if(!diffs.includes(q.difficulty || 'medium')) return false;
      if(s.questionType === 'type1') {
        if(Number(q.marks ?? q.totalMarks) !== Number(s.marksPerQuestion)) return false;
        if(s.format !== 'mixed' && q.format !== s.format) return false;
      }
      return true;
    });
  };

  const complete = (p:any) => data.sections.every((s:any) =>
    (p?.sections.find((x:any)=>x.sectionId===s.id)?.questionIds.length||0) === Number(s.questionsPresented)
  );

  const choose = (sectionId:string, ids:string[]) =>
    update('forms', data.forms.map((p:any,i:number) =>
      i===active-1 ? {...p,status:'draft',sections:p.sections.map((s:any)=>s.sectionId===sectionId?{...s,questionIds:ids}:s)} : p
    ));

  const marks = data.sections.reduce((n:number,s:any) => n + Number(s.questionsRequired)*Number(s.marksPerQuestion), 0);

  // ── Form proposal algorithm ────────────────────────────────────────────────
  const proposeForms = () => {
    // Track usage across the complete test. Type 2 questions can qualify for
    // multiple sections, so section-local counts can leave questions unused.
    const usageCounts = new Map<string, number>();
    const topicUsage = new Map<string, number>();
    const patternUsage = new Map<string, number>();
    const importantTopics = new Set<string>(data.importantTopicIds || []);

    const isPractice = (q: any) => (q.usage || []).includes('chapter_practice');
    const topicKey = (q:any) => q.topicId || `pattern:${q.patternId || 'unmapped'}`;
    const patternKey = (q:any) => q.patternId || q.id;
    const topicWeight = (q:any) => importantTopics.has(q.topicId) ? 1.5 : 1;

    // Sort priority within a section:
    //   1. Truly unused in this section (count=0) AND not a practice question → exhausted first
    //   2. Unused in this section (count=0) AND is a practice question → practice is secondary pool
    //   3. Already used in this section (count>0) → repeat only as last resort
    //   Within each tier: hard → medium → easy
    const sortForSection = (pool: any[], topicCountsInForm:Map<string,number>, patternCountsInForm:Map<string,number>) =>
      [...pool].sort((a, b) => {
        const ca = usageCounts.get(a.id) || 0, cb = usageCounts.get(b.id) || 0;
        const ua = ca === 0 ? 0 : 1, ub = cb === 0 ? 0 : 1;
        if (ua !== ub) return ua - ub;                    // consume every unused question first
        const ta=topicKey(a),tb=topicKey(b),wa=topicWeight(a),wb=topicWeight(b);
        const formTopic=(topicCountsInForm.get(ta)||0)/wa-(topicCountsInForm.get(tb)||0)/wb;
        if(formTopic!==0)return formTopic;
        const formPattern=(patternCountsInForm.get(patternKey(a))||0)-(patternCountsInForm.get(patternKey(b))||0);
        if(formPattern!==0)return formPattern;
        const totalTopic=(topicUsage.get(ta)||0)/wa-(topicUsage.get(tb)||0)/wb;
        if(totalTopic!==0)return totalTopic;
        const totalPattern=(patternUsage.get(patternKey(a))||0)-(patternUsage.get(patternKey(b))||0);
        if(totalPattern!==0)return totalPattern;
        const pa = isPractice(a) ? 1 : 0, pb = isPractice(b) ? 1 : 0;
        if (ua === 0 && pa !== pb) return pa - pb;
        const difficulty = (DIFF_WEIGHT[a.difficulty || 'medium'] ?? 1) - (DIFF_WEIGHT[b.difficulty || 'medium'] ?? 1);
        if (difficulty !== 0) return difficulty;
        if (ca !== cb) return ca - cb;
        return String(a.id).localeCompare(String(b.id));
      });

    const pickFrom = (pool:any[], need:number, usedInForm:Set<string>, groupsInForm:Set<string>, topicCountsInForm:Map<string,number>, patternCountsInForm:Map<string,number>, allowed?:(q:any)=>boolean) => {
      const chosen: any[] = [];
      while(chosen.length<need){
        const candidates=sortForSection(pool.filter((q:any)=>{
          const group=q.duplicateGroupId||q.id;
          return !usedInForm.has(q.id)&&!groupsInForm.has(group)&&(!allowed||allowed(q));
        }),topicCountsInForm,patternCountsInForm);
        const q=candidates[0];
        if(!q)break;
        const group=q.duplicateGroupId||q.id,topic=topicKey(q),pattern=patternKey(q);
        chosen.push(q);
        usedInForm.add(q.id);
        groupsInForm.add(group);
        usageCounts.set(q.id, (usageCounts.get(q.id) || 0) + 1);
        topicCountsInForm.set(topic,(topicCountsInForm.get(topic)||0)+1);
        patternCountsInForm.set(pattern,(patternCountsInForm.get(pattern)||0)+1);
        topicUsage.set(topic,(topicUsage.get(topic)||0)+1);
        patternUsage.set(pattern,(patternUsage.get(pattern)||0)+1);
      }
      return chosen;
    };

    const forms = Array.from({length: data.formCycleCount}, (_, formIndex) => {
      const usedInForm   = new Set<string>();
      const groupsInForm = new Set<string>();
      const topicCountsInForm=new Map<string,number>();
      const patternCountsInForm=new Map<string,number>();
      const competencyEnabled=data.sections.some((section:any)=>section.questionType==='type2'&&(section.difficulties||ALL_DIFF).includes('competency'));
      let competencyRemaining=competencyEnabled?Math.max(0,Number(data.competencyQuestionsPerForm||0)):0;
      const competencyUseCap=1+Math.max(0,Number(data.competencyRepeatLimit||0));

      const sections = data.sections.map((section: any) => {
        const pool    = eligible(section);
        const needed  = Number(section.questionsPresented);
        const competencyPool=section.questionType==='type2'?pool.filter((q:any)=>q.difficulty==='competency'):[];
        const competencyChosen=pickFrom(competencyPool,Math.min(needed,competencyRemaining),usedInForm,groupsInForm,topicCountsInForm,patternCountsInForm,(q:any)=>(usageCounts.get(q.id)||0)<competencyUseCap);
        competencyRemaining-=competencyChosen.length;
        const regularPool=pool.filter((q:any)=>q.difficulty!=='competency');
        const chosen=[...competencyChosen,...pickFrom(regularPool,needed-competencyChosen.length,usedInForm,groupsInForm,topicCountsInForm,patternCountsInForm)];

        return {
          sectionId:        section.id,
          questionIds:      chosen.map((q: any) => q.id),
          marksPerQuestion: section.marksPerQuestion,
        };
      });

      return { number: formIndex + 1, status: 'draft', sections,competencyShortfall:competencyRemaining };
    });

    // Build summary stats
    const totalEligible = new Set(data.sections.flatMap((s: any) => eligible(s).map((q: any) => q.id))).size;
    const allUsed = new Set(usageCounts.keys());
    const practiceUsed = [...allUsed].filter(id => {
      const q = data.questionBank.find((q: any) => q.id === id);
      return q && isPractice(q);
    }).length;
    const unusedCount = totalEligible - allUsed.size;
    const sectionCounts = new Map([['All eligible questions', usageCounts]]);

    // Per-section repeat info
    const repeatLines: string[] = [];
    sectionCounts.forEach((m, secId) => {
      const sec = data.sections.find((s: any) => s.id === secId);
      const maxUse = Math.max(0, ...[...m.values()]);
      if (maxUse > 1) repeatLines.push(`${sec?.title || secId}: max ${maxUse} reuses`);
    });

    update('forms', forms);
    setMessage([
      `${forms.length} form(s) proposed.`,
      `${allUsed.size} of ${totalEligible} unique eligible questions used`,
      practiceUsed > 0 ? `(${practiceUsed} practice questions included).` : '.',
      unusedCount > 0
        ? `${unusedCount} question(s) not used — increase form count or broaden section criteria to cover the full bank.`
        : 'All eligible questions covered.',
      repeatLines.length ? `Repeats: ${repeatLines.join('; ')}.` : '',
      forms.some((form:any)=>form.competencyShortfall>0)?`Competency quota could not be filled in ${forms.filter((form:any)=>form.competencyShortfall>0).length} form(s); add more competency questions, allow more repeats, or increase Type 2 capacity.`:'Competency quota satisfied for every form.',
    ].filter(Boolean).join(' '));
  };

  const updateSectionDiff = (i:number, diff:Diff, checked:boolean) => {
    update('sections', data.sections.map((x:any,n:number) => {
      if(n!==i) return x;
      const prev: string[] = x.difficulties || [...ALL_DIFF];
      return {...x, difficulties: checked ? [...prev,diff] : prev.filter((d:string)=>d!==diff)};
    }));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return <section className="assessment-editor">
    <header>
      <div>
        <small>TEACHER ASSESSMENT BUILDER</small>
        <h2>{value?'Edit':'Add'} {kind}</h2>
        <p>Configure section structure and reusable attempt forms.</p>
      </div>
      <button onClick={close}>× Close</button>
    </header>

    {/* Settings */}
    <div className="assessment-fields">
      {([
        ['Test title',              'title',            'text'  ],
        ['Total marks',             'totalMarks',       'number'],
        ['Duration minutes',        'durationMinutes',  'number'],
        ['Result delay hours',      'resultDelayHours', 'number'],
        ['Retake after days',       'retakeAfterDays',  'number'],
        ['Forms in cycle (max 8)', 'formCycleCount',   'number'],
        ['Competency questions / form','competencyQuestionsPerForm','number'],
        ['Allowed repeats / competency question','competencyRepeatLimit','number'],
        ['Green at %',              'greenPercent',     'number'],
        ['Yellow at %',             'yellowPercent',    'number'],
      ] as [string,string,string][]).map(([label,key,type])=>
        <label key={key}>{label}
          <input type={type} value={data[key]}
            min={key==='formCycleCount'?1:type==='number'?0:undefined}
            max={key==='formCycleCount'?8:undefined}
            onChange={e=>{
              let v:any = type==='number' ? Number(e.target.value) : e.target.value;
              if(key==='formCycleCount') v = Math.min(8, Math.max(1, v));
              update(key, v);
            }}/>
        </label>
      )}
      <p className="practice-pct-hint">Competency questions are Type 2 questions marked with competency complexity. The proposal prioritizes different topics in each form. Allowed repeats means additional uses after the question's first use; 0 prevents reuse across forms.</p>
      {/* Practice composition — full-width row below the grid */}
      <label className="practice-pct-field">
        Practice questions in each form
        <div className="practice-pct-row">
          <input type="number" min="0" max="100" value={data.practicePercent}
            onChange={e=>update('practicePercent', Math.min(100,Math.max(0,Number(e.target.value))))}/>
          <span className="practice-pct-hint">
            % of each section drawn from questions tagged "chapter_practice".
            0 = no restriction — all eligible questions fill forms equally.
          </span>
        </div>
      </label>
      {kind==='Cycle Test'&&<div className="topic-priority-field">
        <div><b>Topic weightage</b><span>Select important topics to give them approximately 1.5× weight while keeping all other topics balanced.</span></div>
        <div className="topic-priority-grid">
          {topicOptions.map((topic:any)=>{
            const checked=(data.importantTopicIds||[]).includes(topic.id);
            const count=data.questionBank.filter((q:any)=>q.topicId===topic.id).length;
            return <label className={checked?'important':''} key={topic.id}>
              <input type="checkbox" checked={checked} onChange={()=>update('importantTopicIds',checked?(data.importantTopicIds||[]).filter((id:string)=>id!==topic.id):[...(data.importantTopicIds||[]),topic.id])}/>
              <span><b>{topic.title||topic.id}</b><small>{count} mapped question{count===1?'':'s'}{checked?' · Important':''}</small></span>
            </label>;
          })}
        </div>
        {unmappedQuestions>0&&<p className="topic-mapping-warning"><b>{unmappedQuestions} question(s) are not mapped to a topic.</b> They will be balanced by Pattern ID until you assign their patterns under Question Bank → Pattern Topics.</p>}
      </div>}
    </div>

    {/* 1 · Section Structure */}
    <details open className="assessment-stage">
      <summary>
        1 · Section Structure&nbsp;
        <span className={marks===Number(data.totalMarks)?'marks-ok':'marks-warn'}>
          {marks}/{data.totalMarks} marks
        </span>
      </summary>
      <div className="section-builder">
        <header>
          <b>Paper sections</b>
          <button onClick={()=>update('sections',[...data.sections,{
            id:`section-${Date.now()}`,title:`Section ${data.sections.length+1}`,
            questionType:'type1',format:'mixed',questionsPresented:1,questionsRequired:1,
            marksPerQuestion:1,difficulties:[...ALL_DIFF]
          }])}>+ Add section</button>
        </header>
        {data.sections.map((s:any,i:number)=>(
          <div className="section-row" key={s.id}>
            <label>Section title
              <input value={s.title}
                onChange={e=>update('sections',data.sections.map((x:any,n:number)=>n===i?{...x,title:e.target.value}:x))}/>
            </label>

            <label>Type
              <select value={s.questionType}
                onChange={e=>update('sections',data.sections.map((x:any,n:number)=>n===i?{...x,questionType:e.target.value}:x))}>
                <option value="type1">Type 1</option>
                <option value="type2">Type 2</option>
              </select>
            </label>

            <div className="section-difficulties">
              <span className="diff-label">Complexity</span>
              {ALL_DIFF.filter(d=>s.questionType==='type2'||d!=='competency').map(d=>{
                const diffs: string[] = s.difficulties || [...ALL_DIFF];
                return <label key={d} className={`diff-chip${diffs.includes(d)?' on':''}`}>
                  <input type="checkbox" checked={diffs.includes(d)}
                    onChange={e=>updateSectionDiff(i,d,e.target.checked)}/>
                  {d}
                </label>;
              })}
            </div>

            {([['Show','questionsPresented'],['Answer','questionsRequired'],['Marks each','marksPerQuestion']] as [string,string][]).map(([label,key])=>
              <label key={key}>{label}
                <input type="number" min="1" value={s[key]}
                  onChange={e=>update('sections',data.sections.map((x:any,n:number)=>n===i?{...x,[key]:Number(e.target.value)}:x))}/>
              </label>
            )}

            <button onClick={()=>update('sections',data.sections.filter((_:any,n:number)=>n!==i))}>×</button>
          </div>
        ))}
      </div>
    </details>

    {/* 2 · Attempt Forms */}
    <details open className="assessment-stage">
      <summary>2 · Attempt Forms <span>{data.forms.filter(complete).length}/{data.formCycleCount} complete</span></summary>

      <div className="form-proposal">
        <button onClick={proposeForms}>Propose all {data.formCycleCount} forms</button>
        <button className="btn-danger-outline" disabled={busy} onClick={async ()=>{
          if(!window.confirm(`Delete all ${data.formCycleCount} forms? Stats will update immediately.`)) return;
          // Immediately persist deletion to DB so both apps stay in sync
          if(chapterId) {
            try { await platformApi.deleteCycleTestForms(chapterId); }
            catch(e:any){ setMessage(`Delete failed: ${e.message}`); return; }
          }
          setData((c:any)=>({...c,forms:Array.from({length:c.formCycleCount},(_,i)=>
            ({number:i+1,status:'draft',sections:c.sections.map((s:any)=>({sectionId:s.id,questionIds:[]}))})
          )}));
          setMessage('All forms deleted. Click "Propose" to regenerate or fill in manually.');
          setActive(1);
        }}>Delete all forms</button>
        <span>
          Questions drawn from the bank by type · complexity · format.
          Unused questions fill first; hard questions repeat before medium/easy when cycling.
        </span>
      </div>
      {message && <p className="proposal-message">{message}</p>}

      <div className="form-tabs">
        {data.forms.map((p:any)=>(
          <button className={p.number===active?'active':''} onClick={()=>setActive(p.number)} key={p.number}>
            Form {p.number}
            <small>{p.status==='approved'?'✓ Approved':complete(p)?'Ready':'Incomplete'}</small>
          </button>
        ))}
        <button className={`preview-toggle${preview?' active':''}`} onClick={()=>setPreview(v=>!v)}>
          {preview?'← Edit':'Preview ▶'}
        </button>
      </div>

      {paper && !preview && <div className="paper-builder">
        {data.sections.map((s:any)=>{
          const pool = eligible(s);
          const diffs: string[] = s.difficulties || [...ALL_DIFF];
          return <section key={s.id}>
            <header>
              <div>
                <b>{s.title}</b>
                <span>
                  {s.questionType.toUpperCase()} · {diffs.join('/')} · {s.questionsPresented} questions · {s.marksPerQuestion} marks each
                  {s.questionType==='type2'&&<em> (step marks = {s.marksPerQuestion}/steps)</em>}
                </span>
              </div>
              <strong>{selected(s.id).length}/{s.questionsPresented}</strong>
            </header>
            <div className="question-picker">
              {pool.map((q:any)=>{
                const checked = selected(s.id).includes(q.id);
                const stMark = s.questionType==='type2' && q.steps?.length
                  ? stepMarks(q, s.marksPerQuestion) : null;
                return <label className={checked?'selected':''} key={q.id}>
                  <input type="checkbox" checked={checked}
                    disabled={!checked && selected(s.id).length >= s.questionsPresented}
                    onChange={()=>choose(s.id, checked
                      ? selected(s.id).filter((id:string)=>id!==q.id)
                      : [...selected(s.id), q.id]
                    )}/>
                  <span>
                    <span className="q-badges">
                      <b className={`diff-badge diff-${q.difficulty||'medium'}`}>{q.difficulty||'medium'}</b>
                      {stMark && <b className="marks-badge">{stMark} × {q.steps.length} steps</b>}
                    </span>
                    {q.question}
                    <small>{q.topicId} · {q.marks??q.totalMarks} marks in bank</small>
                  </span>
                </label>;
              })}
              {!pool.length && <p className="no-match">
                No {s.questionType.toUpperCase()} questions matching {diffs.join('/')}
                {s.questionType==='type1'&&` · ${s.marksPerQuestion} marks`} in the question bank.
              </p>}
            </div>
          </section>;
        })}
        <footer>
          <span>{complete(paper)?'All required questions selected.':'Complete each section before approval.'}</span>
          <button disabled={!complete(paper)} onClick={()=>update('forms',data.forms.map((p:any,i:number)=>
            i===active-1?{...p,status:p.status==='approved'?'draft':'approved'}:p
          ))}>
            {paper.status==='approved'?'Return to Draft':`Approve Form ${active}`}
          </button>
        </footer>
      </div>}

      {paper && preview && <FormPreview
        form={{...paper, resultDelayHours: data.resultDelayHours}}
        sections={data.sections}
        bank={data.questionBank}
        testTitle={data.title}
        durationMinutes={data.durationMinutes}
        totalMarks={data.totalMarks}
      />}
    </details>

    <footer>
      <p>Attempt {data.formCycleCount+1} repeats Form 1. Step marks for Type 2 = section marks ÷ number of steps.</p>
      {saveErr && <p className="proposal-message" style={{color:'#dc2626'}}>{saveErr}</p>}
      <button className="accent" disabled={busy||marks!==Number(data.totalMarks)} onClick={async()=>{
        setSaveErr('');
        try {
          await save(data);
          // Refresh question bank so usage tags reflect the saved state
          if(chapterId) {
            try {
              const fresh = await platformApi.chapterQuestions(chapterId);
              update('questionBank', fresh);
            } catch {}
          }
        } catch(e:any) {
          setSaveErr(e.message || 'Save failed');
        }
      }}>
        Save {kind}
      </button>
    </footer>
  </section>;
}

function MediaChooser({title,media,value,change}:{title:string;media:any[];value:string[];change:(value:string[])=>void}){
  return <details className="assessment-media-chooser">
    <summary>{title} <span>{value.length} selected</span></summary>
    {media.length
      ?<div>{media.map(item=><label key={item.fileName}><input type="checkbox" checked={value.includes(item.fileName)} onChange={()=>change(value.includes(item.fileName)?value.filter(n=>n!==item.fileName):[...value,item.fileName])}/><img src={`${API}${item.url}`} alt={item.altText}/><span>{item.fileName}</span></label>)}</div>
      :<p>No images in this Chapter library.</p>}
  </details>;
}
