import {escapeHTML as esc} from './cloze.js';
import {MODULES,moduleOptions} from './modules.js';
import {validateSubmissionFile,SUBMISSION_BUCKET} from './submission-file.js';
import './admin.css';
const setup='https://github.com/aleks1212121/revise-1/blob/main/supabase/admin.sql';
const date=value=>value?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
const moduleName=id=>MODULES.find(m=>m.id===id)?.name||'Unassigned';
const statusName={received:'Received',reviewing:'Reviewing',completed:'Completed'};
export function adminWorkspace({client,user,render}){
 let generation=0,request=0,capable=false,mode=false,ready=false,unavailable=false,loading=false,working=false,error='',notice='';
 let dashboard=null,submissions=[],usersPage=0,submissionsPage=0,query='',file=null,title='',moduleId='',message='',drafts={};
 const alive=(token,owner)=>token===generation&&user()?.id===owner;
 const enabled=()=>capable&&mode;
 const preference=()=>`chuds-admin-mode:${user()?.id}`;
 function reset(){generation++;request++;capable=false;mode=false;ready=false;unavailable=false;loading=false;working=false;error='';notice='';dashboard=null;submissions=[];usersPage=0;submissionsPage=0;query='';file=null;title='';moduleId='';message='';drafts={}}
 async function connect(){
  const token=generation,owner=user()?.id;if(!owner){ready=true;return}
  try{const result=await client().rpc('is_study_admin').abortSignal(AbortSignal.timeout(15000));if(!alive(token,owner))return;if(result.error)throw result.error;capable=result.data===true;try{mode=capable&&localStorage.getItem(preference())==='on'}catch{mode=false}}
  catch(e){if(!alive(token,owner))return;unavailable=['PGRST202','42883'].includes(e.code)}
  finally{if(alive(token,owner)){ready=true;render()}}
 }
 function profileHTML(){
  if(!user())return '';
  if(capable)return `<section class="workspace-panel admin-profile"><h3>Admin access</h3><label class="admin-toggle"><input type="checkbox" id="admin-mode" ${mode?'checked':''}> Admin mode</label><p>Switch off to study normally. Your admin access stays linked to this account.</p>${mode?'<button class="button subtle" data-view="admin">Open admin area</button>':''}</section>`;
  return `<form id="admin-unlock" class="workspace-panel admin-profile"><h3>Unlock admin access</h3><p>Enter your private, single-use code, then toggle Admin mode whenever you need it.</p><label>Admin code<input id="admin-code" type="password" required minlength="20" maxlength="200" autocomplete="off" ${working||!ready?'disabled':''}></label><button class="button subtle" ${working||!ready?'disabled':''}>${working?'Checking…':'Unlock admin'}</button>${unavailable?`<p>Admin setup is not activated yet. <a href="${setup}" target="_blank" rel="noopener">Open admin.sql</a></p>`:''}${error?`<p role="alert">${esc(error)}</p>`:''}</form>`;
 }
 function failure(e){return ['PGRST202','PGRST205','42883','42P01'].includes(e.code)||/Bucket not found/.test(e.message||'')?'Activate the admin and slide-submission setup in Supabase first (admin.sql).':e.message||'Could not complete this action. Try again.'}
 async function open(admin=false){
  const token=generation,call=++request,owner=user()?.id;if(!owner){submissions=[];dashboard=null;return}
  if(admin&&!enabled())return;
  loading=true;error='';render();
  try{const result=admin?await client().rpc('study_admin_dashboard',{p_users_page:usersPage,p_submissions_page:submissionsPage,p_query:query}).abortSignal(AbortSignal.timeout(15000)):await client().from('lecture_submissions').select('*').eq('user_id',owner).order('created_at',{ascending:false}).limit(25).abortSignal(AbortSignal.timeout(15000));if(!alive(token,owner)||call!==request)return;if(result.error)throw result.error;if(admin)dashboard=result.data;else submissions=result.data||[]}
  catch(e){if(alive(token,owner)&&call===request)error=failure(e)}finally{if(alive(token,owner)&&call===request){loading=false;render()}}
 }
 const notices=()=>`${error?`<p class="notice" role="alert">${esc(error)}${error.includes('admin.sql')?` <a href="${setup}" target="_blank" rel="noopener">Setup SQL</a>`:''}</p>`:''}${notice?`<p class="notice" role="status">${esc(notice)}</p>`:''}`;
 function submissionHTML(row,admin=false){
  const draft=drafts[row.id]||row;
  return `<article class="submission-entry"><div class="submission-heading"><div><h3>${esc(row.title)}</h3><small>${esc(moduleName(row.module_id))} · ${esc(date(row.created_at))}</small>${admin?`<p>From ${esc(row.sender_email||'Account without email')}</p>`:''}</div><span class="submission-status">${esc(statusName[row.status]||row.status)}</span></div><p>${esc(row.file_name)} · ${(row.file_size/1024/1024).toFixed(1)} MB</p>${row.message?`<p class="submission-message">${esc(row.message)}</p>`:''}<button class="button subtle" data-submission-download="${esc(row.id)}" ${working?'disabled':''}>Download slides</button>${admin?`<form data-submission-review="${esc(row.id)}"><label>Status<select name="status">${Object.entries(statusName).map(([value,label])=>`<option value="${value}" ${draft.status===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Reply to sender<textarea name="reply" maxlength="2000" rows="2">${esc(draft.admin_reply||'')}</textarea></label><button class="button primary" ${working?'disabled':''}>Save review</button></form>`:row.admin_reply?`<p class="admin-reply"><strong>Admin reply:</strong> ${esc(row.admin_reply)}</p>`:''}</article>`;
 }
 function submissionsHTML(){
  return `<section class="admin-workspace"><h2>Send lecture slides to admin</h2><p>Ask for a new deck or share lecture material. Sending slides does not generate cards automatically.</p>${notices()}${!user()?`<section class="workspace-panel"><h3>Sign in to send slides</h3><p>You can keep studying as a guest. Sign in to send a file and receive an admin reply.</p><button class="button primary" data-view="account">Sign in</button><button class="button subtle" data-view="study">Keep studying as guest</button></section>`:`<form id="submission-form" class="workspace-panel"><label>Lecture title<input id="submission-title" maxlength="160" required value="${esc(title)}"></label><label>Module<select id="submission-module">${moduleOptions(moduleId,esc)}</select></label><label>Lecture slides<input id="submission-file" type="file" accept=".pdf,.pptx" ${working?'disabled':''}></label><small>${file?esc(file.name):'PDF or PPTX · up to 20 MB'}</small><label>Message to admin (optional)<textarea id="submission-message" maxlength="2000" rows="3">${esc(message)}</textarea></label><p>Your file and message are shared with the app admin. Other students cannot see them.</p><button class="button primary" ${working||loading?'disabled':''}>${working?'Sending…':'Send slides'}</button></form><section class="workspace-panel"><div class="submission-heading"><h3>Your latest submissions</h3><button class="button subtle" id="submissions-refresh" ${loading||working?'disabled':''}>Refresh</button></div>${loading?'<p role="status">Loading submissions…</p>':submissions.length?submissions.map(row=>submissionHTML(row)).join(''):'<p>No slides sent yet.</p>'}</section>`}</section>`;
 }
 function adminHTML(){
  if(!enabled())return `<section class="workspace-panel"><h2>Admin mode is off</h2><p>Unlock admin access or switch Admin mode on in your account.</p><button class="button primary" data-view="account">My account</button></section>`;
  const d=dashboard;
  return `<section class="admin-workspace"><div class="submission-heading"><h2>Admin area</h2><button class="button subtle" id="admin-refresh" ${loading||working?'disabled':''}>Refresh</button></div>${notices()}${d?`<div class="admin-counts"><div><strong>${d.user_count}</strong><small>Matching accounts</small></div><div><strong>${d.pending_count}</strong><small>Pending submissions</small></div></div><section class="workspace-panel"><h3>Registered users</h3><p>Account details and synced study totals. Guests study locally and do not appear in this list.</p><form id="admin-search" class="admin-search"><input type="search" id="admin-query" aria-label="Search account emails" maxlength="160" placeholder="Search email" value="${esc(query)}"><button class="button subtle" ${loading?'disabled':''}>Search</button></form><div class="admin-user-list">${d.users.map(u=>`<article><strong>${esc(u.email||'Account without email')}${u.is_admin?' · Admin':''}</strong><small>Joined ${esc(date(u.created_at))} · Last sign-in ${esc(date(u.last_sign_in_at))}</small><small>${u.decks} stored decks · ${u.studied_cards} cards studied · Last sync ${esc(date(u.last_synced_at))}</small></article>`).join('')||'<p>No matching accounts.</p>'}</div>${pagination('users',usersPage,d.user_count)}</section><section class="workspace-panel"><h3>Slide inbox</h3>${d.submissions.map(row=>submissionHTML(row,true)).join('')||'<p>No slide submissions yet.</p>'}${pagination('submissions',submissionsPage,d.submission_count)}</section>`:loading?'<p role="status">Loading admin area…</p>':''}</section>`;
 }
 function pagination(kind,page,total){return `<div class="admin-pagination"><button class="button subtle" data-admin-page="${kind}" data-direction="-1" ${page===0||loading?'disabled':''}>Previous</button><span>Page ${page+1} of ${Math.max(1,Math.ceil(total/25))}</span><button class="button subtle" data-admin-page="${kind}" data-direction="1" ${(page+1)*25>=total||loading?'disabled':''}>Next</button></div>`}
 async function action(task){if(working||loading)return;const token=generation,owner=user()?.id;working=true;error='';notice='';render();try{await task(token,owner)}catch(e){if(alive(token,owner))error=failure(e)}finally{if(alive(token,owner)){working=false;render()}}}
 function bind(){
  document.getElementById('admin-mode')?.addEventListener('change',e=>{mode=capable&&e.target.checked;try{localStorage.setItem(preference(),mode?'on':'off')}catch{}render()});
  document.getElementById('admin-unlock')?.addEventListener('submit',e=>{e.preventDefault();const code=document.getElementById('admin-code').value.trim();action(async(token,owner)=>{const result=await client().rpc('unlock_study_admin',{p_code:code}).abortSignal(AbortSignal.timeout(15000));if(result.error)throw result.error;if(!alive(token,owner))return;capable=true;mode=true;unavailable=false;try{localStorage.setItem(preference(),'on')}catch{}})});
  for(const [id,set] of [['submission-title',v=>title=v],['submission-module',v=>moduleId=v],['submission-message',v=>message=v]])document.getElementById(id)?.addEventListener('input',e=>set(e.target.value));
  document.getElementById('submission-file')?.addEventListener('change',e=>{file=e.target.files[0]||null;render()});
  document.getElementById('submission-form')?.addEventListener('submit',e=>{e.preventDefault();const chosen=file,details={title,moduleId,message};action(async(token,owner)=>{
   const kind=await validateSubmissionFile(chosen);if(!alive(token,owner))return;const id=crypto.randomUUID(),path=`${owner}/${id}/source.${kind.extension}`,storage=client().storage.from(SUBMISSION_BUCKET);
   const uploaded=await storage.upload(path,chosen,{contentType:kind.contentType,upsert:false});if(uploaded.error)throw uploaded.error;
   if(!alive(token,owner))return;
   const result=await client().rpc('submit_study_lecture',{p_id:id,p_title:details.title,p_module:details.moduleId,p_message:details.message,p_file_name:chosen.name,p_file_size:chosen.size,p_extension:kind.extension}).abortSignal(AbortSignal.timeout(30000));
   if(result.error){await storage.remove([path]);throw result.error}
   if(!alive(token,owner))return;file=null;title='';message='';notice='Slides sent. The admin can now download them and reply.';working=false;await open(false);
  })});
  document.getElementById('submissions-refresh')?.addEventListener('click',()=>open(false));
  document.getElementById('admin-refresh')?.addEventListener('click',()=>open(true));
  document.getElementById('admin-search')?.addEventListener('submit',e=>{e.preventDefault();query=document.getElementById('admin-query').value.trim();usersPage=0;open(true)});
  document.querySelectorAll('[data-admin-page]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.adminPage==='users')usersPage+=Number(b.dataset.direction);else submissionsPage+=Number(b.dataset.direction);open(true)}));
  document.querySelectorAll('[data-submission-review]').forEach(form=>{
   const id=form.dataset.submissionReview;
   form.addEventListener('input',()=>drafts[id]={status:form.elements.status.value,admin_reply:form.elements.reply.value});
   form.addEventListener('submit',e=>{e.preventDefault();const values={p_id:id,p_status:form.elements.status.value,p_reply:form.elements.reply.value};action(async(token,owner)=>{const result=await client().rpc('review_study_submission',values).abortSignal(AbortSignal.timeout(15000));if(result.error)throw result.error;if(!alive(token,owner))return;delete drafts[id];notice='Review saved. The sender can see your reply.';working=false;await open(true)})});
  });
  document.querySelectorAll('[data-submission-download]').forEach(b=>b.addEventListener('click',()=>{const row=[...submissions,...(dashboard?.submissions||[])].find(r=>r.id===b.dataset.submissionDownload);if(!row)return;action(async(token,owner)=>{const result=await client().storage.from(SUBMISSION_BUCKET).download(row.object_path);if(result.error)throw result.error;if(!alive(token,owner))return;const url=URL.createObjectURL(result.data),a=document.createElement('a');a.href=url;a.download=row.file_name.replace(/[\/\\]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)})}));
 }
 return {reset,connect,enabled,profileHTML,submissionsHTML,adminHTML,bind,open};
}
