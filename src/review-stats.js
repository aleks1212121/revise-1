import {injuryCommunity} from './injury-parts.js';
import {moduleFor,MODULES,canonicalModuleId} from './modules.js';
export function recordAttempt(deck,card,rating,now=Date.now()){
 if(!['again','hard','good','easy'].includes(rating))return;
 const event={id:crypto.randomUUID(),cardId:card.id,slide:card.slide||0,topic:card.topic||'General',moduleId:moduleFor(deck),rating,at:now,contentKey:contentKey(card)};
 deck._reviewEvents={...(deck._reviewEvents||{}),[event.id]:event};
}
export function contentKey(c){return JSON.stringify([c.type||'basic',c.text||c.question||'',c.clozeNumber||1,c.answer||''])}
export function mergeEvents(a={},b={}){const out={...a};for(const [id,event] of Object.entries(b))if(!out[id]||JSON.stringify(event)>JSON.stringify(out[id]))out[id]=event;return out}
export function difficultyOf(s){if(s.attempts<5)return 'Building data';const score=(s.incorrect+s.partial*.5)/s.attempts;return score>=.45?'Hard':score<=.2?'Easy':'Medium'}
export function summarize(counts){const attempts=counts.correct+counts.incorrect+counts.partial;return {...counts,attempts,accuracy:attempts?Math.round(counts.correct/attempts*100):null,wrongRate:attempts?Math.round(counts.incorrect/attempts*100):null,difficulty:difficultyOf({...counts,attempts})}}
export function personalStats(decks,level='subject',lectureId=''){
 const groups=new Map(),totals={correct:0,incorrect:0,partial:0};let reviewed=0,totalCards=0;
 for(const d of decks){if(lectureId&&d.lectureId!==lectureId)continue;totalCards+=d.cards.length;reviewed+=d.cards.filter(c=>c.reviews>0).length;
 for(const e of Object.values(d._reviewEvents||{})){
  if(!['again','hard','good','easy'].includes(e.rating)||!e.cardId)continue;
  const module=canonicalModuleId(e.moduleId)||moduleFor(d),name=MODULES.find(m=>m.id===module)?.name||'Unassigned';
  const key=level==='module'?module:level==='subject'?JSON.stringify([module,e.topic]):level==='slide'?JSON.stringify([d.lectureId,e.slide]):JSON.stringify([d.lectureId,e.cardId]);
  const card=d.cards.find(c=>c.id===e.cardId),label=level==='module'?name:level==='subject'?e.topic:level==='slide'?`${d.title} · Slide ${e.slide}`:(card?.text||card?.question||'Removed card').replace(/\{\{c\d+::([^{}]+)\}\}/g,(_,text)=>text.split('::')[0]);
  const row=groups.get(key)||{key,label,lectureId:d.lectureId,cardId:e.cardId,slide:e.slide,topic:e.topic,correct:0,incorrect:0,partial:0};const result=e.rating==='again'?'incorrect':e.rating==='hard'?'partial':'correct';row[result]++;totals[result]++;groups.set(key,row);
 }}
 return {total:summarize(totals),rows:[...groups.values()].map(summarize),reviewed,totalCards};
}
export function communityRows(records,level='subject',lectureId=''){
 const groups=new Map();for(const raw of records){const r=injuryCommunity(raw);if(lectureId&&r.lectureId!==lectureId)continue;const key=level==='module'?r.moduleId:level==='subject'?JSON.stringify([r.moduleId,r.topic]):level==='slide'?JSON.stringify([r.lectureId,r.slide]):JSON.stringify([r.lectureId,r.cardId]);const label=level==='module'?MODULES.find(m=>m.id===r.moduleId)?.name||'Unassigned':level==='subject'?r.topic:level==='slide'?`${r.lectureTitle} · Slide ${r.slide}`:r.prompt;const row=groups.get(key)||{key,label,correct:0,incorrect:0,partial:0};for(const k of ['correct','incorrect','partial'])row[k]+=Number(r[k])||0;groups.set(key,row)}return [...groups.values()].map(summarize);
}
