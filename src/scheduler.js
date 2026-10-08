import {repairVirusCloze} from './virus-cloze.js';
const MINUTE=60_000, DAY=24*60*MINUTE;
const STEPS=[1,3,7,14,30,60,120,180,365];
export function isDue(card,now=Date.now()) {return !Number.isFinite(card.dueAt)||card.dueAt<=now;}
export function intervalFor(card,rating){
 const previous=Number.isFinite(card.intervalDays)?Math.max(0,card.intervalDays):0;
 if(rating==='again')return 10*MINUTE;
 const next=STEPS.find(days=>days>previous)||365;
 // Learning cards get a shorter retry; mature cards stay below Good's interval.
 if(rating==='hard')return previous<1?30*MINUTE:Math.min(next-1,Math.max(1,Math.ceil(previous*1.2)))*DAY;
 if(rating==='good')return next*DAY;
 if(rating==='easy')return (STEPS.find(days=>days>next)||365)*DAY;
 throw Error('Unknown review rating');
}
export function schedule(card,rating,now=Date.now()){
 const interval=intervalFor(card,rating);
 return {...card,status:rating==='again'||rating==='hard'?'review':'known',dueAt:now+interval,lastReviewedAt:now,intervalDays:rating==='again'?0:interval/DAY,reviews:(Number(card.reviews)||0)+1,lapses:(Number(card.lapses)||0)+(rating==='again'?1:0),lastRating:rating,scheduleVersion:1};
}
export function intervalLabel(card,rating){const interval=intervalFor(card,rating);return interval<DAY?`${Math.round(interval/MINUTE)} min`:`${Math.round(interval/DAY)} day${interval===DAY?'':'s'}`;}
export function nextReviewLabel(card,now=Date.now()){
 if(isDue(card,now))return 'Due now';
 return `Due ${new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(card.dueAt))}`;
}
// Saved confidence flags had no timer. Bring those cards back without losing their status.
export function migrateSchedule(deck,now=Date.now()){
 if(!deck)return deck;
 deck=repairVirusCloze(deck,now);
 return {...deck,cards:deck.cards.map(c=>Number.isFinite(c.dueAt)?c:{...c,dueAt:now,intervalDays:0,scheduleVersion:1})};
}
export function preserveSchedule(card,old){
 const result={...card};
 for(const key of ['dueAt','lastReviewedAt','intervalDays','reviews','lapses','lastRating','scheduleVersion']){
  delete result[key];if(old&&old[key]!==undefined)result[key]=old[key];
 }
 return result;
}
