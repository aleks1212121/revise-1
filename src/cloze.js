export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const expression = /\{\{c([1-9]\d*)::([^{}]+?)\}\}/g;
export function deletions(text) {
 return [...String(text).matchAll(expression)].map(m => ({number:Number(m[1]),answer:m[2].split('::')[0],hint:m[2].split('::').slice(1).join('::')}));
}
export function renderCloze(text, number = 1, reveal = false) {
 let html='', offset=0;
 for (const match of String(text).matchAll(expression)) {
  html += escapeHTML(text.slice(offset,match.index));
  const [answer,...hint] = match[2].split('::');
  const active = Number(match[1]) === number;
  html += active ? `<mark class="cloze ${reveal?'revealed':''}">${escapeHTML(reveal?answer:`[${hint.join('::')||'…'}]`)}</mark>` : escapeHTML(answer);
  offset=match.index+match[0].length;
 }
 return html+escapeHTML(text.slice(offset));
}
export function clozeCards(note) {
 const numbers=[...new Set(deletions(note.text).map(c=>c.number))].sort((a,b)=>a-b);
 const noteId=note.noteId||crypto.randomUUID();
 return numbers.map(number=>({...note,noteId,id:crypto.randomUUID(),type:'cloze',clozeNumber:number,question:note.text,answer:deletions(note.text).filter(c=>c.number===number).map(c=>c.answer).join('; '),status:'new'}));
}
// Use only text explicitly present on a slide. Unsupported fragments stay in the source viewer.
export function draftCloze(line, emphasis=[]) {
 line=line.trim();
 if(line.length<20||line.length>350||/https?:|©|learning outcomes|references|objectives/i.test(line))return null;
 for(const term of emphasis){if(term.length>=3&&term.length<=65&&line.includes(term)&&term.length<line.length*.6)return line.replace(term,`{{c1::${term}}}`)}
 const definition=line.match(/^([^:]{3,65}):\s*(.{15,})$/);
 if(definition)return `{{c1::${definition[1].trim()}}}: ${definition[2]}`;
 const predicate=line.match(/^(.{3,90}?\b(?:contains?|have|has|lack|lacks|requires?|produces?|causes?|consists? of|composed of|made of|called|known as|classified as|include[sd]?))\s+(.{3,90}?)([.!]?)$/i);
 if(predicate)return `${predicate[1]} {{c1::${predicate[2]}}}${predicate[3]}`;
 const copula=line.match(/^(.{3,65}?)\s+(is|are)\s+(.{10,160})$/i);
 if(copula)return `{{c1::${copula[1]}}} ${copula[2]} ${copula[3]}`;
 return null;
}
