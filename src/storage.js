const LEGACY='micro-deck-v1';
function database(){return new Promise((resolve,reject)=>{const req=indexedDB.open('micro-flashcards',1);req.onupgradeneeded=()=>req.result.createObjectStore('decks');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
export async function loadDeck(){
 const db=await database();
 const value=await new Promise((resolve,reject)=>{const tx=db.transaction('decks','readonly'),req=tx.objectStore('decks').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();
 if(value)return value;
 try{return JSON.parse(localStorage.getItem(LEGACY))}catch{return null}
}
export async function storeDeck(deck){const db=await database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('decks','readwrite');tx.objectStore('decks').put(deck,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
