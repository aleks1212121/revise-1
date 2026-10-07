import {clozeCards,deletions} from './cloze.js';
export function backendURL(value){
 const url=new URL(value);if(url.username||url.password||url.search||url.hash)throw Error('Use the backend base URL without credentials, query parameters or fragments.');
 if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('The AI backend must use HTTPS (HTTP is allowed for local development).');
 return url.href.replace(/\/$/,'');
}
async function compress(src){
 if(!/^data:image\/(png|jpeg|gif|webp);base64,/.test(src||''))return null;
 const img=new Image();img.src=src;await img.decode();const scale=Math.min(1,1024/img.width,1024/img.height);const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',0.75);
}
export function attachAICards(deck,notes){
 const cards=[];
 for(const note of notes){
  const slide=deck.slides.find(s=>s.number===note.slide);
  if(!slide||typeof note.text!=='string'||!deletions(note.text).length||typeof note.topic!=='string')throw Error('The AI returned a card without a valid cloze or source slide.');
  cards.push(...clozeCards({text:note.text,topic:note.topic,slide:note.slide,images:slide.images,explanation:String(note.explanation||''),showImagesFront:false,draft:true,aiGenerated:true}));
 }
 if(!cards.length)throw Error('The AI could not create any cards from this lecture. Check the slide reference or try a different file.');
 return {...deck,cards,generation:'ai',curated:false};
}
export async function generateAI(deck,endpoint,token,onProgress){
 const base=backendURL(endpoint);if(!token)throw Error('Enter the service passcode. Your AI provider key belongs on the server.');
 const notes=[];
 for(let i=0;i<deck.slides.length;i+=8){
  const batch=deck.slides.slice(i,i+8);onProgress(`AI is reading slides ${i+1}–${Math.min(i+8,deck.slides.length)} of ${deck.slides.length}…`);
  const slides=[];
  for(const slide of batch){const images=[];for(const id of slide.images.slice(0,2)){const image=await compress(deck.media[id]);if(image)images.push(image)}slides.push({number:slide.number,topic:slide.topic,text:slide.text.slice(0,20000),images})}
  const response=await fetch(`${base}/generate`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({slides}),signal:AbortSignal.timeout(120000)});
  const result=await response.json().catch(()=>({error:'The AI service returned an unreadable response.'}));
  if(!response.ok)throw Error(result.error||`AI service error (${response.status}).`);
  if(!Array.isArray(result.cards))throw Error('The AI service returned no card list.');notes.push(...result.cards);
 }
 return attachAICards(deck,notes);
}
