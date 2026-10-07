import { readLecture, readPDF, normalizeDeck } from './lecture.js';
import { escapeHTML, renderCloze, clozeCards } from './cloze.js';
import { loadDeck, storeDeck, listLectures, getLecture, ensureLecture } from './storage.js';
import {isDue,schedule,intervalLabel,nextReviewLabel,migrateSchedule,preserveSchedule} from './scheduler.js';
import {addStudyVisuals} from './visuals.js';
import {backendURL,generateAI} from './ai.js';
import './style.css';
const bundledLectures=[{id:'genetic-variation',label:'Genetic variation'},{id:'cell-injury',label:'Cell injury I & II'},{id:'cell-death',label:'Cell death'}];
let deck=null,lectures=[],uploadFile=null,uploadTitle='',uploadMode='ai',aiToken='',aiReady=false;
let aiEndpoint='';try{aiEndpoint=localStorage.getItem('micro-ai-url')||''}catch{}
let view='study',index=0,flipped=false,filter='due',visualHint=false,illustrationIndex=0,section='all',search='',queue=[],busy=false,message='',editing=null;
const esc=escapeHTML;
let pendingSave=Promise.resolve();
const save=()=>{deck.lectureId=deck.lectureId||(deck.curated?'microorganisms':crypto.randomUUID());deck.updatedAt=Date.now();const snapshot=structuredClone(deck);pendingSave=pendingSave.catch(()=>{}).then(async()=>{await storeDeck(snapshot);lectures=await listLectures()}).catch(()=>{message='Could not save this deck in browser storage. Export a backup before leaving.';render()});return pendingSave};
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
 try{deck=await loadCurated();view='study';filter='due';section='all';message='Loaded 178 lecture-based cards, including 7 visual cards. Each answer links to the original slide.';await save();resetQueue();render()}catch(e){message=e.message;render()}
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
function render(){
 const all=cards(),known=all.filter(c=>c.status==='known').length,c=current();
 document.querySelector('#app').innerHTML=`<aside><a class="brand" href="#"><span class="brand-icon">✳</span> micro<span class="brand-dot">.</span></a><div class="workspace-label">YOUR WORKSPACE</div><button class="nav ${view==='lectures'?'active':''}" data-view="lectures">▤ <span>Lectures</span><small>${lectures.length}</small></button><button class="nav ${view==='study'?'active':''}" data-view="study">▱ <span>Study cards</span></button><button class="nav ${view==='library'?'active':''}" data-view="library">▦ <span>Card library</span><small>${all.length}</small></button><button class="nav ${view==='slides'?'active':''}" data-view="slides">▧ <span>Slide reference</span></button><div class="sidebar-lectures"><div class="workspace-label">LECTURE DECKS</div>${lectures.map(l=>`<button class="lecture-shortcut ${l.lectureId===deck?.lectureId?'active':''}" data-open-lecture="${esc(l.lectureId)}" title="${esc(l.title)}"><span>${esc(l.lectureId==='microorganisms'?'Microorganisms':(bundledLectures.find(b=>b.id===l.lectureId)?.label||l.title))}</span><small>${l.count}</small></button>`).join('')}</div><div class="aside-bottom"><div class="privacy-dot"></div><div>Made for your mind.<br><small>Stored only in this browser</small></div></div></aside>
 <main class="${view==='study'&&deck?'study-mode':''}"><header><span>MY LECTURES <span class="slash">/</span> <strong>${esc(deck?.title||'My lectures')}</strong></span><div class="header-actions"><button class="button subtle" id="curated">${deck?.curated?'Reset lecture deck':'Microorganisms deck'}</button><button class="button subtle" id="import-top">＋ Import lecture</button></div></header><section class="content"><div class="eyebrow"><span></span> ${deck?.curated?'LIFE SCIENCES · LS5008 / LS5030':'YOUR PERSONAL STUDY WORKSPACE'}</div><div class="title-row"><div><h1>${deck?.curated?'Small organisms.<br> Big understanding.':view==='lectures'?'Your lectures.<br> Your learning.':esc(deck?.title||'Your personal study space')}</h1><p class="subtitle">A little recall today. A lot more confidence tomorrow.</p></div><div class="micro-art" aria-hidden="true"><i></i><i></i><i></i><b>✳</b><span>THE MICRO WORLD</span></div></div>
 ${deck&&!deck.curated&&deck.generation!=='ai'&&deck.generation!=='local'&&deck.generation!=='reviewed'?'<div class="notice">Your saved deck is still open. Open <strong>Microorganisms deck</strong> above for the 178 focused cloze and visual cards in the reviewed example lecture.</div>':''}
 ${message?`<div role="status" class="notice">${esc(message)}</div>`:''}
 ${view!=='lectures'?`<div class="stats"><div><span class="stat-icon">▦</span><div><strong>${all.length}</strong><small>Flashcards</small></div></div><div><span class="stat-icon green">✓</span><div><strong>${known}</strong><small>Confident</small></div></div><div><span class="stat-icon orange">↻</span><div><strong>${all.filter(c=>isDue(c)).length}</strong><small>Due now</small></div></div><div class="progress-stat"><div><small>YOUR PROGRESS</small><strong>${all.length?Math.round(known/all.length*100):0}%</strong></div><div class="progress"><i style="width:${all.length?known/all.length*100:0}%"></i></div></div></div>`:''}
 ${view==='lectures'?lectureWorkspace():!deck?`<section class="import-panel"><div class="upload-icon">↥</div><span class="eyebrow">YOUR LECTURE, READY TO LEARN</span><h2>Bring your notes to life.</h2><p>Open <strong>Revisiting microorganisms</strong> to create a personal<br class="desktop"> flashcard deck from your PowerPoint slides.</p><button class="button primary" id="upload">${busy?'Reading your lecture…':'Choose lecture file'} <span>↗</span></button><small>POWERPOINT (.PPTX) OR EXPORTED DECK (.JSON)</small><div class="local-note">♧ Your lecture stays on your device. No account needed.</div></section>`:view==='study'?`<div class="study-toolbar"><div class="tabs"><button data-filter="due" class="${filter==='due'?'selected':''}">Due now</button><button data-filter="all" class="${filter==='all'?'selected':''}">All cards</button><button data-filter="review" class="${filter==='review'?'selected':''}">To revisit</button><button data-filter="new" class="${filter==='new'?'selected':''}">Unstudied</button><button data-filter="visual" class="${filter==='visual'?'selected':''}">Visual</button></div><div class="study-options"><select id="section" aria-label="Lecture section">${(deck?.curated?[['all','All topics'],['foundations','Foundations & growth'],['structures','Cell structures'],['colonies','Colonies & biofilms'],['taxonomy','Taxonomy'],['research','Research figure']]:[['all','All topics'],...[...new Set(cards().map(c=>c.topic||'General'))].map(t=>[t,t])]).map(([value,label])=>`<option value="${esc(value)}" ${section===value?'selected':''}>${esc(label)}</option>`).join('')}</select><button class="text-button" id="shuffle">⇄ Shuffle</button></div></div>
 ${c?`<div class="card-meta"><span>SLIDE ${c.slide} <span>·</span> ${esc(c.topic)}</span><span>${index+1} / ${queue.length} · ${esc(nextReviewLabel(c))}</span></div><section class="study-layout ${(flipped||visualHint)&&c.illustrations?.length&&(!c.showImagesFront||visualHint)?'has-diagram':''}"><div class="study-left"><button class="flashcard ${flipped?'flipped':''}" id="flip"><span class="card-label">${c.type==='cloze'?(flipped?'MISSING TERM REVEALED':'FILL IN THE BLANK'):flipped?'THE ANSWER':'QUICK RECALL'}</span><h2>${cardContent(c,flipped)}</h2>${flipped&&c.explanation?`<p class="card-explanation">${esc(c.explanation)}</p>`:''}${(flipped||c.showImagesFront)&&(!flipped||c.showImagesFront||!c.illustrations?.length)?`<div class="slide-pictures">${pictures(flipped?(c.answerImages||c.images):c.images,false)}</div>`:''}${flipped?`<span class="source-link">Slide ${c.slide} · ${esc(c.topic)}</span>`:''}<span class="flip-hint">⤾ ${flipped?'Click to see question':'Click to reveal answer'} <kbd>Space</kbd></span></button><div class="study-extra">${c.illustrations?.length?`<button class="text-button" id="visual-hint">${flipped?'Study illustrations':visualHint?'Hide visual hint':'Show visual hint'}</button>`:''}<button class="text-button" id="source-slide">View source slide ↗</button>${c.showImagesFront?'<span>Visual recall · answer labels hidden</span>':''}</div></div>${c.illustrations?.length&&(flipped||visualHint)&&(!c.showImagesFront||visualHint)?`<section class="study-diagrams"><div class="diagram-heading"><span>${flipped?'Visualise the structure':'Visual hint · may reveal the answer'}</span>${c.illustrations.length>1?`<div class="diagram-tabs">${c.illustrations.map((id,i)=>`<button class="${illustrationIndex===i?'selected':''}" data-diagram="${i}" aria-label="Show ${esc(deck.mediaCredits?.[id]?.title||'illustration')}" aria-pressed="${illustrationIndex===i}">${i+1}</button>`).join('')}</div>`:''}</div>${c.illustrations.slice(illustrationIndex,illustrationIndex+1).map(id=>`<figure>${pictures([id])}<figcaption>${esc(deck.mediaCredits?.[id]?.title||'Study illustration')}<small>${esc(deck.mediaCredits?.[id]?.credit||'')} · click image to enlarge</small></figcaption></figure>`).join('')}</section>`:''}<div class="rating">${[['again','Again','review'],['hard','Hard','review'],['good','Good','confident'],['easy','Easy','confident']].map(([value,label,style],i)=>`<button class="button ${style}" id="${value}" ${!flipped?'disabled':''}><span>${label} <kbd>${i+1}</kbd><small>${intervalLabel(c,value)}</small></span></button>`).join('')}</div><div class="card-navigation"><button id="prev" ${index===0?'disabled':''}>← Previous</button><span>Take your time. Understanding beats speed.</span><button id="next" ${index>=queue.length-1?'disabled':''}>Next →</button></div></section>`:`<div class="empty-state"><span>✳</span><h2>${filter==='due'?'You’re up to date.':queue.length?'Session complete. Nice work.':'A clean slate.'}</h2><p>${filter==='due'?nextDueSummary():queue.length?'Your progress is saved. Cards will return when their review is due.':'There are no cards in this group.'}</p><button class="button primary" id="restart">${filter==='due'?'Practise all cards':'Study again'}</button></div>`}`:
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
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(busy)return;view=b.dataset.view;refreshDueQueue();render()});
 for(const id of ['upload','import-top'])document.getElementById(id)?.addEventListener('click',()=>{if(!busy){view='lectures';render()}});
 bindLectures();
 document.getElementById('file').onchange=e=>importFile(e.target.files[0]);
 document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;resetQueue();render()});
 document.getElementById('section')?.addEventListener('change',e=>{section=e.target.value;resetQueue();render()});
 document.getElementById('flip')?.addEventListener('click',()=>{flipped=!flipped;render()});
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
function rate(rating){const c=current();if(!c||!flipped)return;Object.assign(c,schedule(c,rating));save();message=`${rating==='again'?'Relearning scheduled':'Review saved'} · ${nextReviewLabel(c)}.`;if(filter==='due')queue.splice(index,1);else index++;flipped=false;visualHint=false;illustrationIndex=0;render()}
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
 next.lectureId=crypto.randomUUID();deck=addStudyVisuals(migrateSchedule(next));filter='due';section='all';view=next.cards.length?'study':'slides';await save();resetQueue();
 }catch(e){message=e.message||'Could not read the file. Try another PowerPoint.'}finally{busy=false;render()}
}
 document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)||editing)return;if(view!=='study'||!current())return;if(e.code==='Space'){e.preventDefault();flipped=!flipped;render()}else if(['1','2','3','4'].includes(e.key))rate(['again','hard','good','easy'][Number(e.key)-1]);else if(e.key==='ArrowRight'&&index<queue.length-1){index++;flipped=false;visualHint=false;illustrationIndex=0;render()}else if(e.key==='ArrowLeft'&&index>0){index--;flipped=false;visualHint=false;illustrationIndex=0;render()}});
render();
loadDeck().then(async value=>{
 deck=value?addStudyVisuals(migrateSchedule(value)):await loadCurated();resetQueue();await save();
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
}).catch(()=>{message='Browser storage is unavailable. Export your deck to keep a copy.';render()});

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
 if(busy)return;await pendingSave;try{const next=await getLecture(id);if(!next)throw Error('This lecture was not found in browser storage.');deck=addStudyVisuals(migrateSchedule(next));filter='due';section='all';search='';view='study';message='';resetQueue();await save();render();window.scrollTo(0,0)}catch(error){message=error.message;render()}
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
    try{parsed=await generateAI(parsed,aiEndpoint,aiToken,t=>{message=t;render()})}catch(error){deck=migrateSchedule(parsed);lectures=await listLectures();await save();throw error}
   }else parsed.generation='local';
  }
  deck=addStudyVisuals(migrateSchedule(parsed));await save();uploadFile=null;uploadTitle='';view='study';filter='due';section='all';resetQueue();message=`Saved “${deck.title}” with ${deck.cards.length} ${deck.generation==='ai'?'AI-written draft':'draft'} cards. Review them in the library. Source slides and images are included.`;
 }catch(error){message=error.message||'Could not create your lecture deck. Try a smaller file.';lectures=await listLectures().catch(()=>lectures)}finally{busy=false;render()}
}
