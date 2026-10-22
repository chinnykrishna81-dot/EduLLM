const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const inlineMarkdown = (value: string) => value
  .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/__([^_\n]+?)__/g, '<strong>$1</strong>')
  .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, '<em>$1</em>')
  .replace(/_([^_\n]+?)_/g, '<em>$1</em>')
  .replace(/`([^`]+)`/g, '<code>$1</code>');

function markdownBlocks(value: string) {
  const lines = value.split(/\r?\n/), output: string[] = [], paragraph: string[] = [], items: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  const flushParagraph = () => { if (paragraph.length) output.push(`<p>${paragraph.map(inlineMarkdown).join('<br>')}</p>`); paragraph.length = 0; };
  const flushList = () => { if (list && items.length) output.push(`<${list}>${items.map(item => `<li>${inlineMarkdown(item)}</li>`).join('')}</${list}>`); list = null; items.length = 0; };
  for (const line of lines) {
    const text = line.trim();
    if (!text) { flushParagraph(); flushList(); continue; }
    const heading = text.match(/^(#{1,4})\s+(.+)$/);
    if (heading) { flushParagraph(); flushList(); const level = Math.min(heading[1].length + 1, 5); output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`); continue; }
    const bullet = text.match(/^[-*]\s+(.+)$/), numbered = text.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) { flushParagraph(); const next = bullet ? 'ul' : 'ol'; if (list && list !== next) flushList(); list = next; items.push((bullet || numbered)![1]); continue; }
    if (/^---+$/.test(text)) { flushParagraph(); flushList(); output.push('<hr>'); continue; }
    const quote = text.match(/^>\s*(.+)$/);
    if (quote) { flushParagraph(); flushList(); output.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`); continue; }
    flushList(); paragraph.push(line);
  }
  flushParagraph(); flushList();
  return output.join('');
}

function sanitize(value: string) {
  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const allowed = new Set(['P','BR','B','STRONG','I','EM','U','UL','OL','LI','H2','H3','H4','H5','SUB','SUP','BLOCKQUOTE','HR','CODE','PRE','TABLE','THEAD','TBODY','TR','TH','TD','IMG','FIGURE','FIGCAPTION']);
  parsed.body.querySelectorAll('*').forEach(node => {
    if (!allowed.has(node.tagName)) { node.replaceWith(...Array.from(node.childNodes)); return; }
    Array.from(node.attributes).forEach(attribute => {
      const safeImage = node.tagName === 'IMG' && attribute.name === 'src' && /^(?:https?:\/\/|\/api\/|data:image\/)/i.test(attribute.value);
      const safeAlt = node.tagName === 'IMG' && attribute.name === 'alt';
      if (!safeImage && !safeAlt) node.removeAttribute(attribute.name);
    });
    if (node.tagName === 'IMG') { node.setAttribute('loading', 'lazy'); node.setAttribute('decoding', 'async'); }
  });
  return parsed.body.innerHTML;
}

function markdownInHtml(value: string) {
  const parsed = new DOMParser().parseFromString(value, 'text/html');
  const walker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach(node => {
    if (node.parentElement?.closest('code,pre') || !/(\*\*|__|`)/.test(node.data)) return;
    const template = parsed.createElement('template');
    template.innerHTML = inlineMarkdown(escapeHtml(node.data));
    node.replaceWith(template.content);
  });
  return parsed.body.innerHTML;
}

export function formattedTextHtml(value: unknown) {
  const source = String(value || '').trim();
  if (!source) return '';
  const hasHtml = /<[a-z][\s\S]*>/i.test(source);
  return sanitize(hasHtml ? markdownInHtml(source) : markdownBlocks(escapeHtml(source)));
}

export function FormattedText({ value, className }: { value: unknown; className?: string }) {
  const html = formattedTextHtml(value);
  return html ? <div className={className} dangerouslySetInnerHTML={{ __html: html }} /> : null;
}
