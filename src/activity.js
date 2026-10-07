export const STUDY_ZONE='Europe/London';
export function studyDay(now=Date.now()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:STUDY_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`}
export function offsetDay(day,offset){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10)}
export function recordStudy(deck,card,now=Date.now()){
 const day=studyDay(now);deck._studyDays={...(deck._studyDays||{}),[day]:{...(deck._studyDays?.[day]||{}),[card.id]:Number.isInteger(card.slide)&&card.slide>0?card.slide:0}};
}
export function mergeStudyDays(a={},b={}){
 const days={};for(const day of new Set([...Object.keys(a),...Object.keys(b)])){days[day]={};for(const id of new Set([...Object.keys(a[day]||{}),...Object.keys(b[day]||{})]))days[day][id]=Math.max(Number(a[day]?.[id])||0,Number(b[day]?.[id])||0)}return days;
}
export function studySummary(decks,today=studyDay()){
 const daily=new Map(),slides=new Map();let totalCards=0,reviewedCards=0;
 for(const deck of decks){
  for(const card of deck.cards||[]){const reviewed=(card.reviews||0)>0||(card.lastReviewedAt||0)>0;totalCards++;if(reviewed)reviewedCards++;
   if(Number.isInteger(card.slide)&&card.slide>0){const key=JSON.stringify([deck.lectureId,card.slide]),old=slides.get(key)||{reviewed:0,total:0};old.total++;if(reviewed)old.reviewed++;slides.set(key,old)}
  }
  for(const [day,cards]of Object.entries(deck._studyDays||{})){if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||day>today)continue;const old=daily.get(day)||{cards:new Set(),slides:new Set()};for(const [id,slide]of Object.entries(cards)){old.cards.add(JSON.stringify([deck.lectureId,id]));if(Number.isInteger(slide)&&slide>0)old.slides.add(JSON.stringify([deck.lectureId,slide]))}daily.set(day,old)}
 }
 const history=Array.from({length:7},(_,i)=>{const day=offsetDay(today,i-6),value=daily.get(day);return {day,cards:value?.cards.size||0,slides:value?.slides.size||0}});
 let streak=0,cursor=daily.get(today)?.cards.size?today:offsetDay(today,-1);while(daily.get(cursor)?.cards.size){streak++;cursor=offsetDay(cursor,-1)}
 return {todaySlides:history[6].slides,todayCards:history[6].cards,weekSlides:history.reduce((n,d)=>n+d.slides,0),streak,totalCards,reviewedCards,totalSlides:slides.size,completedSlides:[...slides.values()].filter(s=>s.reviewed===s.total).length,history};
}
export function leaderboard(rows,period='today'){
 const metric=period==='week'?'weekSlides':'todaySlides';let last=-1,rank=0;
 return [...rows].sort((a,b)=>b.stats[metric]-a.stats[metric]||a.display_name.localeCompare(b.display_name)).map((row,index)=>{if(row.stats[metric]!==last){rank=index+1;last=row.stats[metric]}return {...row,rank}});
}
