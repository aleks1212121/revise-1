import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
// JWT verification is disabled for this function; every action checks the scoped
// worker key in SQL. The service key is used ONLY to fetch an approved slide file.
Deno.serve(async (request: Request) => {
 if(request.method!=='POST')return Response.json({error:'Use POST with a scoped inbox key'},{status:405});
 const token=request.headers.get('x-chuds-worker-token')||'';
 if(token.length<40||token.length>200)return Response.json({error:'Inbox key required'},{status:401});
 const url=Deno.env.get('SUPABASE_URL')!, anon=Deno.env.get('SUPABASE_ANON_KEY')!;
 const client=createClient(url,anon,{global:{headers:{'x-chuds-worker-token':token}},auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const length=Number(request.headers.get('content-length')||0);if(length>21*1024*1024)return Response.json({error:'Request too large'},{status:413});
  const raw=await request.text();if(new TextEncoder().encode(raw).length>21*1024*1024)return Response.json({error:'Request too large'},{status:413});
  const body=JSON.parse(raw);let result;
  if(body.action==='check')result=await client.rpc('study_worker_check');
  else if(body.action==='submission')result=await client.rpc('study_worker_submission',{p_id:body.submission_id});
  else if(body.action==='inbox')result=await client.rpc('study_worker_inbox',{p_include_completed:body.include_completed===true,p_limit:body.limit||50});
  else if(body.action==='deliver')result=await client.rpc('study_worker_deliver',{p_id:body.submission_id,p_deck:body.deck});
  else if(body.action==='download'){
   const metadata=await client.rpc('study_worker_submission',{p_id:body.submission_id});if(metadata.error)throw metadata.error;
   const row=metadata.data;
   if(!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/source\.(pdf|pptx)$/.test(row.object_path)||!row.object_path.startsWith(row.user_id+'/'+row.id+'/'))throw Error('Invalid submitted file path');
   const storage=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
   const file=await storage.storage.from('lecture-submissions').download(row.object_path);if(file.error)throw file.error;
   if(!file.data||file.data.size!==Number(row.file_size))throw Error('Submitted file size mismatch');
   return new Response(file.data,{headers:{'content-type':row.object_path.endsWith('.pdf')?'application/pdf':'application/vnd.openxmlformats-officedocument.presentationml.presentation','content-length':String(file.data.size),'x-chuds-submission-id':row.id}});
  }else return Response.json({error:'Unknown action'},{status:400});
  if(result.error)throw result.error;return Response.json(result.data);
 }catch(error){const message=error instanceof Error?error.message:String((error as {message?:string})?.message||'Inbox request failed');return Response.json({error:message},{status:/key|access required/i.test(message)?401:400});}
});
