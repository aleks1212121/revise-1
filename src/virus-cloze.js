import updates from './virus-cloze-updates.js';
import {deletions} from './cloze.js';
// Match the shipped wording before updating: personal edits and review fields remain intact.
export function repairVirusCloze(deck,now=Date.now()){
 if(deck?.lectureId!=='viruses')return deck;
 let changed=false;
 const cards=deck.cards.map(card=>{
  const patch=updates[card.id];let next=card;
  if(patch&&(card.text||card.question)===patch.previousText)next={...card,text:patch.text,question:patch.text};
  const text=next.text||next.question,number=next.clozeNumber||1,terms=deletions(text).filter(d=>d.number===number);
  if(terms.length&&next.type!=='cloze')next={...next,type:'cloze',text,clozeNumber:number};
  if(next===card)return card;
  changed=true;return {...next,answer:terms.map(d=>d.answer).join('; '),_contentAt:Math.max(now,(card._contentAt||0)+1)};
 });
 return changed?{...deck,cards,clozeRevision:2,updatedAt:now,_metaAt:Math.max(now,(deck._metaAt||0)+1)}:deck;
}
