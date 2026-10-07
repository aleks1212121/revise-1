import {cloudPayload,mergeDecks} from './sync-model.js';
export class CloudSync{
 constructor({client,userId,storage,onStatus=()=>{},onChange=()=>{}}){Object.assign(this,{client,userId,storage,onStatus,onChange});this.pending=null;this.timer=null;this.stopped=false}
 stop(){this.stopped=true;clearTimeout(this.timer)}
 request(){if(this.stopped)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.sync(),1000)}
 sync(){if(this.stopped)return Promise.resolve();if(this.pending)return this.pending;this.pending=this.run().catch(error=>{if(!this.stopped)this.onStatus('error',error.message||'Sync failed. Your changes are saved on this device.');return false}).finally(()=>{this.pending=null});return this.pending}
 async run(){
  this.onStatus('syncing','Syncing…');
  const {data,error}=await this.client.from('study_decks').select('lecture_id,payload,revision').eq('user_id',this.userId).abortSignal(AbortSignal.timeout(15000));
  if(error)throw error;if(this.stopped)return false;
  for(const row of data||[]){if(!row.payload?.cards||row.payload.lectureId!==row.lecture_id)throw Error('Invalid stored lecture.');await this.storage.applyCloud(row.payload,row.revision,this.userId)}
  const local=await this.storage.allLectures(this.userId);
  for(const deck of local){
   if(this.stopped)return false;if(!deck._cloudDirty)continue;
   let payload=cloudPayload(deck),revision=deck._cloudRevision||0;
   for(let attempt=0;attempt<4;attempt++){
    const {data:result,error:failure}=await this.client.rpc('save_study_deck',{p_lecture_id:deck.lectureId,p_payload:payload,p_expected_revision:revision}).abortSignal(AbortSignal.timeout(15000));
    if(failure)throw failure;if(this.stopped)return false;
    if(!result||!Number.isFinite(Number(result.revision)))throw Error('Unexpected sync response.');
    revision=Number(result.revision);
    if(result.conflict){payload=mergeDecks(payload,result.payload);if(attempt===3)throw Error('Another device is still updating this deck. Retry sync in a moment.');continue}
    if(!result.payload?.cards)throw Error('Unexpected sync response.');
    await this.storage.applyCloud(result.payload,revision,this.userId);break;
   }
  }
  if(this.stopped)return false;
  const remaining=(await this.storage.allLectures(this.userId)).some(d=>d._cloudDirty);
  await this.onChange(data||[]);this.onStatus(remaining?'pending':'synced',remaining?'New changes waiting to sync.':`Synced ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`);
  if(remaining)this.request();return true;
 }
}
