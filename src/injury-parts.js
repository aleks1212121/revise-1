export const INJURY_SOURCE='cell-injury';
export const injuryId=id=>id==='cell-injury'||id==='cell-injury-2';
export const partNumber=id=>id==='cell-injury-2'?2:1;
const partOf=item=>Number(item.slide??item.number)>=40?2:1;
export function injuryPart(source,part){
 const id=part===2?'cell-injury-2':'cell-injury',prefs=source._injuryParts?.[part]||{},cards=source.cards.filter(c=>partOf(c)===part),ids=new Set(cards.map(c=>c.id));
 const slides=(source.slides||[]).filter(s=>partOf(s)===part),mediaIds=new Set([...cards.flatMap(c=>[...(c.images||[]),...(c.answerImages||[]),...(c.illustrations||[])]),...slides.flatMap(s=>s.images||[])]);
 const result={...source,lectureId:id,title:part===1?'Cellular Injury I':'Cellular Injury II',moduleId:source.moduleId??'pathobiology',...prefs,cards,slides,media:Object.fromEntries(Object.entries(source.media||{}).filter(([id])=>mediaIds.has(id))),mediaCredits:Object.fromEntries(Object.entries(source.mediaCredits||{}).filter(([id])=>mediaIds.has(id))),_reviewEvents:Object.fromEntries(Object.entries(source._reviewEvents||{}).filter(([,e])=>partOf(e)===part)),_studyDays:Object.fromEntries(Object.entries(source._studyDays||{}).map(([day,entries])=>[day,Object.fromEntries(Object.entries(entries).filter(([id,slide])=>ids.has(id)||(!source.cards.some(c=>c.id===id)&&partOf({slide})===part)))]))};
 delete result._injuryParts;delete result._at;return result;
}
export function projectInjury(decks){return decks.flatMap(d=>d.lectureId===INJURY_SOURCE?[injuryPart(d,1),injuryPart(d,2)]:[d])}
export function combineInjury(source,partDeck,now=Date.now()){
 const part=partNumber(partDeck.lectureId),old=source._injuryParts?.[part]||{},prefs={moduleId:partDeck.moduleId??source.moduleId??'pathobiology',studyFocus:partDeck.studyFocus||source.studyFocus||{}};
 const changed=JSON.stringify([old.moduleId,old.studyFocus])!==JSON.stringify([prefs.moduleId,prefs.studyFocus]);
 return {...source,cards:[...source.cards.filter(c=>partOf(c)!==part),...partDeck.cards],media:{...source.media,...partDeck.media},mediaCredits:{...source.mediaCredits,...partDeck.mediaCredits},_injuryParts:{...source._injuryParts,[part]:{...prefs,_at:changed?Math.max(now,(old._at||0)+1):old._at||0}},_reviewEvents:{...source._reviewEvents,...partDeck._reviewEvents},_studyDays:Object.fromEntries([...new Set([...Object.keys(source._studyDays||{}),...Object.keys(partDeck._studyDays||{})])].map(day=>[day,{...source._studyDays?.[day],...partDeck._studyDays?.[day]}])),_deletedCards:{...source._deletedCards,...partDeck._deletedCards},updatedAt:partDeck.updatedAt||now};
}
export function injuryCommunity(row){return row.lectureId===INJURY_SOURCE?{...row,lectureId:row.slide>=40?'cell-injury-2':'cell-injury',lectureTitle:row.slide>=40?'Cellular Injury II':'Cellular Injury I'}:row}
