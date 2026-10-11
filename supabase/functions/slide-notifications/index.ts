import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import webpush from 'npm:web-push@3.6.7';
const SITE='https://aleks1212121.github.io';
const cors={'Access-Control-Allow-Origin':SITE,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
const options={auth:{persistSession:false,autoRefreshToken:false}};
const validEndpoint=(endpoint: string)=>{
 try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&/^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|([a-z0-9-]+\.)*notify\.windows\.com|web\.push\.apple\.com)$/.test(u.hostname)}catch{return false}
};
Deno.serve(async(request: Request)=>{
 const respond=(body: unknown,status=200)=>Response.json(body,{status,headers:cors});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return respond({error:'Use POST'},405);
 const origin=request.headers.get('origin');if(origin&&origin!==SITE)return respond({error:'Origin not allowed'},403);
 try{
  const raw=await request.text();if(raw.length>4096)return respond({error:'Request too large'},413);
  const body=JSON.parse(raw),url=Deno.env.get('SUPABASE_URL')!;
  const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options);
  let owner='',isAdmin=false,recipient='';const background=['notify','deck-ready'].includes(body.action);const ready=background?body.action==='deck-ready':body.kind==='ready';
  // Public JWT verification is off, but browser actions validate the signed-in
  // user and admin membership. Background actions require a server-only hook.
  if(!background){
   const bearer=request.headers.get('authorization')||'';if(!bearer.startsWith('Bearer '))return respond({error:'Sign in to your account'},401);
   const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{...options,global:{headers:{Authorization:bearer}}});
   const identity=await client.auth.getUser(bearer.slice(7));if(identity.error||!identity.data.user)return respond({error:'Sign in again'},401);
   const admin=await client.rpc('is_study_admin');isAdmin=!admin.error&&admin.data===true;if(body.action!=='initialize'&&!ready&&!isAdmin)return respond({error:'Admin access required'},403);
   owner=identity.data.user.id;
  }
  let result=await service.from('study_push_config').select('*').eq('id',true).maybeSingle();if(result.error)throw Error('Run notifications.sql first');
  let config=result.data;
  if(body.action==='initialize'&&!config){
   if(!isAdmin)return respond({error:'Ask the admin to activate notification setup first'},400);
   const keys=webpush.generateVAPIDKeys();
   const created=await service.from('study_push_config').insert({id:true,function_url:url+'/functions/v1/slide-notifications',hook_secret:crypto.randomUUID()+crypto.randomUUID(),vapid_public:keys.publicKey,vapid_private:keys.privateKey}).select('*').single();
   if(created.error&&created.error.code!=='23505')throw Error('Could not initialize notifications');
   result=await service.from('study_push_config').select('*').eq('id',true).single();if(result.error)throw Error('Could not read notification configuration');config=result.data;
  }
  if(!config)return respond({error:'Enable notifications in the Admin area first'},400);
  if(body.action==='initialize')return respond({publicKey:config.vapid_public});
  if(background){
   const hook=request.headers.get('x-chuds-push-hook')||'';
   // Compare fixed-length digests to avoid exposing partial secret matches.
   const digest=async(value: string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
   const [a,b]=await Promise.all([digest(hook),digest(config.hook_secret)]);let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];
   if(!hook||difference)return respond({error:'Notification hook rejected'},401);
   if(!/^[0-9a-f-]{36}$/.test(body.submission_id||''))return respond({error:'Invalid submission'},400);
   const submission=await service.from('lecture_submissions').select('id,user_id,status').eq('id',body.submission_id).maybeSingle();if(submission.error||!submission.data)return respond({error:'Submission not found'},404);
   if(ready){if(submission.data.status!=='completed')return respond({error:'Deck is not ready'},400);recipient=submission.data.user_id;const deck=await service.from('study_decks').select('lecture_id').eq('user_id',recipient).eq('lecture_id','submission-'+body.submission_id).maybeSingle();if(deck.error||!deck.data)return respond({error:'Delivered deck not found'},404);}
  }else if(body.action!=='test')return respond({error:'Unknown action'},400);
  let query=service.from('study_push_subscriptions').select('user_id,endpoint,subscription,inbox_enabled,ready_enabled');
  if(body.action==='deck-ready')query=query.eq('user_id',recipient);
  if(body.action==='test')query=query.eq('user_id',owner).eq('endpoint',body.endpoint||'');
  const subscriptions=await query;if(subscriptions.error)throw Error('Could not read subscriptions');
  const admins=await service.from('study_admins').select('user_id');if(admins.error)throw Error('Could not verify notification recipients');
  const active=new Set((admins.data||[]).map((r:{user_id:string})=>r.user_id));
  let sent=0,failed=0;const seen=new Set();
  for(const row of subscriptions.data||[]){
   if((ready?!row.ready_enabled:(!active.has(row.user_id)||row.inbox_enabled===false))||seen.has(row.endpoint))continue;seen.add(row.endpoint);
   if(row.subscription?.endpoint!==row.endpoint||!validEndpoint(row.endpoint)){failed++;continue}
   try{
    await webpush.sendNotification(row.subscription,JSON.stringify({title:body.action==='test'?'CHUDS notifications are working':ready?'Your flashcards are ready 📚':'New lecture slides 📚',body:body.action==='test'?'CHUDS notifications are enabled on this device.':ready?'Your lecture deck is ready. Open CHUDS to start revising.':'Someone uploaded lecture slides. Open your admin inbox to review them.',tag:body.action==='test'?'chuds-push-test':(ready?'chuds-ready-':'chuds-slides-')+body.submission_id,destination:ready?'lectures':'inbox'}),{TTL:86400,timeout:10000,vapidDetails:{subject:SITE,publicKey:config.vapid_public,privateKey:config.vapid_private}});
    sent++;
   }catch(error){
    const status=(error as {statusCode?:number}).statusCode;
    if(status===404||status===410)await service.from('study_push_subscriptions').delete().eq('endpoint',row.endpoint);
    failed++;
   }
  }
  if(body.action==='test'&&!sent)return respond({error:'Test was not delivered. Enable notifications again and check browser permission.'},400);
  return respond({sent,failed});
 }catch(error){return respond({error:error instanceof Error?error.message:'Could not send notifications'},400)}
});
