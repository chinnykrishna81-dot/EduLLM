import {useMemo,useState} from 'react';
import {RichTextEditor} from './RichTextEditor';
import {browserId} from './browserId';
import './question-detail-editor.css';

const uid=()=>`step-${browserId()}`;
const newStep=()=>({id:uid(),prompt:'',options:['',''],answer:'',marks:1,negativeMarks:0,isCritical:false,explanation:'',interactionType:'drag_point',mediaRefs:[],answerMediaRefs:[],explanationMediaRefs:[]});

export function QuestionDetailEditor({question,topics,close,save,remove,busy}:{question:any;topics:any[];close:()=>void;save:(value:any)=>void;remove:()=>void;busy:boolean}){
  const [draft,setDraft]=useState(()=>structuredClone(question)),type2=draft.type==='type2',subtopics=useMemo(()=>topics.find(item=>item.id===draft.topicId)?.subtopics||[],[topics,draft.topicId]);
  const change=(field:string,value:any)=>setDraft((current:any)=>({...current,[field]:value}));
  const changeStep=(index:number,field:string,value:any)=>setDraft((current:any)=>{const next=structuredClone(current);next.steps??=[];next.steps[index][field]=value;next.marks=next.steps.reduce((sum:number,item:any)=>sum+Number(item.marks||0),0);next.totalMarks=next.marks;return next});
  const valid=String(draft.question||'').trim()&&(type2?(draft.steps?.length>=2&&draft.steps.every((item:any)=>item.prompt&&item.answer&&Number(item.marks)>=0)):draft.correctAnswer&&draft.explanation);
  return <div className="question-detail-backdrop" onClick={close}><section className="question-detail" onClick={event=>event.stopPropagation()}><header><div><small>{draft.id}</small><h2>Review and edit question</h2></div><button onClick={close}>×</button></header><div className="question-detail-grid"><label>Question type<select value={draft.type} onChange={event=>{const value=event.target.value;setDraft((current:any)=>value==='type2'?{...current,type:value,format:'guided',steps:current.steps?.length>=2?current.steps:[newStep(),newStep()],finalAnswer:current.finalAnswer||current.explanation||'',marks:2,totalMarks:2}:{...current,type:value,format:'mcq',options:current.options||[],correctAnswer:current.correctAnswer||'',explanation:current.explanation||current.finalAnswer||'',marks:1})}}><option value="type1">Type 1</option><option value="type2">Type 2</option></select></label><label>Topic<select value={draft.topicId||''} onChange={event=>{change('topicId',event.target.value);change('subtopicId','')}}><option value="">Select Topic</option>{topics.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}</select></label><label>Subtopic<select value={draft.subtopicId||''} onChange={event=>change('subtopicId',event.target.value)}><option value="">Topic level / not assigned</option>{subtopics.map((item:any)=><option value={item.id} key={item.id}>{item.title}</option>)}</select></label><label>Difficulty<select value={draft.difficulty||'medium'} onChange={event=>change('difficulty',event.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><label>Pattern ID<input value={draft.patternId||''} onChange={event=>change('patternId',event.target.value)}/></label></div><label>Question text<textarea className="question-text-editor" value={draft.question||''} onChange={event=>change('question',event.target.value)}/></label>{!type2?<Type1Fields draft={draft} change={change}/>:<section className="type2-detail"><header><div><b>Guided Type 2 steps</b><small>Main marks are derived from step marks: {Number(draft.marks||0)}</small></div><button onClick={()=>setDraft((current:any)=>{const next=structuredClone(current);next.steps=[...(next.steps||[]),newStep()];next.marks=next.steps.reduce((sum:number,item:any)=>sum+Number(item.marks||0),0);next.totalMarks=next.marks;return next})}>+ Step</button></header>{(draft.steps||[]).map((item:any,index:number)=><article key={item.id}><header><b>Subquestion {index+1}</b><button disabled={draft.steps.length<=2} onClick={()=>setDraft((current:any)=>{const next=structuredClone(current);next.steps.splice(index,1);next.marks=next.steps.reduce((sum:number,value:any)=>sum+Number(value.marks||0),0);next.totalMarks=next.marks;return next})}>Delete</button></header><label>Subquestion<textarea value={item.prompt||''} onChange={event=>changeStep(index,'prompt',event.target.value)}/></label><label>Answer choices — one per line<textarea value={(item.options||[]).join('\n')} onChange={event=>changeStep(index,'options',event.target.value.split('\n'))}/></label><div className="question-detail-grid"><label>Correct answer<input value={item.answer||''} onChange={event=>changeStep(index,'answer',event.target.value)}/></label><label>Marks<input type="number" min="0" step="0.5" value={item.marks??1} onChange={event=>changeStep(index,'marks',Number(event.target.value))}/></label><label>Negative marks<input type="number" min="0" step="0.25" value={item.negativeMarks||0} onChange={event=>changeStep(index,'negativeMarks',Number(event.target.value))}/></label><label>Critical step<input type="checkbox" checked={Boolean(item.isCritical)} onChange={event=>changeStep(index,'isCritical',event.target.checked)}/></label></div><label>Step explanation<RichTextEditor value={item.explanation||''} onChange={value=>changeStep(index,'explanation',value)}/></label><label>Question image IDs<input value={(item.mediaRefs||[]).join(', ')} onChange={event=>changeStep(index,'mediaRefs',split(event.target.value))}/></label><label>Answer image IDs<input value={(item.answerMediaRefs||[]).join(', ')} onChange={event=>changeStep(index,'answerMediaRefs',split(event.target.value))}/></label></article>)}<label>Complete answer and explanation<RichTextEditor value={draft.finalAnswer||''} onChange={value=>change('finalAnswer',value)}/></label></section>}<div className="question-detail-grid"><label>Question image IDs<input value={(draft.mediaRefs||[]).join(', ')} onChange={event=>change('mediaRefs',split(event.target.value))}/></label><label>Use in Practice<input type="checkbox" checked={(draft.usage||[]).includes('chapter_practice')} onChange={event=>change('usage',toggle(draft.usage||[],'chapter_practice',event.target.checked))}/></label><label>Use in Cycle Test<input type="checkbox" checked={(draft.usage||[]).includes('cycle_test')} onChange={event=>change('usage',toggle(draft.usage||[],'cycle_test',event.target.checked))}/></label></div><footer><button className="delete" onClick={remove}>Delete question</button><span/><button onClick={close}>Cancel</button><button className="save" disabled={busy||!valid} onClick={()=>save({...draft,marks:type2?(draft.steps||[]).reduce((sum:number,item:any)=>sum+Number(item.marks||0),0):Number(draft.marks||1)})}>Save changes</button></footer></section></div>
}

const OPT_LETTERS = ['A','B','C','D','E','F'];

function Type1Fields({draft,change}:{draft:any;change:(field:string,value:any)=>void}){
  const opts:string[] = Array.isArray(draft.options) ? draft.options.slice(0,6) : ['','','',''];
  const setOpt=(i:number,val:string)=>{const next=[...opts];next[i]=val;change('options',next);};
  const addOpt=()=>{if(opts.length<6)change('options',[...opts,'']);};
  const removeOpt=()=>{
    if(opts.length<=2)return;
    const next=opts.slice(0,-1);
    if(!next.includes(draft.correctAnswer))change('correctAnswer','');
    change('options',next);
  };
  const correctIdx=opts.findIndex(o=>o&&o===draft.correctAnswer);
  return <section className="type1-detail">
    <div className="question-detail-grid">
      <label>Format<select value={draft.format||'mcq'} onChange={event=>change('format',event.target.value)}><option value="mcq">MCQ</option><option value="true_false">True / False</option><option value="fill_blank">Fill in the blank</option><option value="one_line">One line</option><option value="match">Match</option><option value="sequence">Sequence</option></select></label>
      <label>Marks<input type="number" min="0.5" step="0.5" value={draft.marks||1} onChange={event=>change('marks',Number(event.target.value))}/></label>
    </div>
    <div style={{marginBottom:16}}>
      <div style={{fontSize:13,fontWeight:600,marginBottom:8,color:'#1e293b'}}>Answer options <small style={{fontWeight:400,color:'#94a3b8'}}>({opts.length}/6) — click ○ to mark correct</small></div>
      {opts.map((opt,i)=>{
        const isCorrect=opt!==''&&opt===draft.correctAnswer;
        return <div key={i} style={{display:'flex',gap:8,alignItems:'center',marginBottom:7}}>
          <span style={{width:22,fontWeight:700,flexShrink:0,color:isCorrect?'#16a34a':'#56718c',fontSize:14}}>{OPT_LETTERS[i]}.</span>
          <input style={{flex:1,border:`1px solid ${isCorrect?'#86efac':'#e2e8f0'}`,borderRadius:6,padding:'6px 10px',fontSize:13}} value={opt} placeholder={`Option ${OPT_LETTERS[i]}`} onChange={e=>setOpt(i,e.target.value)}/>
          <input type="radio" name={`correct-${draft.id||'new'}`} checked={isCorrect} disabled={!opt} title="Mark as correct answer" style={{width:16,height:16,cursor:'pointer',accentColor:'#16a34a'}} onChange={()=>change('correctAnswer',opt)}/>
        </div>;
      })}
      <div style={{display:'flex',gap:8,marginTop:8}}>
        {opts.length<6&&<button type="button" style={{fontSize:12,padding:'4px 12px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer'}} onClick={addOpt}>+ Add option</button>}
        {opts.length>2&&<button type="button" style={{fontSize:12,padding:'4px 12px',borderRadius:6,border:'1px solid #e2e8f0',background:'#f8fafc',cursor:'pointer'}} onClick={removeOpt}>− Remove last</button>}
      </div>
    </div>
    <div style={{marginBottom:16,fontSize:13,color:correctIdx>=0?'#16a34a':'#dc2626',fontWeight:500}}>
      Correct: {correctIdx>=0?`${OPT_LETTERS[correctIdx]}. ${draft.correctAnswer}`:'not set — click ○ next to the correct option'}
    </div>
    <label>Explanation / justification<RichTextEditor value={draft.explanation||''} onChange={value=>change('explanation',value)}/></label>
  </section>;
}
function split(value:string){return value.split(',').map(item=>item.trim()).filter(Boolean)}
function toggle(values:string[],value:string,checked:boolean){return checked?[...new Set([...values,value])]:values.filter(item=>item!==value)}
