import {useEffect,useRef} from 'react';
import './rich-text-editor.css';

export function RichTextEditor({value,onChange,placeholder='Type content…'}:{value:string;onChange:(value:string)=>void;placeholder?:string}){
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(ref.current&&ref.current.innerHTML!==value)ref.current.innerHTML=value||''},[value]);
  const command=(name:string,argument?:string)=>{ref.current?.focus();document.execCommand(name,false,argument);onChange(ref.current?.innerHTML||'')};
  return <section className="rich-text-editor"><div className="rich-toolbar" role="toolbar" aria-label="Text formatting"><button type="button" title="Bold" onClick={()=>command('bold')}><b>B</b></button><button type="button" title="Italic" onClick={()=>command('italic')}><i>I</i></button><button type="button" title="Underline" onClick={()=>command('underline')}><u>U</u></button><button type="button" title="Bulleted list" onClick={()=>command('insertUnorderedList')}>• List</button><button type="button" title="Numbered list" onClick={()=>command('insertOrderedList')}>1. List</button><button type="button" title="Subscript" onClick={()=>command('subscript')}>X₂</button><button type="button" title="Superscript" onClick={()=>command('superscript')}>X²</button><button type="button" title="Remove formatting" onClick={()=>command('removeFormat')}>Clear</button></div><div ref={ref} className="rich-editable" contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={event=>onChange(event.currentTarget.innerHTML)} onBlur={event=>onChange(event.currentTarget.innerHTML)}/></section>;
}
