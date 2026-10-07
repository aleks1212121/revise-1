import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {systemPrompt,schema,validateSlides,validateNotes} from './cards.js';
export function createAIService({apiKey=process.env.APP_AI_KEY,accessToken=process.env.AI_ACCESS_TOKEN,model=process.env.AI_MODEL||'gpt-4.1',origins=(process.env.ALLOWED_ORIGINS||'https://aleks1212121.github.io,http://localhost:5173,http://localhost:4173').split(','),fetchImpl=fetch}={}){
 let active=false;const recent=[];
 return createServer(async(req,res)=>{
  const origin=req.headers.origin;
  if(origin&&!origins.includes(origin)){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'This website is not allowed to use the AI service.'}));return}
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='Content-Type, Authorization';headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS'}
  const send=(status,data)=>{res.writeHead(status,headers);res.end(JSON.stringify(data))};
  if(req.method==='OPTIONS'){res.writeHead(204,headers);res.end();return}
  if(req.url==='/health'&&req.method==='GET'){if(req.headers.authorization&&accessToken){const a=Buffer.from(req.headers.authorization),b=Buffer.from(`Bearer ${accessToken}`);if(a.length!==b.length||!timingSafeEqual(a,b)){send(401,{error:'The service passcode is incorrect.'});return}}send(200,{ready:!!apiKey&&!!accessToken});return}
  if(req.url!=='/generate'||req.method!=='POST'){send(404,{error:'Not found.'});return}
  if(!apiKey||!accessToken){send(503,{error:'AI is not configured. Set APP_AI_KEY and AI_ACCESS_TOKEN in the server settings.'});return}
  const supplied=Buffer.from(req.headers.authorization||''),expected=Buffer.from(`Bearer ${accessToken}`);
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){send(401,{error:'The service passcode is missing or incorrect.'});return}
  const now=Date.now();while(recent.length&&recent[0]<now-3600000)recent.shift();
  if(active||recent.length>=60){send(429,{error:active?'The AI service is busy. Try again when the current lecture finishes.':'Hourly generation limit reached. Try again later.'});return}
  active=true;
  let slides;
  try{let size=0,parts=[];for await(const part of req){size+=part.length;if(size>12_000_000){active=false;send(413,{error:'Slide batch is too large.'});return}parts.push(part)}slides=validateSlides(JSON.parse(Buffer.concat(parts).toString()).slides)}catch{active=false;send(400,{error:'Invalid slide batch. Send up to eight slides with text and supported raster images.'});return}
  recent.push(now);
  try{
   const content=[];for(const s of slides){content.push({type:'text',text:`SOURCE SLIDE ${s.number}\nTopic: ${s.topic}\n${s.text}`});for(const image of s.images)content.push({type:'image_url',image_url:{url:image,detail:'auto'}})}
   const response=await fetchImpl('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model,messages:[{role:'system',content:systemPrompt},{role:'user',content}],response_format:{type:'json_schema',json_schema:{name:'lecture_cards',strict:true,schema}},temperature:0.2,max_completion_tokens:10000}),signal:AbortSignal.timeout(90000)});
   if(!response.ok){send(502,{error:response.status===401?'The AI provider rejected the server key. Check APP_AI_KEY in Render.':response.status===429?'The AI provider quota or rate limit was reached. Check billing and try later.':'The AI provider could not complete this batch. Try again later.'});return}
   const result=await response.json(),choice=result.choices?.[0];if(choice?.finish_reason!=='stop'||choice.message?.refusal)throw Error('Incomplete AI response');
   const notes=validateNotes(JSON.parse(choice.message.content).cards,slides);send(200,{cards:notes});
  }catch{send(502,{error:'AI generation failed or returned incomplete cards. Your uploaded lecture is still available locally; try again later.'})}finally{active=false}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const port=Number(process.env.PORT)||8787;createAIService().listen(port,'0.0.0.0',()=>console.log(`Lecture AI service listening on port ${port}`))}
