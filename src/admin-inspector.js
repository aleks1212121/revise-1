import {escapeHTML as esc,renderCloze} from './cloze.js';
import {DEFAULT_MODULES} from './modules.js';
// Inspection state stays here: no student identity switch, storage writes or grading.
export function adminInspector({client,user,enabled,render}){
 let generation=0,request=0,target='',snapshot=null,deck=null,index=0,reveal=false,loading=false,error='';
 const alive=(token,call,owner)=>generation===token&&request===call&&user()?.id===owner&&enabled();
 function reset(){generation++;request++;target='';snapshot=null;deck=null;index=0;reveal=false;loading=false;error=''}
 async function load(id,lecture=null){
  if(!enabled())return;const token=generation,call=++request,owner=user()?.id;target=id;loading=true;error='';if(!lecture){snapshot=null;deck=null}else{deck=null;index=0;reveal=false}render();document.getElementById('admin-inspector')?.scrollIntoView({block:'start'});
  try{const result=await client().rpc('study_admin_view_account',{p_user_id:id,p_lecture_id:lecture}).abortSignal(AbortSignal.timeout(30000));if(!alive(token,call,owner))return;if(result.error)throw result.error;if(lecture)deck=result.data.deck;else snapshot=result.data}
  catch(e){if(alive(token,call,owner))error=['PGRST202','42883'].includes(e.code)?'The small Supabase setup is missing. Copy admin-tools.sql below and run it in Supabase SQL Editor, then retry.':e.message||'Could not load this account.'}
  finally{if(alive(token,call,owner)){loading=false;render();document.getElementById('admin-inspector')?.scrollIntoView({block:'start',behavior:'smooth'})}}
 }
 function html(){
  if(!enabled()||!target)return '';const workspace=snapshot?.workspace||{},card=deck?.cards?.[index];
  const moduleName=id=>workspace.modules?.[id]?.name||DEFAULT_MODULES.find(m=>m.id===id)?.name||'Unassigned';
  return `<section id="admin-inspector" class="workspace-panel admin-inspector"><div class="submission-heading"><h3>Read-only account view</h3><button id="admin-inspect-close" class="button subtle">Close view</button></div><p><strong>${esc(snapshot?.account.email||(loading?'Loading account…':'Account view unavailable'))}</strong> · Viewing synced data. Browsing and revealing answers do not change their progress.</p>${error?`<p role="alert">${esc(error)}</p>${error.includes('admin-tools.sql')?'<button class="button subtle" data-copy-admin-setup>Copy required Supabase setup</button>':''}<button id="admin-inspect-retry" class="button subtle">Retry account view</button>`:''}${loading?'<p role="status">Loading account snapshot…</p>':''}${snapshot?`<div class="admin-inspect-lectures">${snapshot.lectures.map(l=>{const deleted=workspace.lectures?.[l.lecture_id]?.deleted;return `<article><div><strong>${esc(l.title)}</strong><small>${esc(moduleName(l.module_id))}${deleted?' · In Deleted folder':workspace.modules?.[l.module_id]?.deleted?' · Module in Deleted folder':''}</small><small>${l.studied_count} / ${l.card_count} studied (${l.card_count?Math.round(l.studied_count/l.card_count*100):0}%) · ${l.known_count} currently known</small></div><button class="button subtle" data-inspect-lecture="${esc(l.lecture_id)}" ${loading?'disabled':''}>View cards</button></article>`}).join('')||'<p>No synced lectures yet. Ask them to sign in and sync.</p>'}</div>`:''}${deck?`<section class="admin-inspect-deck"><h4>${esc(deck.title)}</h4><p>${deck.cards.length} cards · ${deck.slides?.length||0} slide references · ${Object.keys(deck.media||{}).length} pictures</p>${card?`<p>Card ${index+1} of ${deck.cards.length} · Slide ${esc(card.slide)} · ${esc(card.topic||'Lecture')} · ${esc(card.status||'new')} · ${Number(card.reviews)||0} reviews</p><div class="admin-inspect-card">${card.type==='cloze'?renderCloze(card.text||card.question,card.clozeNumber||1,reveal):esc(reveal?card.answer:card.question)}</div>${reveal?`<p>${esc(card.explanation||'')}</p><div class="admin-inspect-images">${(card.images||[]).filter(id=>/^data:image\/(jpeg|png|gif|webp);base64,/.test(deck.media?.[id]||'')).map(id=>`<img src="${esc(deck.media[id])}" alt="Lecture diagram for slide ${esc(card.slide)}">`).join('')}</div>`:''}<div class="chatgpt-actions"><button id="admin-inspect-prev" class="button subtle" ${index===0?'disabled':''}>Previous</button><button id="admin-inspect-reveal" class="button primary">${reveal?'Hide answer':'Reveal answer'}</button><button id="admin-inspect-next" class="button subtle" ${index>=deck.cards.length-1?'disabled':''}>Next</button></div>`:'<p>This lecture has no cards.</p>'}</section>`:''}</section>`;
 }
 function bind(){
  document.querySelectorAll('[data-inspect-user]').forEach(b=>b.addEventListener('click',()=>load(b.dataset.inspectUser)));
  document.querySelectorAll('[data-inspect-lecture]').forEach(b=>b.addEventListener('click',()=>load(target,b.dataset.inspectLecture)));
  document.getElementById('admin-inspect-retry')?.addEventListener('click',()=>load(target));
  document.getElementById('admin-inspect-close')?.addEventListener('click',()=>{reset();render()});
  for(const [id,step] of [['admin-inspect-prev',-1],['admin-inspect-next',1]])document.getElementById(id)?.addEventListener('click',()=>{if(!enabled()||!deck)return;index=Math.max(0,Math.min(deck.cards.length-1,index+step));reveal=false;render()});
  document.getElementById('admin-inspect-reveal')?.addEventListener('click',()=>{if(!enabled())return;reveal=!reveal;render()});
 }
 return {reset,html,bind,load};
}
