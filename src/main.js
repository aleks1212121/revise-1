import { readLecture, normalizeDeck } from './lecture.js';
import { escapeHTML, renderCloze, clozeCards } from './cloze.js';
import { loadDeck, storeDeck } from './storage.js';
import {isDue,schedule,intervalLabel,nextReviewLabel,migrateSchedule,preserveSchedule} from './scheduler.js';
import {addStudyVisuals} from './visuals.js';
import './style.css';
let deck=null;
let view='study',index=0,flipped=false,filter='due',visualHint=false,illustrationIndex=0,section='all',search='',queue=[],busy=false,message='',editing=null;
const esc=escapeHTML;
let pendingSave=Promise.resolve();
const save=()=>{const snapshot=structuredClone(deck);pendingSave=pendingSave.catch(()=>{}).then(()=>storeDeck(snapshot)).catch(()=>{message='Could not save this deck in browser storage. Export a backup before leaving.';render()});return pendingSave};
function cardContent(c,reveal){return c.type==='cloze'?renderCloze(c.text||c.question,c.clozeNumber||1,reveal):esc(reveal?c.answer:c.question)}
function mediaURL(id){
 const src=deck?.media?.[id];
 if(typeof src!=='string')return '';
 if(/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(src))return src;
 if(/^(lecture\/[a-z0-9-]+\.jpg|illustrations\/[a-z0-9-]+\.png)$/.test(src))return `${import.meta.env.BASE_URL}${src}`;
 return '';
}
function pictures(ids=[],links=true){return ids.map(id=>{const src=mediaURL(id);if(!src)return '';const img=`<img loading="lazy" src="${esc(src)}" alt="Image from the lecture slide">`;return links?`<a href="${esc(src)}" target="_blank" rel="noopener" aria-label="Open slide image at full size">${img}</a>`:img}).join('')}
async function loadCurated(){
 const response=await fetch(`${import.meta.env.BASE_URL}lecture/deck.json`);if(!response.ok)throw Error('Could not load the lecture deck. Try refreshing.');
 return addStudyVisuals(migrateSchedule(await response.json()));
}
async function useCurated(){
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
function cardSection(c){return c.slide<=10?'foundations':c.slide<=37?'structures':c.slide<=50?'colonies':c.slide<=64?'taxonomy':'research'}
function matchesFilter(c){return (section==='all'||cardSection(c)===section)&&(filter==='all'||(filter==='due'?isDue(c):filter==='visual'?c.showImagesFront:c.status===filter))}
function resetQueue(){queue=cards().filter(matchesFilter).sort((a,b)=>filter==='due'?(a.status==='new')-(b.status==='new')||((a.dueAt||0)-(b.dueAt||0)):0).map(c=>c.id);index=0;flipped=false;visualHint=false}
function current(){return cards().find(c=>c.id===queue[index])}
function render(){
 const all=cards(),known=all.filter(c=>c.status==='known').length,c=current();
 document.querySelector('#app').innerHTML=`<aside><a class="brand" href="#"><span class="brand-icon">✳</span> micro<span class="brand-dot">.</span></a><div class="workspace-label">YOUR WORKSPACE</div><button class="nav ${view==='study'?'active':''}" data-view="study">▱ <span>Study cards</span></button><button class="nav ${view==='library'?'active':''}" data-view="library">▦ <span>Card library</span><small>${all.length}</small></button><button class="nav ${view==='slides'?'active':''}" data-view="slides">▧ <span>Slide reference</span></button><div class="aside-bottom"><div class="privacy-dot"></div><div>Made for your mind.<br><small>Stored only in this browser</small></div></div></aside>
 <main class="${view==='study'&&deck?'study-mode':''}"><header><span>MY LECTURES <span class="slash">/</span> <strong>Microorganisms</strong></span><div class="header-actions"><button class="button subtle" id="curated">${deck?.curated?'Reset lecture deck':'Load improved lecture deck'}</button><button class="button subtle" id="import-top">＋ Import lecture</button></div></header><section class="content"><div class="eyebrow"><span></span> LIFE SCIENCES · LS5008 / LS5030</div><div class="title-row"><div><h1>Small organisms.<br> Big understanding.</h1><p class="subtitle">A little recall today. A lot more confidence tomorrow.</p></div><div class="micro-art" aria-hidden="true"><i></i><i></i><i></i><b>✳</b><span>THE MICRO WORLD</span></div></div>
 ${deck&&!deck.curated?'<div class="notice">Your saved deck is still open. Choose <strong>Load improved lecture deck</strong> above for 178 focused cloze and visual cards written from your lecture.</div>':''}
 ${message?`<div role="status" class="notice">${esc(message)}</div>`:''}
 <div class="stats"><div><span class="stat-icon">▦</span><div><strong>${all.length}</strong><small>Flashcards</small></div></div><div><span class="stat-icon green">✓</span><div><strong>${known}</strong><small>Confident</small></div></div><div><span class="stat-icon orange">↻</span><div><strong>${all.filter(c=>isDue(c)).length}</strong><small>Due now</small></div></div><div class="progress-stat"><div><small>YOUR PROGRESS</small><strong>${all.length?Math.round(known/all.length*100):0}%</strong></div><div class="progress"><i style="width:${all.length?known/all.length*100:0}%"></i></div></div></div>
 ${!deck?`<section class="import-panel"><div class="upload-icon">↥</div><span class="eyebrow">YOUR LECTURE, READY TO LEARN</span><h2>Bring your notes to life.</h2><p>Open <strong>Revisiting microorganisms</strong> to create a personal<br class="desktop"> flashcard deck from your PowerPoint slides.</p><button class="button primary" id="upload">${busy?'Reading your lecture…':'Choose lecture file'} <span>↗</span></button><small>POWERPOINT (.PPTX) OR EXPORTED DECK (.JSON)</small><div class="local-note">♧ Your lecture stays on your device. No account needed.</div></section>`:view==='study'?`<div class="study-toolbar"><div class="tabs"><button data-filter="due" class="${filter==='due'?'selected':''}">Due now</button><button data-filter="all" class="${filter==='all'?'selected':''}">All cards</button><button data-filter="review" class="${filter==='review'?'selected':''}">To revisit</button><button data-filter="new" class="${filter==='new'?'selected':''}">Unstudied</button><button data-filter="visual" class="${filter==='visual'?'selected':''}">Visual</button></div><div class="study-options"><select id="section" aria-label="Lecture section">${[['all','All topics'],['foundations','Foundations & growth'],['structures','Cell structures'],['colonies','Colonies & biofilms'],['taxonomy','Taxonomy'],['research','Research figure']].map(([value,label])=>`<option value="${value}" ${section===value?'selected':''}>${label}</option>`).join('')}</select><button class="text-button" id="shuffle">⇄ Shuffle</button></div></div>
 ${c?`<div class="card-meta"><span>SLIDE ${c.slide} <span>·</span> ${esc(c.topic)}</span><span>${index+1} / ${queue.length} · ${esc(nextReviewLabel(c))}</span></div><section class="study-layout ${(flipped||visualHint)&&c.illustrations?.length&&(!c.showImagesFront||visualHint)?'has-diagram':''}"><div class="study-left"><button class="flashcard ${flipped?'flipped':''}" id="flip"><span class="card-label">${c.type==='cloze'?(flipped?'MISSING TERM REVEALED':'FILL IN THE BLANK'):flipped?'THE ANSWER':'QUICK RECALL'}</span><h2>${cardContent(c,flipped)}</h2>${(flipped||c.showImagesFront)&&(!flipped||c.showImagesFront||!c.illustrations?.length)?`<div class="slide-pictures">${pictures(flipped?(c.answerImages||c.images):c.images,false)}</div>`:''}${flipped?`<span class="source-link">Slide ${c.slide} · ${esc(c.topic)}</span>`:''}<span class="flip-hint">⤾ ${flipped?'Click to see question':'Click to reveal answer'} <kbd>Space</kbd></span></button><div class="study-extra">${c.illustrations?.length?`<button class="text-button" id="visual-hint">${flipped?'Study illustrations':visualHint?'Hide visual hint':'Show visual hint'}</button>`:''}<button class="text-button" id="source-slide">View source slide ↗</button>${c.showImagesFront?'<span>Visual recall · answer labels hidden</span>':''}</div></div>${c.illustrations?.length&&(flipped||visualHint)&&(!c.showImagesFront||visualHint)?`<section class="study-diagrams"><div class="diagram-heading"><span>${flipped?'Visualise the structure':'Visual hint · may reveal the answer'}</span>${c.illustrations.length>1?`<div class="diagram-tabs">${c.illustrations.map((id,i)=>`<button class="${illustrationIndex===i?'selected':''}" data-diagram="${i}" aria-label="Show ${esc(deck.mediaCredits?.[id]?.title||'illustration')}" aria-pressed="${illustrationIndex===i}">${i+1}</button>`).join('')}</div>`:''}</div>${c.illustrations.slice(illustrationIndex,illustrationIndex+1).map(id=>`<figure>${pictures([id])}<figcaption>${esc(deck.mediaCredits?.[id]?.title||'Study illustration')}<small>${esc(deck.mediaCredits?.[id]?.credit||'')} · click image to enlarge</small></figcaption></figure>`).join('')}</section>`:''}<div class="rating">${[['again','Again','review'],['hard','Hard','review'],['good','Good','confident'],['easy','Easy','confident']].map(([value,label,style],i)=>`<button class="button ${style}" id="${value}" ${!flipped?'disabled':''}><span>${label} <kbd>${i+1}</kbd><small>${intervalLabel(c,value)}</small></span></button>`).join('')}</div><div class="card-navigation"><button id="prev" ${index===0?'disabled':''}>← Previous</button><span>Take your time. Understanding beats speed.</span><button id="next" ${index>=queue.length-1?'disabled':''}>Next →</button></div></section>`:`<div class="empty-state"><span>✳</span><h2>${filter==='due'?'You’re up to date.':queue.length?'Session complete. Nice work.':'A clean slate.'}</h2><p>${filter==='due'?nextDueSummary():queue.length?'Your progress is saved. Cards will return when their review is due.':'There are no cards in this group.'}</p><button class="button primary" id="restart">${filter==='due'?'Practise all cards':'Study again'}</button></div>`}`:
 view==='library'?`<div class="library-toolbar"><input id="search" placeholder="Search questions, answers, or topics…" value="${esc(search)}"><button class="button subtle" id="add">＋ Add card</button><button class="button subtle" id="export">↓ Export</button></div><div class="library">${all.filter(c=>[c.question,c.answer,c.topic].join(' ').toLowerCase().includes(search.toLowerCase())).map(c=>`<article><div><span class="eyebrow">SLIDE ${c.slide} · ${esc(c.topic)}</span><h3>${cardContent(c,false)}</h3><p>${esc(c.answer)}</p><small>${c.type==='cloze'?'Cloze · deletion '+(c.clozeNumber||1):'Question & answer'}${c.draft?' · Auto-generated draft':''} · ${esc(nextReviewLabel(c))}</small></div><button class="text-button" data-edit="${c.id}">Edit ↗</button></article>`).join('')||'<p>No matching cards.</p>'}</div>`:`<div class="slide-reference"><h2>Your slide reference</h2><p>Original slide text and pictures. Use these to check and improve your cards.</p>${(deck.slides||[]).map(slide=>`<article id="slide-${slide.number}"><span class="eyebrow">SLIDE ${slide.number}</span><h3>${esc(slide.topic)}</h3><p>${esc(slide.text)}</p><div class="slide-pictures">${pictures(slide.images)}</div></article>`).join('')||'<p>Reimport your PowerPoint to load the slide reference.</p>'}</div>`}
 <footer><span>✳ Built around your lecture.</span><span>${deck?'Cloze & visual recall · Source slides included':'Read. Recall. Repeat.'}</span></footer></section></main><input type="file" id="file" accept=".pptx,.json" hidden>
 ${editing?`<div class="modal-backdrop"><form id="edit-form" class="modal"><h2>${editing.id?'Edit flashcard':'New flashcard'}</h2><label>Topic<input name="topic" value="${esc(editing.topic)}" required></label><label>Card style<select name="type" id="card-type"><option value="basic" ${editing.type!=='cloze'?'selected':''}>Question & answer</option><option value="cloze" ${editing.type==='cloze'?'selected':''}>Anki-style cloze</option></select></label>
 ${editing.type==='cloze'?`<label>Cloze statement<textarea name="text" id="cloze-text" required>${esc(editing.text||editing.question)}</textarea></label><button type="button" class="button subtle" id="hide-selection">Hide selected text</button><p class="editor-help">Select a term, then hide it. Syntax: {{c1::answer::optional hint}}. Use c2 for a separate card; repeat c1 to hide terms together. Editing this note updates its linked cards.</p><div class="cloze-preview">${renderCloze(editing.text||editing.question,editing.clozeNumber||1)}</div>`:`<label>Question<textarea name="question" required>${esc(editing.question)}</textarea></label><label>Answer<textarea name="answer" required>${esc(editing.answer)}</textarea></label>`}
 <label>Source slide<input type="number" min="0" name="slide" value="${editing.slide||0}"></label><label class="checkbox-label"><input name="showImagesFront" type="checkbox" ${editing.showImagesFront?'checked':''}> Show slide pictures with the question (otherwise on reveal)</label>
 <div class="slide-pictures editor-images">${pictures((deck.slides||[]).find(s=>s.number===editing.slide)?.images||editing.images)}</div>
 <div><button type="button" class="button subtle" id="cancel">Cancel</button>${editing.id?'<button type="button" class="button review" id="delete">Delete</button>':''}<button class="button primary">Save card</button></div></form></div>`:''}`;
 bind();
}
function bind(){
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;refreshDueQueue();render()});
 for(const id of ['upload','import-top'])document.getElementById(id)?.addEventListener('click',()=>{if(!busy)document.getElementById('file').click()});
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
function rate(rating){const c=current();if(!c||!flipped)return;Object.assign(c,schedule(c,rating));save();message=`${rating==='again'?'Relearning scheduled':'Review saved'} · ${nextReviewLabel(c)}. Cards are never marked done forever.`;if(filter==='due')queue.splice(index,1);else index++;flipped=false;visualHint=false;illustrationIndex=0;render()}
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
 if(!file)return;if(deck&&!confirm('Replace your current deck? Export it first if you want to keep a copy.'))return;
 busy=true;message='';render();try{
 let next;
 if(file.name.toLowerCase().endsWith('.json'))next=normalizeDeck(JSON.parse(await file.text()));
 else if(file.name.toLowerCase().endsWith('.pptx')){
  next=await readLecture(file);
  const images=Object.keys(next.media).length;
  message=`Created ${next.cards.length} draft cloze cards and saved ${images} slide pictures. Check them in the library. Unconverted text and image-only slides are preserved in Slide reference. These cards are automatic drafts, not a reviewed lecture deck.`;
 }else throw Error('Choose a .pptx lecture or a .json deck.');
 deck=addStudyVisuals(migrateSchedule(next));filter='due';section='all';view=next.cards.length?'study':'slides';await save();resetQueue();
 }catch(e){message=e.message||'Could not read the file. Try another PowerPoint.'}finally{busy=false;render()}
}
 document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement.tagName)||editing)return;if(view!=='study'||!current())return;if(e.code==='Space'){e.preventDefault();flipped=!flipped;render()}else if(['1','2','3','4'].includes(e.key))rate(['again','hard','good','easy'][Number(e.key)-1]);else if(e.key==='ArrowRight'&&index<queue.length-1){index++;flipped=false;visualHint=false;illustrationIndex=0;render()}else if(e.key==='ArrowLeft'&&index>0){index--;flipped=false;visualHint=false;illustrationIndex=0;render()}});
render();
loadDeck().then(async value=>{deck=value?addStudyVisuals(migrateSchedule(value)):await loadCurated();resetQueue();render();save()}).catch(()=>{message='Browser storage is unavailable. Export your deck to keep a copy.';render()});

function refreshDueQueue(){
 if(!deck||view!=='study'||filter!=='due'||editing||busy)return;
 const remaining=new Set(queue.slice(index));
 const added=cards().filter(c=>matchesFilter(c)&&!remaining.has(c.id)).map(c=>c.id);
 if(added.length){queue.push(...added);render()}
}
setInterval(refreshDueQueue,30_000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDueQueue()});
