const LEGACY='micro-deck-v1';
function database(){return new Promise((resolve,reject)=>{const req=indexedDB.open('micro-flashcards',1);req.onupgradeneeded=()=>req.result.createObjectStore('decks');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
export async function loadDeck(){
 const db=await database();
 const value=await new Promise((resolve,reject)=>{const tx=db.transaction('decks','readonly'),req=tx.objectStore('decks').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();
 if(value)return value;
 try{return JSON.parse(localStorage.getItem(LEGACY))}catch{return null}
}
export async function storeDeck(deck){const db=await database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('decks','readwrite');tx.objectStore('decks').put(deck,'current');if(deck.lectureId)tx.objectStore('decks').put(deck,`lecture:${deck.lectureId}`);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}

export async function listLectures(){
 const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('decks'),store=tx.objectStore('decks');const req=store.openCursor(),result=[];req.onsuccess=()=>{const cur=req.result;if(!cur){resolve(result.sort((a,b)=>b.updatedAt-a.updatedAt));return}if(String(cur.key).startsWith('lecture:'))result.push({lectureId:cur.value.lectureId,title:cur.value.title||'Untitled lecture',count:cur.value.cards.length,updatedAt:cur.value.updatedAt||0,curated:!!cur.value.curated,generation:cur.value.generation||'imported'});cur.continue()};req.onerror=()=>reject(req.error)})}finally{db.close()}
}
export async function getLecture(id){const db=await database();try{return await new Promise((resolve,reject)=>{const req=db.transaction('decks').objectStore('decks').get(`lecture:${id}`);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}finally{db.close()}}
