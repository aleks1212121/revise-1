import {INJURY_SOURCE,injuryId,partNumber,injuryPart,projectInjury,combineInjury} from './injury-parts.js';
import {moduleFor} from './modules.js';
import {lectureProgress} from './lecture-progress.js';
import {stampChanges,mergeDecks,equivalent,cloudPayload} from './sync-model.js';
import {WORKSPACE_ID,emptyWorkspace,lectureTrashed} from './workspace-state.js';
const LEGACY='micro-deck-v1';let activeScope='';
export const getStorageScope=()=>activeScope;
export function setStorageScope(userId=''){if(userId&&!/^[a-zA-Z0-9-]+$/.test(userId))throw Error('Invalid account ID');activeScope=userId}
const key=(name,scope=activeScope)=>scope?`user:${scope}:${name}`:name;
function database(){return new Promise((resolve,reject)=>{const req=indexedDB.open('micro-flashcards',1);req.onupgradeneeded=()=>req.result.createObjectStore('decks');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function read(name,scope=activeScope){const db=await database();try{return await new Promise((resolve,reject)=>{const req=db.transaction('decks').objectStore('decks').get(key(name,scope));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}finally{db.close()}}
export async function loadDeck(){const scope=activeScope,value=await read('current',scope),state=await getWorkspace(scope);if(value){if(lectureTrashed(state,value.lectureId)||value.lectureId===WORKSPACE_ID)return (await allLectures(scope))[0]||null;if(injuryId(value.lectureId)){let source=await read(`lecture:${INJURY_SOURCE}`,scope);if(!source){await ensureLecture({...value,lectureId:INJURY_SOURCE});source=value}return injuryPart(source,partNumber(value.lectureId))}return value}if(scope)return null;try{const legacy=JSON.parse(localStorage.getItem(LEGACY));return legacy&&!lectureTrashed(state,legacy.lectureId)?legacy:null}catch{return null}}
export async function storeDeck(deck,{preStamped=false}={}){
 const scope=activeScope,db=await database();try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('decks','readwrite'),s=tx.objectStore('decks'),q=s.get(key(`lecture:${injuryId(deck.lectureId)?INJURY_SOURCE:deck.lectureId}`,scope));
  q.onsuccess=()=>{if(injuryId(deck.lectureId)&&q.result){const previous=injuryPart(q.result,partNumber(deck.lectureId)),part=preStamped?mergeDecks(previous,deck):stampChanges(previous,deck),combined=combineInjury(q.result,part),saved=stampChanges(q.result,combined);saved._cloudRevision=q.result._cloudRevision||0;saved._cloudDirty=true;s.put(saved,key(`lecture:${INJURY_SOURCE}`,scope));s.put(injuryPart(saved,partNumber(deck.lectureId)),key('current',scope));return}const saved=preStamped?mergeDecks(q.result,deck):stampChanges(q.result,deck);saved._cloudRevision=q.result?._cloudRevision||0;saved._cloudDirty=true;s.put(saved,key('current',scope));if(deck.lectureId)s.put(saved,key(`lecture:${deck.lectureId}`,scope))};
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}finally{db.close()}
}
export async function ensureLecture(deck){
 if(!deck.lectureId)throw Error('A lecture ID is required.');const scope=activeScope,db=await database();try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('decks','readwrite'),s=tx.objectStore('decks'),k=key(`lecture:${deck.lectureId}`,scope),q=s.get(k);
  q.onsuccess=()=>{if(!q.result)s.put({...stampChanges(null,deck,0),_cloudRevision:0,_cloudDirty:true},k)};
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}finally{db.close()}
}
export async function rawLectures(scope=activeScope){const db=await database();try{return await new Promise((resolve,reject)=>{const q=db.transaction('decks').objectStore('decks').openCursor(),result=[],prefix=key('lecture:',scope);q.onsuccess=()=>{const cur=q.result;if(!cur){resolve(result);return}if(String(cur.key).startsWith(prefix))result.push(cur.value);cur.continue()};q.onerror=()=>reject(q.error)})}finally{db.close()}}
export async function getWorkspace(scope=activeScope){return (await read(`lecture:${WORKSPACE_ID}`,scope))?._workspace||emptyWorkspace()}
export async function updateWorkspace(change){
 const scope=activeScope,db=await database();try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('decks','readwrite'),s=tx.objectStore('decks'),k=key(`lecture:${WORKSPACE_ID}`,scope),q=s.get(k);
  q.onsuccess=()=>{try{const old=q.result,next={lectureId:WORKSPACE_ID,title:'Workspace settings',generation:'settings',cards:[],_workspace:change(old?._workspace||emptyWorkspace()),updatedAt:Date.now()};s.put({...stampChanges(old,next),_cloudRevision:old?._cloudRevision||0,_cloudDirty:true},k)}catch(e){tx.abort();reject(e)}};
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Could not save collection settings'));
 })}finally{db.close()}
}
export async function allLectures(scope=activeScope){const raw=await rawLectures(scope),state=raw.find(d=>d.lectureId===WORKSPACE_ID)?._workspace;return projectInjury(raw.filter(d=>d.lectureId!==WORKSPACE_ID)).filter(d=>!lectureTrashed(state,d.lectureId))}
export async function trashedLectures(scope=activeScope){const raw=await rawLectures(scope),state=raw.find(d=>d.lectureId===WORKSPACE_ID)?._workspace;return projectInjury(raw.filter(d=>d.lectureId!==WORKSPACE_ID)).filter(d=>lectureTrashed(state,d.lectureId))}
export async function listLectures(){return (await allLectures()).map(d=>({lectureId:d.lectureId,title:d.title||'Untitled lecture',moduleId:moduleFor(d),count:d.cards.length,...lectureProgress(d.cards),updatedAt:d.updatedAt||0,curated:!!d.curated,generation:d.generation||'imported'})).sort((a,b)=>b.updatedAt-a.updatedAt)}
export async function getLecture(id){const saved=await read(`lecture:${injuryId(id)?INJURY_SOURCE:id}`);return saved&&injuryId(id)?injuryPart(saved,partNumber(id)):saved}
// Apply a remote revision atomically. Local edits made during the request stay dirty.
export async function applyCloud(remote,revision,scope){
 const db=await database();try{await new Promise((resolve,reject)=>{
  const tx=db.transaction('decks','readwrite'),s=tx.objectStore('decks'),k=key(`lecture:${remote.lectureId}`,scope),q=s.get(k);
  q.onsuccess=()=>{const merged=mergeDecks(q.result,remote),saved={...merged,_cloudRevision:revision,_cloudDirty:!equivalent(merged,remote)};s.put(saved,k);const current=s.get(key('current',scope));current.onsuccess=()=>{if(remote.lectureId===INJURY_SOURCE&&injuryId(current.result?.lectureId))s.put(injuryPart(saved,partNumber(current.result.lectureId)),key('current',scope));else if(current.result?.lectureId===remote.lectureId)s.put(saved,key('current',scope))}};
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}finally{db.close()}
}
export async function importGuestLectures(){
 const scope=activeScope;if(!scope)throw Error('Sign in first.');
 for(const guest of (await rawLectures('')).filter(d=>d.lectureId!==WORKSPACE_ID)){const remote=cloudPayload(guest);const existing=await read(`lecture:${guest.lectureId}`,scope);const merged=mergeDecks(existing,remote);await applyCloud(merged,existing?._cloudRevision||0,scope);await markDirty(guest.lectureId,scope)}
}
async function markDirty(id,scope){const db=await database();try{await new Promise((resolve,reject)=>{const tx=db.transaction('decks','readwrite'),s=tx.objectStore('decks'),q=s.get(key(`lecture:${id}`,scope));q.onsuccess=()=>{if(q.result)s.put({...q.result,_cloudDirty:true},key(`lecture:${id}`,scope))};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}finally{db.close()}}
