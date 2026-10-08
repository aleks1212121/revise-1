import {mergeEvents} from './review-stats.js';
import {mergeStudyDays} from './activity.js';
export const scheduleFields=['status','dueAt','lastReviewedAt','intervalDays','reviews','lapses','lastRating','scheduleVersion'];
const localFields=['_cloudRevision','_cloudDirty'];
const stable=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const content=c=>Object.fromEntries(Object.entries(c).filter(([k])=>!scheduleFields.includes(k)&&!['_contentAt','_reviewAt'].includes(k)));
const review=c=>Object.fromEntries(scheduleFields.filter(k=>c[k]!==undefined).map(k=>[k,c[k]]));
const meta=d=>Object.fromEntries(Object.entries(d).filter(([k])=>!['cards','_studyDays','_reviewEvents','updatedAt','_deletedCards','_metaAt','_syncVersion',...localFields].includes(k)));
function choose(a,b,clock,signature){const x=clock(a),y=clock(b);return x!==y?(x>y?a:b):(signature(a)>=signature(b)?a:b)}
export function stampChanges(previous,next,now=Date.now()){
 const result=structuredClone(next),old=new Map((previous?.cards||[]).map(c=>[c.id,c]));
 const legacyAt=previous&&!previous._syncVersion?(previous.updatedAt||now):0;
 result._syncVersion=1;result._deletedCards={...(previous?._deletedCards||{}),...(next._deletedCards||{})};
 result._metaAt=previous?(stable(meta(previous))===stable(meta(next))?(previous._metaAt||legacyAt):now):(next.generation==='reviewed'||next.curated?0:now);
 result.cards=result.cards.map(c=>{
  const p=old.get(c.id);const contentAt=p?(stable(content(p))===stable(content(c))?(p._contentAt||legacyAt):now):(c._contentAt||(next.generation==='reviewed'||next.curated?0:now));
  const reviewAt=p?(stable(review(p))===stable(review(c))?(p._reviewAt||p.lastReviewedAt||0):now):(c._reviewAt||c.lastReviewedAt||0);
  return {...c,_contentAt:contentAt,_reviewAt:reviewAt};
 });
 const present=new Set(result.cards.map(c=>c.id));for(const id of old.keys())if(!present.has(id))result._deletedCards[id]=now;
 return result;
}
export function cloudPayload(deck){const copy=structuredClone(deck);for(const k of localFields)delete copy[k];return copy}
export function equivalent(a,b){return stable(cloudPayload(a))===stable(cloudPayload(b))}
export function mergeDecks(a,b){
 if(!a)return cloudPayload(b);if(!b)return cloudPayload(a);
 if(a.lectureId!==b.lectureId)throw Error('Cannot merge different lectures.');
 const winner=choose(a,b,d=>d._metaAt||0,d=>stable(meta(d)));
 const deleted={};for(const [id,t]of [...Object.entries(a._deletedCards||{}),...Object.entries(b._deletedCards||{})])deleted[id]=Math.max(deleted[id]||0,t);
 const am=new Map(a.cards.map(c=>[c.id,c])),bm=new Map(b.cards.map(c=>[c.id,c]));
 const ids=[...new Set([...winner.cards.map(c=>c.id),...[...am.keys(),...bm.keys()].sort()])];
 const cards=ids.map(id=>{
  const x=am.get(id),y=bm.get(id);if(!x||!y)return {...(x||y)};
  const base=choose(x,y,c=>c._contentAt||0,c=>stable(content(c)));
  const latest=choose(x,y,c=>c._reviewAt||c.lastReviewedAt||0,c=>stable(review(c)));
  const c={...base};for(const k of scheduleFields){delete c[k];if(latest[k]!==undefined)c[k]=latest[k]}
  c._reviewAt=latest._reviewAt||latest.lastReviewedAt||0;return c;
 }).filter(c=>!(deleted[c.id]!==undefined&&deleted[c.id]>=(c._contentAt||0)));
 return {...cloudPayload(winner),media:{...a.media,...b.media,...winner.media},mediaCredits:{...a.mediaCredits,...b.mediaCredits,...winner.mediaCredits},cards,_studyDays:mergeStudyDays(a._studyDays,b._studyDays),_reviewEvents:mergeEvents(a._reviewEvents,b._reviewEvents),_deletedCards:deleted,_syncVersion:1,updatedAt:Math.max(a.updatedAt||0,b.updatedAt||0)};
}
