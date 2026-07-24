import {useState} from 'react';
import {RichTextEditor} from './RichTextEditor';
import './chapter-resources-editor.css';

type Props={
  view:'smart'|'graph';
  smartNotes:any; knowledgeGraph:any; busy:boolean;
  changeSmart:(value:any)=>void; changeGraph:(value:any)=>void;
  upload:(type:'smart-notes'|'knowledge-graph',file:File,mode:'append'|'overwrite')=>Promise<void>;
};

export function ChapterResourcesEditor({view,smartNotes,knowledgeGraph,busy,changeSmart,changeGraph,upload}:Props){
  const [smartMode,setSmartMode]=useState<'append'|'overwrite'>('append');
  const notes=smartNotes||{title:'Smart Notes',richContent:'',documents:[]};
  const graph=knowledgeGraph||{title:'Knowledge Graph',description:''};
  return <section className="chapter-resource-editor">
    {view==='smart'&&<details open><summary><span><b>Smart Notes</b><small>Exam-ready teacher notes and answer-writing guidance</small></span><strong>{notes.documents?.length||0} file(s)</strong></summary>
      <div className="resource-body">
        <label>Section title<input value={notes.title} onChange={event=>changeSmart({...notes,title:event.target.value})}/></label>
        <RichTextEditor value={notes.richContent||''} onChange={richContent=>changeSmart({...notes,richContent})} placeholder="Paste or write exam-ready notes, formulas, equations and answer-writing guidance…"/>
        <div className="resource-upload-row"><label>Upload behaviour<select value={smartMode} onChange={event=>setSmartMode(event.target.value as any)}><option value="append">Append to existing notes</option><option value="overwrite">Overwrite existing uploaded notes</option></select></label><label className="resource-file">Upload DOCX or PDF · max 5 MB<input disabled={busy} type="file" accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event=>{const file=event.target.files?.[0];if(file)upload('smart-notes',file,smartMode);event.currentTarget.value=''}}/></label></div>
        {!!notes.documents?.length&&<ul className="resource-files">{notes.documents.map((item:any)=><li key={item.id}><b>{item.fileName}</b><span>{(item.byteSize/1024/1024).toFixed(2)} MB</span></li>)}</ul>}
      </div>
    </details>}
    {view==='graph'&&<details open><summary><span><b>Knowledge Graph</b><small>Single-page mind map connecting the Chapter concepts</small></span><strong>{graph.resource?'Ready':'Not uploaded'}</strong></summary>
      <div className="resource-body">
        <label>Section title<input value={graph.title} onChange={event=>changeGraph({...graph,title:event.target.value})}/></label>
        <label>Description<textarea value={graph.description||''} onChange={event=>changeGraph({...graph,description:event.target.value})} placeholder="Optional guidance for using this visual map"/></label>
        <label className="resource-file">{graph.resource?'Replace Knowledge Graph':'Upload Knowledge Graph'} · max 5 MB<input disabled={busy} type="file" accept=".jpg,.jpeg,.png,.pdf,.docx,image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event=>{const file=event.target.files?.[0];if(file)upload('knowledge-graph',file,'overwrite');event.currentTarget.value=''}}/></label>
        {graph.resource&&<p className="resource-current"><b>{graph.resource.fileName}</b><span>{(graph.resource.byteSize/1024/1024).toFixed(2)} MB · replaces the prior active graph</span></p>}
      </div>
    </details>}
  </section>;
}
