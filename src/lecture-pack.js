import {prepareChatGPTDeck} from './chatgpt-deck.js';
export function prepareLecturePack(raw){
 let pack;try{pack=JSON.parse(raw)}catch{throw Error('Choose the downloaded .chuds lecture pack.')}
 if(pack?.format!=='chuds-lecture-pack'||!Array.isArray(pack.decks)||pack.decks.length<1||pack.decks.length>25)throw Error('Choose a lecture pack containing 1 to 25 decks.');
 const ids=new Set();
 const decks=pack.decks.map(entry=>{
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(entry?.id||'')||ids.has(entry.id))throw Error('Lecture pack has missing or duplicate deck identifiers.');ids.add(entry.id);
  const payload=prepareChatGPTDeck(JSON.stringify(entry.payload));
  if(!payload.source.trim()||!payload.moduleName.trim())throw Error('Each lecture needs its original filename and module name.');
  return {id:entry.id,payload};
 });
 return {format:'chuds-lecture-pack',version:1,decks};
}
