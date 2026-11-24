import {deletions} from '../cloze.js';

export function cardText(card) {
 const cloze=card.type==='cloze';
 const source=String(cloze?(card.text||card.question||''):(card.question||'')).trim();
 const active=Number(card.clozeNumber)||1;
 const reveal=(_,number,value)=>value.split('::')[0];
 const pattern=/\{\{c([1-9]\d*)::([^{}]+?)\}\}/g;
 const question=cloze?source.replace(pattern,(match,n,value)=>Number(n)===active?'_____':reveal(match,n,value)):source;
 const answer=cloze?deletions(source).filter(term=>term.number===active).map(term=>term.answer).join(', '):String(card.answer||'').trim();
 return {question,answer,statement:cloze?source.replace(pattern,reveal):answer};
}

// Review history and local card IDs do not affect the teaching content.
export function noteKey(card) {
 const fields=[card.type,card.type==='cloze'?card.text||card.question:card.question,card.answer,card.clozeNumber,card.slide,card.topic,card.explanation,card.memoryAid,card.checkQuestion,card.checkAnswer];
 let hash=2166136261;
 for(const char of JSON.stringify(fields))hash=Math.imul(hash^char.codePointAt(0),16777619);
 return (hash>>>0).toString(36);
}
