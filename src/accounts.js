import {createClient} from '@supabase/supabase-js';
const settings=new WeakMap();
export const accountSettings=client=>settings.get(client);
export function validateAccountConfig(config){
 const url=String(config.supabaseUrl||'').trim(),key=String(config.supabasePublishableKey||'').trim();
 if(!url&&!key)return null;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw Error('Use the HTTPS project URL from Supabase.');
 if(key.startsWith('sb_secret_'))throw Error('A secret key must never be used in this app. Use the publishable key.');
 if(!key.startsWith('sb_publishable_')){
  try{const claims=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));if(claims.role!=='anon')throw Error()}catch{throw Error('Use a Supabase publishable key or legacy anon key, never a service-role key.')}
 }
 return {url:url.replace(/\/$/,''),key};
}
export async function accountClient(){
 let config={supabaseUrl:import.meta.env.VITE_SUPABASE_URL||'',supabasePublishableKey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||''};
 if(!config.supabaseUrl){const r=await fetch(`${import.meta.env.BASE_URL}account-config.json`);if(!r.ok)throw Error('Account configuration could not be loaded.');config=await r.json()}
 const validated=validateAccountConfig(config);if(!validated)return null;
 const client=createClient(validated.url,validated.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});settings.set(client,validated);return client;
}
