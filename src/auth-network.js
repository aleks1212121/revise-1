// Bound authentication requests without imposing this limit on large deck syncs.
export function createAuthFetch(fetcher=fetch,timeoutMs=15000){
 return async(input,init={})=>{
  const url=typeof input==='string'||input instanceof URL?String(input):input.url;
  if(!/\/auth\/v1\//.test(url))return fetcher(input,init);
  const controller=new AbortController(),source=init.signal||(typeof input==='object'?input.signal:null);
  const forward=()=>controller.abort(source.reason);
  if(source?.aborted)forward();else source?.addEventListener('abort',forward,{once:true});
  let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;controller.abort()},timeoutMs);
  try{return await fetcher(input,{...init,signal:controller.signal})}
  catch(error){if(timedOut)throw Error('The account service took too long to respond. Check your connection and try again. If it keeps happening, the Supabase project may be unavailable or paused.');throw error}
  finally{clearTimeout(timer);source?.removeEventListener('abort',forward)}
 };
}
export function accountErrorMessage(error){
 const message=error?.message||'Could not sign in. Please try again.';
 if(/failed to fetch|fetch failed|networkerror|network request failed|load failed/i.test(message))return 'Could not reach the account service. Check your internet connection and try again. If other websites work, the Supabase project may be unavailable or paused.';
 return message;
}
