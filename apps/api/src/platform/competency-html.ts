import sanitizeHtml from 'sanitize-html';

export type CompetencyHtmlDocument={html:string;patternIds:string[];warnings:string[]};

const unsafeChecks:Array<[RegExp,string]>=[
  [/<\s*(script|iframe|frame|object|embed|form|input|button|textarea|select|base)\b/i,'Executable or form elements are not allowed'],
  [/\son[a-z]+\s*=/i,'Inline event handlers are not allowed'],
  [/(?:javascript|vbscript):/i,'Script URLs are not allowed'],
  [/url\(\s*['"]?https?:/i,'External CSS resources are not allowed'],
  [/<\s*(?:link|img|video|audio|source)\b[^>]+(?:href|src)\s*=\s*['"]https?:/i,'External network resources are not allowed'],
  [/\bexpression\s*\(/i,'Unsafe CSS is not allowed'],
  [/(?:<style\b[^>]*>[^<]*|\sstyle\s*=\s*["'][^"']*)\bbehavior\s*:/i,'Unsafe CSS is not allowed']
];

export function secureCompetencyHtml(source:string):CompetencyHtmlDocument{
  if(!source.trim())throw new Error('The HTML file is empty');
  if(source.includes('\uFFFD'))throw new Error('The HTML must use UTF-8 encoding');
  const warnings:string[]=[];let inspected=source.replace(/@import\s+(?:url\()?\s*['"]?https?:[^;]+;?/gi,()=>{warnings.push('An external CSS font/import was removed; local fallback typography will be used.');return''});
  for(const [pattern,message] of unsafeChecks)if(pattern.test(inspected))throw new Error(message);
  const clean=sanitizeHtml(inspected,{
    allowedTags:['html','head','meta','title','style','body','main','nav','article','section','header','footer','aside','div','span','p','br','hr','h1','h2','h3','h4','h5','h6','strong','b','em','i','u','small','mark','blockquote','pre','code','ul','ol','li','table','thead','tbody','tfoot','tr','th','td','figure','figcaption','details','summary','a','img','sub','sup'],
    allowedAttributes:{'*':['id','class','title','role','aria-*','data-*','style'],a:['href','target'],img:['src','alt','width','height','loading']},
    allowedSchemes:['data'],allowedSchemesByTag:{a:[''],img:['data']},allowProtocolRelative:false,
    exclusiveFilter:frame=>frame.tag==='a'&&Boolean(frame.attribs?.href&&!frame.attribs.href.startsWith('#')),
    transformTags:{img:(tagName,attribs)=>({tagName,attribs:{...attribs,loading:'lazy'}})}
  });
  const articlePatternIds=[...clean.matchAll(/<article\b[^>]*>/gi)].flatMap(match=>{
    const tag=match[0],className=tag.match(/\bclass=["']([^"']*)["']/i)?.[1]||'',id=tag.match(/\bid=["']([^"']+)["']/i)?.[1];
    return /(?:^|\s)pattern-page(?:\s|$)/.test(className)&&id?[id]:[];
  });
  const patternIds=[...new Set([
    ...articlePatternIds,
    ...[...clean.matchAll(/\bdata-pattern-id=["']([^"']+)["']/gi)].map(match=>match[1])
  ])];
  if(!patternIds.length)throw new Error('No competency pattern sections were found. Add article.pattern-page elements with stable id values.');
  const csp=`default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; script-src 'none'; connect-src 'none'; media-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'`;
  const withoutMeta=clean.replace(/<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,'');
  const html=/<html\b/i.test(withoutMeta)?withoutMeta.replace(/<head([^>]*)>/i,`<head$1><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}">`):`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${csp}"></head><body>${withoutMeta}</body></html>`;
  return{html,patternIds,warnings};
}
