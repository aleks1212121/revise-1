const VIEWS=new Set(['study','lectures','modules','roadmap','statistics','friends','settings','account','admin','submissions','trash','library','slides']);
const short=value=>typeof value==='string'?value.slice(0,300):'';
export function cleanNavigation(value={}){
 const state={view:VIEWS.has(value.view)?value.view:'study',scope:short(value.scope),lectureId:short(value.lectureId),moduleId:short(value.moduleId),lectureQuery:short(value.lectureQuery),roadmapModule:short(value.roadmapModule),filter:['due','all','review','new','visual'].includes(value.filter)?value.filter:'due',section:short(value.section)||'all',search:short(value.search),index:Number.isInteger(value.index)&&value.index>=0?value.index:0,flipped:!!value.flipped,visualHint:!!value.visualHint,illustrationIndex:Number.isInteger(value.illustrationIndex)?Math.max(0,value.illustrationIndex):0,scroll:Number.isFinite(value.scroll)?Math.max(0,value.scroll):0};
 if(Array.isArray(value.queue))state.queue=value.queue.filter(id=>typeof id==='string'&&id.length<=250).slice(0,5000);
 if(value.source&&typeof value.source==='object')state.source={number:Number.isInteger(value.source.number)?value.source.number:null,targetId:short(value.source.targetId),cardId:short(value.source.cardId)};
 return state;
}
export function navigationKey(state){return JSON.stringify([state.scope,state.view,state.view==='lectures'?state.moduleId:'',['study','slides','library'].includes(state.view)?state.lectureId:''])}
export function navigationHash(state){const params=new URLSearchParams();if(state.view==='lectures'&&state.moduleId)params.set('module',state.moduleId);if(['study','slides','library'].includes(state.view)&&state.lectureId)params.set('lecture',state.lectureId);return '#/'+state.view+(params.size?'?'+params:'')}
export function parseNavigationHash(hash){if(!/^#\/[a-z]+(?:\?|$)/.test(hash))return null;const [view,query='']=hash.slice(2).split('?');if(!VIEWS.has(view))return null;const p=new URLSearchParams(query);return cleanNavigation({view,moduleId:p.get('module'),lectureId:p.get('lecture')})}
export function browserNavigation({window:win,capture,restore,onError=()=>{}}){
 let active=false,applying=false,last=null,version=0;
 const payload=s=>({...win.history.state,chudsNavigation:{version:1,state:s}});
 const url=s=>{const u=new URL(win.location.href);u.hash=navigationHash(s);return u};
 const current=()=>cleanNavigation({...capture(),scroll:win.scrollY});
 function commit(){if(!active||applying)return;const next=current();
  if(last&&last.scope===next.scope&&navigationKey(last)!==navigationKey(next)){
   win.history.replaceState(payload(last),'');next.scroll=0;next.previous={view:last.view,lectureId:last.lectureId,scope:last.scope};win.history.pushState(payload(next),'',url(next));last=next;win.scrollTo(0,0);
  }else{if(last?.scope===next.scope&&last.previous)next.previous=last.previous;if(JSON.stringify(next)===JSON.stringify(last))return;last=next;win.history.replaceState(payload(next),'',url(next))}
 }
 async function apply(state){const token=++version;applying=true;try{await restore(cleanNavigation(state),()=>token===version);if(token!==version)return;last={...current(),scroll:state.scroll||0,previous:state.previous};win.history.replaceState(payload(last),'',url(last));win.requestAnimationFrame(()=>{if(token===version)win.scrollTo(0,state.scroll||0)})}catch(error){if(token===version)onError(error)}finally{if(token===version)applying=false}}
 async function start(){if(active)return;active=true;win.history.scrollRestoration='manual';const stored=win.history.state?.chudsNavigation;const scope=current().scope;const target=stored?.version===1?stored.state:parseNavigationHash(win.location.hash);
  if(target&&(!target.scope||target.scope===scope))await apply({...target,scope});else{last=current();win.history.replaceState(payload(last),'',url(last))}
 }
 win.addEventListener('popstate',event=>{if(!active)return;const saved=event.state?.chudsNavigation;const state=saved?.version===1?saved.state:parseNavigationHash(win.location.hash);if(!state)return;const scope=current().scope;apply(state.scope&&state.scope!==scope?{view:'account',scope}: {...state,scope})});
 win.addEventListener('pagehide',()=>{if(active&&!applying&&last){last={...current(),previous:last.previous};win.history.replaceState(payload(last),'',url(last))}});
 function begin(){if(active)return true;if(win.location.hash&&!win.location.hash.startsWith('#/'))return false;active=true;win.history.scrollRestoration='manual';last=current();win.history.replaceState(payload(last),'',url(last));return true}
 return {start,begin,commit,beforeRender(){if(active&&!applying&&last&&navigationKey(current())!==navigationKey(last))last={...last,scroll:win.scrollY}},backTo(view){if(last?.previous?.view===view&&last.previous.scope===current().scope&&last.previous.lectureId===current().lectureId){win.history.back();return true}return false}};
}
