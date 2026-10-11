import {escapeHTML as esc} from './cloze.js';
import setupSQL from '../supabase/notifications.sql?raw';
import functionCode from '../supabase/functions/slide-notifications/index.ts?raw';
export function inboxNotifications({client,user,enabled,render}){
 let generation=0,busy=false,checked=false,subscribed=false,error='',notice='',manual='';
 const supported=()=>globalThis.isSecureContext&&'Notification' in globalThis&&'serviceWorker' in navigator&&'PushManager' in globalThis;
 const alive=(token,owner)=>generation===token&&user()?.id===owner&&enabled();
 function reset(){generation++;busy=false;checked=false;subscribed=false;error='';notice='';manual=''}
 async function subscription(){const registration=await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);return registration?await registration.pushManager.getSubscription():null}
 async function rpc(name,args){const result=await client().rpc(name,args).abortSignal(AbortSignal.timeout(15000));if(result.error)throw result.error;return result.data}
 async function invoke(action,fields={}){const result=await client().functions.invoke('slide-notifications',{body:{action,...fields}});if(result.error){let detail='Deploy the slide-notifications function and run notifications.sql first.';try{const body=await result.error.context?.json();if(body?.error)detail=body.error}catch{}throw Error(detail)}return result.data}
 async function action(task){if(busy||!enabled())return;const token=generation,owner=user()?.id;busy=true;error='';notice='';render();try{await task(token,owner)}catch(e){if(alive(token,owner))error=['PGRST202','42883'].includes(e.code)?'Run the notification setup SQL below first.':e.message||'Could not update notifications.'}finally{if(alive(token,owner)){busy=false;render()}}}
 function html(){if(!enabled())return '';return `<section id="inbox-notifications" class="workspace-panel"><h3>Phone notifications</h3><p>Get a notification when someone sends slides, even while CHUDS is closed. Enable this on the phone you want to notify.</p>${!supported()?'<p>This browser does not support push notifications. On Android, open CHUDS in Chrome. On iPhone, add CHUDS to your Home Screen and open it there.</p>':`<p>${subscribed?'● Notifications enabled on this browser':'○ Notifications not enabled on this browser'}</p><button id="inbox-push-enable" class="button primary" ${busy?'disabled':''}>${busy?'Working…':subscribed?'Refresh notification connection':'Enable notifications'}</button>${subscribed?`<button id="inbox-push-test" class="button subtle" ${busy?'disabled':''}>Send test notification</button><button id="inbox-push-disable" class="button subtle" ${busy?'disabled':''}>Turn off on this browser</button>`:''}`} ${error?`<p role="alert">${esc(error)}</p>`:''}${notice?`<p role="status">${esc(notice)}</p>`:''}<details><summary>One-time Supabase setup</summary><ol><li><button class="button subtle" data-push-copy="sql">Copy notification setup SQL</button> · Run the whole query in <a href="https://supabase.com/dashboard/project/tltmnjaserpbsfdhchqm/sql/new" target="_blank" rel="noopener">Supabase SQL Editor</a>.</li><li><button class="button subtle" data-push-copy="function">Copy notification function code</button> · In <a href="https://supabase.com/dashboard/project/tltmnjaserpbsfdhchqm/functions" target="_blank" rel="noopener">Edge Functions</a>, deploy it as <strong>slide-notifications</strong>. Disable Verify JWT; the function validates your admin session and its private notification hook.</li><li>Tap Enable notifications on your phone, allow browser permission, then Send test notification. Push keys are generated and stored securely on the server—no extra key to copy.</li></ol>${manual?`<label>Setup text<textarea readonly rows="8">${esc(manual)}</textarea></label>`:''}</details></section>`}
 function bind(){
  if(!enabled())return;
  if(!checked&&supported()){
   checked=true;const token=generation,owner=user()?.id;
   (async()=>{try{const sub=await subscription();if(!alive(token,owner)||!sub)return;const active=await rpc('study_push_subscription_enabled',{p_endpoint:sub.endpoint});if(alive(token,owner)){subscribed=active===true&&Notification.permission==='granted';render()}}catch(e){if(alive(token,owner)){error=e.message||'Could not check notification settings.';render()}}})();
  }
  document.getElementById('inbox-push-enable')?.addEventListener('click',()=>action(async(token,owner)=>{
   // Request permission during the click gesture, before network requests.
   const permission=await Notification.requestPermission();if(!alive(token,owner))return;if(permission!=='granted')throw Error('Notifications were not allowed. Open Chrome site settings for CHUDS to allow them, then try again.');
   const {publicKey}=await invoke('initialize');if(!alive(token,owner))return;
   const registration=await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}notification-sw.js`,{scope:import.meta.env.BASE_URL});
   await navigator.serviceWorker.ready;if(!alive(token,owner))return;
   const bytes=Uint8Array.from(atob(publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
   const sub=await registration.pushManager.getSubscription()||await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});if(!alive(token,owner))return;
   await rpc('save_study_push_subscription',{p_subscription:sub.toJSON()});if(alive(token,owner)){subscribed=true;notice='Notifications enabled on this browser. Send a test to check your phone.'}
  }));
  document.getElementById('inbox-push-test')?.addEventListener('click',()=>action(async(token,owner)=>{const sub=await subscription();if(!alive(token,owner))return;if(!sub)throw Error('Enable notifications again first.');await invoke('test',{endpoint:sub.endpoint});if(alive(token,owner))notice='Test sent. Check your phone’s notifications.'}));
  document.getElementById('inbox-push-disable')?.addEventListener('click',()=>action(async(token,owner)=>{const sub=await subscription();if(!alive(token,owner))return;if(sub){await rpc('remove_study_push_subscription',{p_endpoint:sub.endpoint});if(!alive(token,owner))return;await sub.unsubscribe()}if(alive(token,owner)){subscribed=false;notice='Notifications turned off on this browser.'}}));
  document.querySelectorAll('[data-push-copy]').forEach(button=>button.addEventListener('click',async()=>{if(!enabled())return;const token=generation,owner=user()?.id,text=button.dataset.pushCopy==='sql'?setupSQL:functionCode;try{await navigator.clipboard.writeText(text);if(alive(token,owner)){notice='Setup copied.';render()}}catch{if(alive(token,owner)){manual=text;render();document.querySelector('#inbox-notifications details')?.setAttribute('open','')}}}));
 }
 return {html,bind,reset};
}
