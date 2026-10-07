const timeout=()=>AbortSignal.timeout(15000);
function setupError(error){
 if(['PGRST205','42P01','PGRST202','42883'].includes(error.code))return Error('The study database or sync function is missing. Run the complete supabase/setup.sql in this project’s SQL Editor.');
 if(error.code==='42501')return Error('Study database permissions are missing. Run supabase/setup.sql again to restore account access.');
 return Error(error.message||'Could not verify account access.');
}
// These checks never create accounts, send emails or save a deck.
export async function checkAccountSetup(client,config,userId,fetcher=fetch){
 const response=await fetcher(`${config.url}/auth/v1/settings`,{headers:{apikey:config.key},signal:timeout()});
 if(!response.ok)throw Error(`Supabase authentication could not be reached (HTTP ${response.status}). Check the project URL/key and whether the project is paused.`);
 const settings=await response.json();
 if(settings.external?.email!==true)throw Error('Enable the Email provider in Supabase Authentication → Sign In / Providers.');
 if(!userId)return `Email sign-in is reachable.${settings.disable_signup?' New account registration is disabled in Supabase.':''} Sign in to check your database and sync function.`;
 const {data,error}=await client.auth.getUser();
 if(error)throw Error('Your session could not be verified. Sign in again, then retry the connection check.');
 if(data.user?.id!==userId)throw Error('The account session changed. Retry the connection check.');
 const read=await client.from('study_decks').select('lecture_id').eq('user_id',userId).limit(0).abortSignal(timeout());
 if(read.error)throw setupError(read.error);
 // The empty lecture ID is invalid and rejected before any insert/update by setup.sql.
 const probe=await client.rpc('save_study_deck',{p_lecture_id:'',p_payload:{},p_expected_revision:0}).abortSignal(timeout());
 if(probe.error?.code!=='P0001'||probe.error.message!=='Invalid lecture payload'){
  if(probe.error)throw setupError(probe.error);
  throw Error('The sync function does not match this app. Run the complete supabase/setup.sql again.');
 }
 return 'Verified: your signed-in session, deck access and sync function are available. Use Sync now to save pending reviews.';
}
