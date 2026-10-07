import { readLecture, readPDF, normalizeDeck } from './lecture.js';
import { escapeHTML, renderCloze, clozeCards } from './cloze.js';
import { loadDeck, storeDeck, listLectures, getLecture, ensureLecture, setStorageScope, allLectures, applyCloud, importGuestLectures } from './storage.js';
import {isDue,schedule,intervalLabel,nextReviewLabel,migrateSchedule,preserveSchedule} from './scheduler.js';
import {addStudyVisuals} from './visuals.js';
import {backendURL,generateAI} from './ai.js';
import {accountClient,accountSettings} from './accounts.js';
import {checkAccountSetup} from './account-checks.js';
import {CloudSync} from './cloud-sync.js';
import {stampChanges} from './sync-model.js';
import {touchRenderGate} from './touch-render.js';
import {recordStudy} from './activity.js';
import {friendsWorkspace} from './friends.js';
import {appearanceSettings} from './appearance.js';
import './style.css';
import './themes.css';
let authClient=null,accountUser=null,syncEngine=null,accountReady=false,accountError='',authNotice='',authWorking=false,recovering=false;
let syncState='local',syncLabel='Saved on this device',identityQueue=Promise.resolve();
const bundledLectures=[{id:'genetic-variation',label:'Genetic variation'},{id:'cell-injury',label:'Cell injury I & II'},{id:'cell-death',label:'Cell death'}];
let deck=null,lectures=[],uploadFile=null,uploadTitle='',uploadMode='ai',aiToken='',aiReady=false;
let aiEndpoint='';try{aiEndpoint=localStorage.getItem('micro-ai-url')||''}catch{}
let view='study',index=0,flipped=false,filter='due',visualHint=false,illustrationIndex=0,section='all',search='',queue=[],busy=false,message='',editing=null;
const esc=escapeHTML;
let pendingSave=Promise.resolve(),saveBaseline=null;
function setDeck(value,fromStorage=false){saveBaseline=fromStorage?structuredClone(value):(deck?.lectureId===value.lectureId?structuredClone(deck):null);deck=value}
const save=()=>{deck.lectureId=deck.lectureId||(deck.curated?'microorganisms':crypto.randomUUID());deck.updatedAt=Date.now();const snapshot=stampChanges(saveBaseline,deck);saveBaseline=structuredClone(snapshot);pendingSave=pendingSave.catch(()=>{}).then(async()=>{await storeDeck(snapshot,{preStamped:true});lectures=await listLectures();syncEngine?.request()}).catch(()=>{message='Could not save this deck in browser storage. Export a backup before leaving.';render()});return pendingSave};
function cardContent(c,reveal){return c.type==='cloze'?renderCloze(c.text||c.question,c.clozeNumber||1,reveal):esc(reveal?c.answer:c.question)}
function mediaURL(id){
 const src=deck?.media?.[id];
 if(typeof src!=='string')return '';
 if(/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(src))return src;
 if(/^((?:lecture|genetic-variation|cell-injury|cell-death)\/[a-z0-9-]+\.jpg|illustrations\/[a-z0-9-]+\.png)$/.test(src))return `${import.meta.env.BASE_URL}${src}`;
 return '';
}
function pictures(ids=[],links=true){return ids.map(id=>{const src=mediaURL(id);if(!src)return '';const img=`<img loading="lazy" src="${esc(src)}" alt="Image from the lecture slide">`;return links?`<a href="${esc(src)}" target="_blank" rel="noopener" aria-label="Open slide image at full size">${img}</a>`:img}).join('')}
async function loadCurated(){
 const response=await fetch(`${import.meta.env.BASE_URL}lecture/deck.json`);if(!response.ok)throw Error('Could not load the lecture deck. Try refreshing.');
 return addStudyVisuals(migrateSchedule(await response.json()));
}
async function useCurated(){
 if(!deck?.curated){const existing=await getLecture('microorganisms');if(existing){await openLecture('microorganisms');return}}
 if(deck&&!confirm('Load the reviewed lecture deck? This replaces the current deck. Export a backup first if you want to keep it.'))return;
 try{setDeck(await loadCurated());view='study';filter='due';section='all';message='Loaded 178 lecture-based cards, including 7 visual cards. Each answer links to the original slide.';await save();resetQueue();render()}catch(e){message=e.message;render()}
}
async function exportDeck(){
 try{
 const backup=structuredClone(deck);
 for(const id of Object.keys(backup.media||{})){
  const src=mediaURL(id);if(!src||src.startsWith('data:'))continue;
  const response=await fetch(src);if(!response.ok)throw Error('A slide image could not be included in the backup. Try exporting again.');
  const blob=await response.blob();backup.media[id]=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
 }
 const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='micro-flashcards.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){message=e.message||'Could not export your deck.';render()}
}
const cards=()=>deck?.cards||[];
function cardSection(c){if(!deck?.curated)return c.topic||'General';return c.slide<=10?'foundations':c.slide<=37?'structures':c.slide<=50?'colonies':c.slide<=64?'taxonomy':'research'}
function matchesFilter(c){return (section==='all'||cardSection(c)===section)&&(filter==='all'||(filter==='due'?isDue(c):filter==='visual'?c.showImagesFront:c.status===filter))}
function resetQueue(){queue=cards().filter(matchesFilter).sort((a,b)=>filter==='due'?(a.status==='new')-(b.status==='new')||((a.dueAt||0)-(b.dueAt||0)):0).map(c=>c.id);index=0;flipped=false;visualHint=false;illustrationIndex=0}
function current(){return cards().find(c=>c.id===queue[index])}
const appearance=appearanceSettings({render:()=>{if(view==='settings')render()}});
const friends=friendsWorkspace({client:()=>authClient,user:()=>accountUser,decks:()=>allLectures(),waitSave:()=>pendingSave,sync:()=>syncEngine?.sync(),render:()=>render()});
const touchGate=touchRenderGate({document,enabled:()=>view==='study'&&matchMedia('(pointer: coarse)').matches,flush:()=>render()});
function render(){
 if(touchGate.defer())return;
 const all=cards(),known=all.filter(c=>c.status==='known').length,c=current();
 document.querySelector('#app').innerHTML=`<aside ${busy?'inert':''}><a class="brand" href="#"><span class="brand-icon">✳</span> micro<span class="brand-dot">.</span></a><div class="workspace-label">YOUR WORKSPACE</div><button class="nav ${view==='lectures'?'active':''}" data-view="lectures">▤ <span>Lectures</span><small>${lectures.length}</small></button><button class="nav ${view==='study'?'active':''}" data-view="study">▱ <span>Study cards</span></button><button class="nav ${view==='library'?'active':''}" data-view="library">▦ <span>Card library</span><small>${all.length}</small></button><button class="nav ${view==='slides'?'active':''}" data-view="slides">▧ <span>Slide reference</span></button><button class="nav friends-nav ${view==='friends'?'active':''}" data-view="friends">♧ <span>Friends & streaks</span></button><button class="nav settings-nav ${view==='settings'?'active':''}" data-view="settings">⚙ <span>Settings</span></button><button class="nav account-nav ${view==='account'?'active':''}" data-view="account">◎ <span>${accountUser?'My account':'Sign in'}</span></button><div class="sidebar-lectures"><button class="mobile-account" data-view="account" aria-label="${accountUser?'Open my account':'Sign in'}">◎ ${accountUser?'Account':'Sign in'}</button><button class="mobile-friends" data-view="friends">♧ Friends</button><button class="mobile-settings" data-view="settings">⚙ Settings</button><div class="workspace-label">LECTURE DECKS</div>${lectures.map(l=>`<button class="lecture-shortcut ${l.lectureId===deck?.lectureId?'active':''}" data-open-lecture="${esc(l.lectureId)}" title="${esc(l.title)}"><span>${esc(l.lectureId==='microorganisms'?'Microorganisms':(bundledLectures.find(b=>b.id===l.lectureId)?.label||l.title))}</span><small>${l.count}</small></button>`).join('')}</div><div class="aside-bottom"><div class="privacy-dot"></div><div>${accountUser?esc(accountUser.email):'Made for your mind.'}<br><small>${accountUser?esc(syncLabel):'Guest · saved in this browser'}</small></div></div></aside>
 <main class="${view==='study'&&deck?'study-mode':view==='friends'?'social-mode':view==='settings'?'settings-mode':''}" ${busy?'inert aria-busy="true"':''}><header><span>${['friends','settings'].includes(view)?'MY WORKSPACE':'MY LECTURES'} <span class="slash">/</span> <strong>${esc(view==='friends'?'Friends & streaks':view==='settings'?'Settings':deck?.title||'My lectures')}</strong></span><div class="header-actions"><button class="button subtle" id="curated">${deck?.curated?'Reset lecture deck':'Microorganisms deck'}</button><button class="button subtle" id="import-top">＋ Import lecture</button></div></header><section class="content"><div class="eyebrow"><span></span> ${deck?.curated?'LIFE SCIENCES · LS5008 / LS5030':'YOUR PERSONAL STUDY WORKSPACE'}</div><div class="title-row"><div><h1>${view==='friends'?'Your study circle.':view==='account'?'Your account.':deck?.curated?'Small organisms.<br> Big understanding.':view==='lectures'?'Your lectures.<br> Your learning.':esc(deck?.title||'Your personal study space')}</h1><p class="subtitle">A little recall today. A lot more confidence tomorrow.</p></div><div class="micro-art" aria-hidden="true"><i></i><i></i><i></i><b>✳</b><span>THE MICRO WORLD</span></div></div>
 ${deck&&!deck.curated&&deck.generation!=='ai'&&deck.generation!=='local'&&deck.generation!=='reviewed'?'<div class="notice">Your saved deck is still open. Open <strong>Microorganisms deck</strong> above for the 178 focused cloze and visual cards in the reviewed example lecture.</div>':''}
 ${message?`<div role="status" class="notice">${esc(message)}</div>`:''}
 ${!['lectures','account','friends','settings'].includes(view)?`<div class="stats"><div><span class="stat-icon">▦</span><div><strong>${all.length}</strong><small>Flashcards</small></div></div><div><span class="stat-icon green">✓</span><div><strong>${known}</strong><small>Confident</small></div></div><div><span class="stat-icon orange">↻</span><div><strong>${all.filter(c=>isDue(c)).length}</strong><small>Due now</small></div></div><div class="progress-stat"><div><small>YOUR PROGRESS</small><strong>${all.length?Math.round(known/all.length*100):0}%</strong></div><div class="progress"><i style="width:${all.length?known/all.length*100:0}%"></i></div></div></div>`:''}
 ${view==='settings'?appearance.html():view==='friends'?friends.html():view==='account'?accountWorkspace():view==='lectures'?lectureWorkspace():!deck?`<section class="import-panel"><div class="upload-icon">↥</div><span class="eyebrow">YOUR LECTURE, READY TO LEARN</span><h2>Bring your notes to life.</h2><p>Open <strong>Revisiting microorganisms</strong> to create a personal<br class="desktop"> flashcard deck from your PowerPoint slides.</p><button class="button primary" id="upload">${busy?'Reading your lecture…':'Choose lecture file'} <span>↗</span></button><small>POWERPOINT (.PPTX) OR EXPORTED DECK (.JSON)</small><div class="local-note">♧ Your lecture stays on your device. No account needed.</div></section>`:view==='study'?`<div class="study-toolbar"><div class="tabs"><button data-filter="due" class="${filter==='due'?'selected':''}">Due now</button><button data-filter="all" class="${filter==='all'?'selected':''}">All cards</button><button data-filter="review" class="${filter==='review'?'selected':''}">To revisit</button><button data-filter="new" class="${filter==='new'?'selected':''}">Unstudied</button><button data-filter="visual" class="${filter==='visual'?'selected':''}">Visual</button></div><div class="study-options"><select id="section" aria-label="Lecture section">${(deck?.curated?[['all','All topics'],['foundations','Foundations & growth'],['structures','Cell structures'],['colonies','Colonies & biofilms'],['taxonomy','Taxonomy'],['research','Research figure']]:[['all','All topics'],...[...new Set(cards().map(c=>c.topic||'General'))].map(t=>[t,t])]).map(([value,label])=>`<option value="${esc(value)}" ${section===value?'selected':''}>${esc(label)}</option>`).join('')}</select><button class="text-button" id="shuffle">⇄ Shuffle</button></div></div>
 ${c?`<div class="card-meta"><span>SLIDE ${c.slide} <span>·</span> ${esc(c.topic)}</span><span>${index+1} / ${queue.length} · ${esc(nextReviewLabel(c))}</span></div><section class="study-layout ${(flipped||visualHint)&&c.illustrations?.length&&(!c.showImagesFront||visualHint)?'has-diagram':''}"><div class="study-left"><button class="flashcard ${flipped?'flipped':''}" id="flip"><span class="card-label">${c.type==='cloze'?(flipped?'MISSING TERM REVEALED':'FILL IN THE BLANK'):flipped?'THE ANSWER':'QUICK RECALL'}</span><h2>${cardContent(c,flipped)}</h2>${flipped&&c.explanation?`<p class="card-explanation">${esc(c.explanation)}</p>`:''}${(flipped||c.showImagesFront)&&(!flipped||c.showImagesFront||!c.illustrations?.length)?`<div class="slide-pictures">${pictures(flipped?(c.answerImages||c.images):c.images,false)}</div>`:''}${flipped?`<span class="source-link">Slide ${c.slide} · ${esc(c.topic)}</span>`:''}<span class="flip-hint">⤾ ${flipped?'Click to see question':'Click to reveal answer'} <kbd>Space</kbd></span></button><div class="study-extra">${c.illustrations?.length?`<button class="text-button" id="visual-hint">${flipped?'Study illustrations':visualHint?'Hide visual hint':'Show visual hint'}</button>`:''}<button class="text-button" id="source-slide">View source slide ↗</button>${c.showImagesFront?'<span>Visual recall · answer labels hidden</span>':''}</div></div>${c.illustrations?.length&&(flipped||visualHint)&&(!c.showImagesFront||visualHint)?`<section class="study-diagrams"><div class="diagram-heading"><span>${flipped?'Visualise the structure':'Visual hint · may reveal the answer'}</span>${c.illustrations.length>1?`<div class="diagram-tabs">${c.illustrations.map((id,i)=>`<button class="${illustrationIndex===i?'selected':''}" data-diagram="${i}" aria-label="Show ${esc(deck.mediaCredits?.[id]?.title||'illustration')}" aria-pressed="${illustrationIndex===i}">${i+1}</button>`).join('')}</div>`:''}</div>${c.illustrations.slice(illustrationIndex,illustrationIndex+1).map(id=>`<figure>${pictures([id])}<figcaption>${esc(deck.mediaCredits?.[id]?.title||'Study illustration')}<small>${esc(deck.mediaCredits?.[id]?.credit||'')} · click image to enlarge</small></figcaption></figure>`).join('')}</section>`:''}<div class="study-controls ${flipped?'answer-visible':''}"><button class="button primary phone-reveal" id="phone-reveal-answer" type="button">Reveal answer</button><div class="rating">${[['again','Again','review'],['hard','Hard','review'],['good','Good','confident'],['easy','Easy','confident']].map(([value,label,style],i)=>`<button class="button ${style}" id="${value}" ${!flipped?'disabled':''}><span>${label} <kbd>${i+1}</kbd><small>${intervalLabel(c,value)}</small></span></button>`).join('')}</div><div class="card-navigation"><button id="prev" ${index===0?'disabled':''}>← Previous</button><span>Take your time. Understanding beats speed.</span><button id="next" ${index>=queue.length-1?'disabled':''}>Next →</button></div></div></section>`:`<div class="empty-state"><span>✳</span><h2>${filter==='due'?'You’re up to date.':queue.length?'Session complete. Nice work.':'A clean slate.'}</h2><p>${filter==='due'?nextDueSummary():queue.length?'Your progress is saved. Cards will return when their review is due.':'There are no cards in this group.'}</p><button class="button primary" id="restart">${filter==='due'?'Practise all cards':'Study again'}</button></div>`}`:
 view==='library'?`<div class="library-toolbar"><input id="search" placeholder="Search questions, answers, or topics…" value="${esc(search)}"><button class="button subtle" id="add">＋ Add card</button><button class="button subtle" id="export">↓ Export</button></div><div class="library">${all.filter(c=>[c.question,c.answer,c.topic].join(' ').toLowerCase().includes(search.toLowerCase())).map(c=>`<article><div><span class="eyebrow">SLIDE ${c.slide} · ${esc(c.topic)}</span><h3>${cardContent(c,false)}</h3><p>${esc(c.answer)}</p><small>${c.type==='cloze'?'Cloze · deletion '+(c.clozeNumber||1):'Question & answer'}${c.draft?' · Auto-generated draft':''} · ${esc(nextReviewLabel(c))}</small></div><button class="text-button" data-edit="${c.id}">Edit ↗</button></article>`).join('')||'<p>No matching cards.</p>'}</div>`:`<div class="slide-reference"><h2>Your slide reference</h2><p>Original slide text and pictures. Use these to check and improve your cards.</p>${(deck.slides||[]).map(slide=>`<article id="slide-${slide.number}"><span class="eyebrow">SLIDE ${slide.number}</span><h3>${esc(slide.topic)}</h3><p>${esc(slide.text)}</p><div class="slide-pictures">${pictures(slide.images)}</div></article>`).join('')||'<p>Reimport your PowerPoint to load the slide reference.</p>'}</div>`}
 <footer><span>✳ Built around your lecture.</span><span>${deck?'Cloze & visual recall · Source slides included':'Read. Recall. Repeat.'}</span></footer></section></main><input type="file" id="file" accept=".pptx,.pdf,.json" hidden>
 ${editing?`<div class="modal-backdrop"><form id="edit-form" class="modal"><h2>${editing.id?'Edit flashcard':'New flashcard'}</h2><label>Topic<input name="topic" value="${esc(editing.topic)}" required></label><label>Card style<select name="type" id="card-type"><option value="basic" ${editing.type!=='cloze'?'selected':''}>Question & answer</option><option value="cloze" ${editing.type==='cloze'?'selected':''}>Anki-style cloze</option></select></label>
 ${editing.type==='cloze'?`<label>Cloze statement<textarea name="text" id="cloze-text" required>${esc(editing.text||editing.question)}</textarea></label><button type="button" class="button subtle" id="hide-selection">Hide selected text</button><p class="editor-help">Select a term, then hide it. Syntax: {{c1::answer::optional hint}}. Use c2 for a separate card; repeat c1 to hide terms together. Editing this note updates its linked cards.</p><div class="cloze-preview">${renderCloze(editing.text||editing.question,editing.clozeNumber||1)}</div>`:`<label>Question<textarea name="question" required>${esc(editing.question)}</textarea></label><label>Answer<textarea name="answer" required>${esc(editing.answer)}</textarea></label>`}
 <label>Source slide<input type="number" min="0" name="slide" value="${editing.slide||0}"></label><label class="checkbox-label"><input name="showImagesFront" type="checkbox" ${editing.showImagesFront?'checked':''}> Show slide pictures with the question (otherwise on reveal)</label>
 <div class="slide-pictures editor-images">${pictures((deck.slides||[]).find(s=>s.number===editing.slide)?.images||editing.images)}</div>
 <div><button type="button" class="button subtle" id="cancel">Cancel</button>${editing.id?'<button type="button" class="button review" id="delete">Delete</button>':''}<button class="button primary">Save card</button></div></form></div>`:''}`;
 bind();
}
function bind(){
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(busy)return;view=b.dataset.view;if(view==='friends'&&/^(Review saved|Relearning scheduled)/.test(message))message='';refreshDueQueue();render();if(view==='friends')friends.open()});
 for(const id of ['upload','import-top'])document.getElementById(id)?.addEventListener('click',()=>{if(!busy){view='lectures';render()}});
 bindLectures();
 bindAccounts();
 friends.bind();
 appearance.bind();
 document.getElementById('file').onchange=e=>importFile(e.target.files[0]);
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;resetQueue();render()});
 document.getElementById('section')?.addEventListener('change',e=>{section=e.target.value;resetQueue();render()});
 document.getElementById('flip')?.addEventListener('click',()=>{flipped=!flipped;render()});
 document.getElementById('phone-reveal-answer')?.addEventListener('click',()=>{flipped=true;render()});
 for(const rating of ['again','hard','good','easy'])document.getElementById(rating)?.addEventListener('click',()=>rate(rating));
 document.getElementById('visual-hint')?.addEventListener('click',()=>{visualHint=!visualHint;render();});
 for(const [id,step] of [['prev',-1],['next',1]])document.getElementById(id)?.addEventListener('click',()=>{index+=step;flipped=false;visualHint=false;illustrationIndex=0;render()});
 document.getElementById('restart')?.addEventListener('click',()=>{if(filter==='due')filter='all';resetQueue();render()});
 document.getElementById('shuffle')?.addEventListener('click',()=>{for(let i=queue.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[queue[i],queue[j]]=[queue[j],queue[i]]}index=0;flipped=false;visualHint=false;illustrationIndex=0;render()});
 document.getElementById('search')?.addEventListener('input',e=>{search=e.target.value;const pos=e.target.selectionStart;render();const input=document.getElementById('search');input.focus();input.setSelectionRange(pos,pos)});
 document.getElementById('export')?.addEventListener('click',exportDeck);
 document.getElementById('curated')?.addEventListener('click',useCurated);
 document.querySelectorAll('[data-diagram]').forEach(b=>b.onclick=()=>{illustrationIndex=Number(b.dataset.diagram);render()});
 document.getElementById('source-slide')?.addEventListener('click',()=>{const number=current()?.slide;view='slides';render();document.getElementById(`slide-${number}`)?.scrollIntoView({behavior:'smooth'})});
 document.getElementById('add')?.addEventListener('click',()=>{editing={topic:'My notes',type:'cloze',text:'',question:'',answer:'',slide:0};render()});
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{editing={...cards().find(c=>c.id===b.dataset.edit)};render()});
 document.getElementById('cancel')?.addEventListener('click',()=>{editing=null;render()});
 document.getElementById('delete')?.addEventListener('click',()=>{deck.cards=cards().filter(c=>c.id!==editing.id);editing=null;save();resetQueue();render()});
 document.getElementById('card-type')?.addEventListener('change',e=>{captureEditor();editing.type=e.target.value;render()});
 document.getElementById('cloze-text')?.addEventListener('input',e=>{document.querySelector('.cloze-preview').innerHTML=renderCloze(e.target.value,editing.clozeNumber||1)});
 document.getElementById('hide-selection')?.addEventListener('click',()=>{const field=document.getElementById('cloze-text');const {selectionStart:start,selectionEnd:end}=field;if(start===end)return;const term=field.value.slice(start,end);if(/[{}]/.test(term))return;const number=editing.clozeNumber||1;field.setRangeText(`{{c${number}::${term}}}`,start,end,'end');field.dispatchEvent(new Event('input'));field.focus()});
 document.getElementById('edit-form')?.addEventListener('submit',e=>{e.preventDefault();captureEditor();const next={...editing,draft:false};if(!next.topic)return;
 if(next.type==='cloze'){
  next.noteId=next.noteId||next.id||crypto.randomUUID();const generated=clozeCards(next);if(!generated.length){message='Add at least one cloze deletion, such as {{c1::cell wall}}.';render();return}
  if(next.id){const siblings=cards().filter(c=>c.type==='cloze'&&(c.noteId===next.noteId||c.id===next.id));const ids=new Set(siblings.map(c=>c.id));const updated=generated.map(c=>{const old=siblings.find(s=>s.clozeNumber===c.clozeNumber);return preserveSchedule(old?{...c,id:old.id,status:old.status}:c,old)});const insertion=cards().findIndex(c=>ids.has(c.id));deck.cards=cards().filter(c=>!ids.has(c.id));deck.cards.splice(insertion,0,...updated)}else deck.cards.push(...generated);
 }else{if(!next.question||!next.answer)return;if(next.id)deck.cards=cards().map(c=>c.id===next.id?next:c);else deck.cards.push({...next,id:crypto.randomUUID(),status:'new'})}
 editing=null;save();resetQueue();render()});
}
function rate(rating){const c=current();if(!c||!flipped)return;Object.assign(c,schedule(c,rating));recordStudy(deck,c);save();message=`${rating==='again'?'Relearning scheduled':'Review saved'} · ${nextReviewLabel(c)}.`;if(filter==='due')queue.splice(index,1);else index++;flipped=false;visualHint=false;illustrationIndex=0;render()}
function nextDueSummary(){const future=cards().filter(c=>(section==='all'||cardSection(c)===section)&&Number.isFinite(c.dueAt)&&c.dueAt>Date.now()).sort((a,b)=>a.dueAt-b.dueAt);return future.length?`Next refresher: ${esc(nextReviewLabel(future[0]))}. Come back then, or practise any card now.`:'No cards are due in this section. You can still practise all cards.'}
function captureEditor(){
 const data=new FormData(document.getElementById('edit-form'));
 editing.topic=String(data.get('topic')||'').trim();editing.slide=Number(data.get('slide'))||0;editing.showImagesFront=data.has('showImagesFront');
 if(data.has('text'))editing.text=String(data.get('text')).trim();
 if(data.has('question'))editing.question=String(data.get('question')).trim();
 if(data.has('answer'))editing.answer=String(data.get('answer')).trim();
 editing.images=(deck.slides||[]).find(s=>s.number===editing.slide)?.images||editing.images||[];
}
async function importFile(file){
 if(!file)return;await pendingSave;
 busy=true;message='';render();try{
 let next;
 if(file.name.toLowerCase().endsWith('.json'))next=normalizeDeck(JSON.parse(await file.text()));
 else if(file.name.toLowerCase().endsWith('.pptx')){
  next=await readLecture(file);next.generation='local';
  const images=Object.keys(next.media).length;
  message=`Created ${next.cards.length} draft cloze cards and saved ${images} slide pictures. Check them in the library. Unconverted text and image-only slides are preserved in Slide reference. These cards are automatic drafts, not a reviewed lecture deck.`;
 }else if(file.name.toLowerCase().endsWith('.pdf')){next=await readPDF(file);next.generation='local';}else throw Error('Choose a .pptx, .pdf or .json lecture.');
 next.lectureId=crypto.randomUUID();setDeck(addStudyVisuals(migrateSchedule(next)));filter='due';section='all';view=next.cards.length?'study':'slides';await save();resetQueue();
 }catch(e){message=e.message||'Could not read the file. Try another PowerPoint.'}finally{busy=false;render()}
}
 document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)||editing||busy)return;if(view!=='study'||!current())return;if(e.code==='Space'){e.preventDefault();flipped=!flipped;render()}else if(['1','2','3','4'].includes(e.key))rate(['again','hard','good','easy'][Number(e.key)-1]);else if(e.key==='ArrowRight'&&index<queue.length-1){index++;flipped=false;visualHint=false;illustrationIndex=0;render()}else if(e.key==='ArrowLeft'&&index>0){index--;flipped=false;visualHint=false;illustrationIndex=0;render()}});
render();
async function bootDecks(){
 const value=await loadDeck();
 setDeck(value?addStudyVisuals(migrateSchedule(value)):await loadCurated(),!!value);resetQueue();await save();
 try{
  const failed=[];
  for(const lecture of bundledLectures){
   try{
    if(!await getLecture(lecture.id)){
     const response=await fetch(`${import.meta.env.BASE_URL}${lecture.id}/deck.json`);
     if(!response.ok)throw Error('Could not load this lecture.');
     await ensureLecture(migrateSchedule(await response.json()));
    }
   }catch{failed.push(lecture.label)}
  }
  lectures=await listLectures();
  if(failed.length)message=`Your current deck is saved. Refresh to retry adding: ${failed.join(', ')}.`;
 }catch{message='Your current deck is saved. Refresh to retry loading the lecture collection.'}
 render();
}
bootDecks().then(initAccounts).catch(()=>{message='Browser storage is unavailable. Export your deck to keep a copy.';render()});

function refreshDueQueue(){
 if(!deck||view!=='study'||filter!=='due'||editing||busy)return;
 const remaining=new Set(queue.slice(index));
 const added=cards().filter(c=>matchesFilter(c)&&!remaining.has(c.id)).map(c=>c.id);
 if(added.length){queue.push(...added);render()}
}
setInterval(refreshDueQueue,30_000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDueQueue()});

function lectureWorkspace(){return `<section class="lecture-workspace"><div class="workspace-heading"><div><span class="eyebrow">YOUR LECTURE COLLECTION</span><h2>A home for every lecture.</h2><p>Upload slides, build focused cloze cards, and keep each lecture’s progress separate.</p></div><span class="lecture-count">${lectures.length} lecture${lectures.length===1?'':'s'}</span></div><div class="lecture-workspace-grid"><form id="lecture-upload" class="workspace-panel"><h3>＋ Add a lecture</h3><label>Lecture title<input id="lecture-title" value="${esc(uploadTitle)}" placeholder="e.g. Cell signalling, week 3"></label><label class="file-picker">Choose your slides<input id="lecture-file" type="file" accept=".pptx,.pdf,.json" ${busy?'disabled':''}><small>${esc(uploadFile?.name||'PowerPoint, PDF, or exported JSON deck')}</small></label><label>Make cards with<select id="generation-mode"><option value="ai" ${uploadMode==='ai'?'selected':''}>AI-written cloze cards</option><option value="local" ${uploadMode==='local'?'selected':''}>Local draft cards (no AI)</option></select></label><p class="upload-description">${uploadMode==='ai'?'AI reads slide text and pictures, groups cards by topic, and adds explanations and slide references. Generated cards need a quick review.':'Creates simple cloze drafts locally from supported sentences. This option does not use AI.'}</p>${uploadMode==='ai'?`<div class="ai-status ${aiReady?'connected':''}">${aiReady?'● AI service connected':'○ Connect your AI service below first'}</div><p class="upload-disclosure">Generate with AI sends the extracted slide text and compressed pictures to your configured backend and its AI provider. The lecture stays in your browser when you choose local drafts.</p>`:''}<button class="button primary" ${busy||!uploadFile||(uploadMode==='ai'&&!aiReady&&!uploadFile?.name.toLowerCase().endsWith('.json'))?'disabled':''}>${busy?'Working…':uploadMode==='ai'?'Generate with AI':'Create local deck'} ↗</button>${busy?`<p role="status" class="generation-progress">${esc(message)}</p>`:''}</form><div><section class="workspace-panel"><h3>Your lectures</h3><div class="lecture-list">${lectures.map(l=>`<article class="lecture-item ${l.lectureId===deck?.lectureId?'current':''}"><div><h4>${esc(l.title)}</h4><small>${l.count} cards · ${l.curated||l.generation==='reviewed'?'Lecture-based deck':l.generation==='ai'?'AI-generated drafts':l.generation==='local'?'Local drafts':'Imported deck'}</small></div><button type="button" class="button subtle" data-open-lecture="${esc(l.lectureId)}" ${busy?'disabled':''}>${l.lectureId===deck?.lectureId?'Continue':'Study'} →</button></article>`).join('')||'<p>Your lectures will appear here.</p>'}</div></section><form id="ai-connection" class="workspace-panel"><h3>Connect your AI service</h3><p>The API key stays on your Render backend. Enter its URL and service passcode here.</p><label>Render service URL<input id="ai-url" type="url" placeholder="https://your-service.onrender.com" value="${esc(aiEndpoint)}" required></label><label>Service passcode<input id="ai-passcode" type="password" autocomplete="off" value="${esc(aiToken)}" required><small>From AI_ACCESS_TOKEN in your backend settings. Not your OpenAI API key.</small></label><button class="button subtle" ${busy?'disabled':''}>Check connection</button><small class="connection-note">The URL is remembered on this browser. The passcode stays in memory until you close or reload the app.</small><details><summary>Set up the Render backend</summary><p>Create a Render Blueprint from <a href="https://github.com/aleks1212121/revise-1" target="_blank" rel="noopener">this repository</a>. The included render.yaml configures the service. Set APP_AI_KEY securely in Render, then copy the service URL and generated AI_ACCESS_TOKEN into this form.</p></details></form></div></div></section>`}
function bindLectures(){
 document.querySelectorAll('[data-open-lecture]').forEach(b=>b.onclick=()=>openLecture(b.dataset.openLecture));
 document.getElementById('lecture-title')?.addEventListener('input',e=>uploadTitle=e.target.value);
 document.getElementById('lecture-file')?.addEventListener('change',e=>{uploadFile=e.target.files[0]||null;if(uploadFile?.name.toLowerCase().endsWith('.json'))uploadMode='local';if(uploadFile&&!uploadTitle)uploadTitle=uploadFile.name.replace(/\.(pptx|pdf|json)$/i,'');render()});
 document.getElementById('generation-mode')?.addEventListener('change',e=>{uploadMode=e.target.value;render()});
 document.getElementById('ai-connection')?.addEventListener('submit',async e=>{e.preventDefault();aiReady=false;aiToken=document.getElementById('ai-passcode').value;try{aiEndpoint=backendURL(document.getElementById('ai-url').value);const r=await fetch(`${aiEndpoint}/health`,{headers:{Authorization:`Bearer ${aiToken}`},signal:AbortSignal.timeout(15000)});const result=await r.json();if(!r.ok||!result.ready)throw Error('Backend is reachable but AI is not configured. Set APP_AI_KEY and AI_ACCESS_TOKEN in Render.');aiReady=true;localStorage.setItem('micro-ai-url',aiEndpoint);message='AI backend connected. You can now generate a lecture deck.'}catch(error){message=error.message||'Could not connect to the AI service.'}render()});
 document.getElementById('lecture-upload')?.addEventListener('submit',e=>{e.preventDefault();createLecture()});
}
async function openLecture(id){
 if(busy)return;await pendingSave;try{const next=await getLecture(id);if(!next)throw Error('This lecture was not found in browser storage.');setDeck(addStudyVisuals(migrateSchedule(next)),true);filter='due';section='all';search='';view='study';message='';resetQueue();await save();render();window.scrollTo(0,0)}catch(error){message=error.message;render()}
}
async function createLecture(){
 if(busy||!uploadFile)return;if(uploadFile.size>100*1024*1024){message='Please compress or split lecture files larger than 100 MB.';render();return}
 const file=uploadFile,title=uploadTitle.trim(),mode=uploadMode;busy=true;message='Reading your lecture…';render();
 try{
  await pendingSave;let parsed;
  if(file.name.toLowerCase().endsWith('.json')){parsed=normalizeDeck(JSON.parse(await file.text()));parsed.generation=parsed.generation||'imported'}
  else if(file.name.toLowerCase().endsWith('.pdf'))parsed=await readPDF(file,t=>{message=t;render()});
  else if(file.name.toLowerCase().endsWith('.pptx'))parsed=await readLecture(file);
  else throw Error('Choose a PowerPoint, PDF, or exported JSON deck.');
  parsed.lectureId=crypto.randomUUID();parsed.title=title||parsed.title||file.name;
  if(!file.name.toLowerCase().endsWith('.json')){
   if(mode==='ai'){
    if(!aiReady)throw Error('Connect your AI backend first.');
    // Persist the source and local drafts first, so a network/provider failure cannot discard the upload.
    parsed.generation='local';await storeDeck({...migrateSchedule(parsed),updatedAt:Date.now()});
    try{parsed=await generateAI(parsed,aiEndpoint,aiToken,t=>{message=t;render()})}catch(error){setDeck(migrateSchedule(parsed));lectures=await listLectures();await save();throw error}
   }else parsed.generation='local';
  }
  setDeck(addStudyVisuals(migrateSchedule(parsed)));await save();uploadFile=null;uploadTitle='';view='study';filter='due';section='all';resetQueue();message=`Saved “${deck.title}” with ${deck.cards.length} ${deck.generation==='ai'?'AI-written draft':'draft'} cards. Review them in the library. Source slides and images are included.`;
 }catch(error){message=error.message||'Could not create your lecture deck. Try a smaller file.';lectures=await listLectures().catch(()=>lectures)}finally{busy=false;render()}
}

function connectionCheck(){return `<div class="account-connection"><button type="button" class="text-button" id="check-account" ${authWorking?'disabled':''}>Check connection</button><small>Checks account services without changing your cards.</small></div>`}
function accountWorkspace(){
 const notice=authNotice||accountError;
 if(!accountReady)return '<section class="workspace-panel account-panel"><h2>Your account</h2><p>Loading account settings…</p></section>';
 if(!authClient)return `<section class="workspace-panel account-panel"><h2>Study across your devices</h2><p>Account sign-in will be available once the cloud service is connected. You can keep studying as a guest.</p>${notice?`<p role="status">${esc(notice)}</p>`:''}<p><a href="https://github.com/aleks1212121/revise-1/blob/main/supabase/SETUP.md" target="_blank" rel="noopener">Account setup guide</a></p></section>`;
 if(recovering)return `<form id="password-update" class="workspace-panel account-panel"><h2>Choose a new password</h2><label>New password<input id="new-password" type="password" minlength="8" autocomplete="new-password" required></label><button class="button primary" ${authWorking?'disabled':''}>Update password</button>${notice?`<p role="status">${esc(notice)}</p>`:''}</form>`;
 if(accountUser)return `<section class="workspace-panel account-panel"><h2>Your study account</h2><p>Signed in as <strong>${esc(accountUser.email)}</strong></p><p id="sync-status" role="status" class="sync-status ${esc(syncState)}">${esc(syncLabel)}</p><p>Your lecture decks, edits and review dates sync across devices. Changes made while offline are kept on this device until it can sync.</p><div class="account-actions"><button class="button primary" id="sync-now" ${authWorking?'disabled':''}>Sync now</button><button class="button subtle" id="sign-out" ${authWorking?'disabled':''}>Sign out</button></div><hr><h3>Keep your existing progress</h3><p>If you studied as a guest in this browser, import those decks and reviews into your account. The guest copy stays here.</p><button class="button subtle" id="import-guest" ${authWorking?'disabled':''}>Import this browser’s guest progress</button>${notice?`<p role="status">${esc(notice)}</p>`:''}${connectionCheck()}</section>`;
 return `<form id="account-auth" class="workspace-panel account-panel"><h2>Continue studying anywhere</h2><p>Sign in on each device to use your private study account. Guest progress stays separate until you import it.</p><label>Email<input id="account-email" type="email" autocomplete="email" required></label><label>Password<input id="account-password" type="password" minlength="8" autocomplete="current-password" required></label><div class="account-actions"><button class="button primary" name="action" value="signin" ${authWorking?'disabled':''}>Sign in</button><button class="button subtle" name="action" value="signup" ${authWorking?'disabled':''}>Create account</button></div><button class="text-button" type="button" id="password-reset" ${authWorking?'disabled':''}>Forgot password?</button>${notice?`<p role="status">${esc(notice)}</p>`:''}${connectionCheck()}</form>`;
}
function bindAccounts(){
 document.getElementById('check-account')?.addEventListener('click',()=>accountAction(async()=>{const owner=accountUser?.id;const result=await checkAccountSetup(authClient,accountSettings(authClient),owner);if(owner===accountUser?.id)authNotice=result}));
 document.getElementById('account-auth')?.addEventListener('submit',async e=>{
  e.preventDefault();if(authWorking||busy)return;
  const email=document.getElementById('account-email').value.trim(),password=document.getElementById('account-password').value,signup=e.submitter?.value==='signup';
  authWorking=true;authNotice='';render();
  try{const {data,error}=signup?await authClient.auth.signUp({email,password,options:{emailRedirectTo:location.origin+import.meta.env.BASE_URL}}):await authClient.auth.signInWithPassword({email,password});if(error)throw error;authNotice=signup&&!data.session?'Check your email to confirm your account, then sign in.':''}catch(error){authNotice=error.message||'Could not sign in.'}finally{authWorking=false;render()}
 });
 document.getElementById('password-reset')?.addEventListener('click',async()=>{
  const email=document.getElementById('account-email').value.trim();if(!email){authNotice='Enter your email first.';render();return}
  await accountAction(async()=>{const {error}=await authClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+import.meta.env.BASE_URL});if(error)throw error;authNotice='If this email has an account, a password reset link will arrive shortly.'});
 });
 document.getElementById('password-update')?.addEventListener('submit',async e=>{e.preventDefault();const password=document.getElementById('new-password').value;await accountAction(async()=>{const {error}=await authClient.auth.updateUser({password});if(error)throw error;recovering=false;authNotice='Password updated.'})});
 document.getElementById('sync-now')?.addEventListener('click',()=>syncEngine?.sync());
 document.getElementById('sign-out')?.addEventListener('click',()=>accountAction(async()=>{await pendingSave;await syncEngine?.sync();const {error}=await authClient.auth.signOut({scope:'local'});if(error)throw error;authNotice=''}));
 document.getElementById('import-guest')?.addEventListener('click',()=>accountAction(async()=>{await pendingSave;await importGuestLectures();await syncEngine?.sync();await refreshCloudDeck();authNotice='Guest progress imported into this account. The guest copy is preserved.'}));
}
async function accountAction(action){if(authWorking||busy)return;authWorking=true;authNotice='';render();try{await action()}catch(error){authNotice=error.message||'This action could not be completed.'}finally{authWorking=false;render()}}
async function refreshCloudDeck(){
 await touchGate.idle();await pendingSave;const saved=await loadDeck();if(saved&&saved.lectureId===deck?.lectureId){const id=current()?.id,wasFlipped=flipped;setDeck(addStudyVisuals(migrateSchedule(saved)),true);resetQueue();const position=queue.indexOf(id);if(position>=0){index=position;flipped=wasFlipped}}
 lectures=await listLectures();if(!editing&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))render();
}
function queueIdentity(session,event){identityQueue=identityQueue.catch(()=>{}).then(()=>changeIdentity(session,event));return identityQueue}
async function changeIdentity(session,event){
 if(event==='PASSWORD_RECOVERY'){recovering=true;view='account'}
 const next=session?.user||null;
 if((next?.id||'')===(accountUser?.id||'')){accountUser=next;if(recovering)render();return}
 busy=true;render();await pendingSave;syncEngine?.stop();syncEngine=null;
 accountUser=next;friends.reset();setStorageScope(next?.id||'');deck=null;saveBaseline=null;syncState='local';syncLabel=next?'Preparing sync…':'Saved on this device';editing=null;filter='due';section='all';search='';message='';
 try{
  const restoreRemote=next&&!await loadDeck();let restore=!!restoreRemote;
  await bootDecks();
  if(next){const owner=next.id;syncEngine=new CloudSync({client:authClient,userId:owner,storage:{allLectures,applyCloud},onStatus:(state,label)=>{if(accountUser?.id!==owner)return;syncState=state;syncLabel=state==='error'?`Not synced: ${label} Changes remain saved on this device.`:label;const field=document.getElementById('sync-status');if(field){field.textContent=syncLabel;field.className=`sync-status ${state}`}else if(!editing)render()},onChange:async rows=>{if(accountUser?.id!==owner)return;if(restore&&rows?.length){const latest=rows.map(r=>r.payload).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];const saved=await getLecture(latest.lectureId);if(saved){setDeck(addStudyVisuals(migrateSchedule(saved)),true);await save()}}restore=false;await refreshCloudDeck()}});await syncEngine.sync()}
 }catch(error){authNotice=error.message||'Could not open this account’s study data.'}finally{busy=false;render();if(view==='friends')friends.open()}
}
async function initAccounts(){
 try{authClient=await accountClient();accountReady=true;if(!authClient){render();return}
  authClient.auth.onAuthStateChange((event,session)=>{setTimeout(()=>queueIdentity(session,event).catch(error=>{authNotice=error.message;busy=false;render()}),0)});
  const {data,error}=await authClient.auth.getSession();if(error)throw error;await queueIdentity(data.session,'INITIAL_SESSION');render();
 }catch(error){accountReady=true;accountError=error.message||'Accounts are unavailable.';render()}
}
window.addEventListener('online',()=>syncEngine?.sync());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncEngine?.sync()});
setInterval(()=>{if(!document.hidden)syncEngine?.sync()},60_000);
