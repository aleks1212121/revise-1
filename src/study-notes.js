import {cardText,noteKey} from './study-notes/card-text.js';
import {legacyNotes} from './study-notes/legacy.js';
import {memoryCues} from './study-notes/memory-cues.js';
import {clinicalCue} from './study-notes/clinical-cues.js';
import {concepts} from './study-notes/concepts.js';
import legacyIndex from './study-notes/legacy-index.json' with {type:'json'};

const clean=value=>typeof value==='string'?value.trim():'';

function relatedCheck(deck,card,question,answer) {
 // The alternate deletion or a second fact on the same slide exercises
 // the same material. Never infer a picture's labels from nearby cards.
 const peer=deck.cards?.find(other=>{
  if(other===card||other.slide!==card.slide||other.topic!==card.topic||other.showImagesFront)return false;
  const fact=cardText(other);
  return fact.answer&&fact.question!==question&&fact.answer!==answer;
 });
 return peer?cardText(peer):null;
}

function sourceContext(deck,card,statement) {
 if(card.showImagesFront)return '';
 const slide=deck.slides?.find(s=>s.number===card.slide);
 const words=new Set(statement.toLowerCase().match(/[a-z]{5,}/g)||[]);
 const sentences=clean(slide?.text).split(/\n+|(?<=[.!?])\s+/);
 return sentences.find(line=>line.length>=30&&line.length<=300&&/[.!?]$/.test(line)&&!statement.includes(line.trim())&&
  !/https?:|copyright|learning objective/i.test(line)&&new Set((line.toLowerCase().match(/[a-z]{5,}/g)||[]).filter(word=>words.has(word))).size>=2)?.trim()||'';
}

export function studyNote(deck,card) {
 const key=noteKey(card),saved=card.studyNote;
 if(saved?.version===1&&saved.key===key&&['why','cue','question','answer'].every(k=>typeof saved[k]==='string'))return saved;
 const authored=card.originalExplanationKey&&card.originalExplanationKey!==key?{}:card;
 const {question,answer,statement}=cardText(card);
 const legacy=legacyNotes[legacyIndex[key]]?.find(([first,last])=>card.slide>=first&&card.slide<=last);
 const companion=clinicalCue(deck,card);
 const concept=concepts.find(([pattern])=>pattern.test(statement+' '+card.topic));
 const rationale=clean(authored.explanation)||legacy?.[2]||sourceContext(deck,card,statement);
 let why=rationale;
 if(!why)why=card.showImagesFront?'The saved answer identifies the pictured feature. Use the original labelled image to check its location.':'This card supplies the answer without further reasoning. The original source is needed to explain the mechanism.';
 const customCue=clean(authored.memoryAid);
 const matchedCue=memoryCues.find(([pattern])=>pattern.test(statement+' '+card.topic))?.[1];
 const cue=customCue||companion?.[0]||legacy?.[3]||concept?.[1]||matchedCue||(card.showImagesFront?'Cover the label, locate the feature, then name it.':question.includes('_____')?question.replace(/_____+/g,'…')+' → '+answer:'Recall '+answer+' from the clue “'+question+'”.');
 let checkQuestion=clean(authored.checkQuestion),checkAnswer=clean(authored.checkAnswer);
 if(!checkQuestion||!checkAnswer){
  const peer=!companion&&!concept&&!card.showImagesFront?relatedCheck(deck,card,question,answer):null;
  checkQuestion=companion?.[1]||concept?.[2]||peer?.question||question;
  checkAnswer=companion?.[2]||concept?.[3]||peer?.answer||answer;
 }
 return {version:1,key,why,cue,question:checkQuestion,answer:checkAnswer};
}

export function withStudyNotes(deck) {
 return {...deck,cards:deck.cards.map(card=>{
  const note=studyNote(deck,card);
  return note===card.studyNote?card:{...card,studyNote:note};
 })};
}
