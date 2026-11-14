import {MODULES,moduleFor} from './modules.js';
import {weekLabel} from './teaching-weeks.js';
const normalise=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function filterLectures(lectures,query=''){
 const terms=normalise(query).split(' ').filter(Boolean);if(!terms.length)return lectures;
 return lectures.filter(lecture=>{const module=MODULES.find(m=>m.id===moduleFor(lecture));const text=normalise([lecture.title,module?.name,module?.code,weekLabel(lecture),...(lecture.topics||[])].join(' '));return terms.every(term=>text.includes(term))});
}
