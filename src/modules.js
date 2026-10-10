export const DEFAULT_MODULES=[
 {id:'pathobiology',name:'Pathobiology',code:'LS5009'},
 {id:'infection-immunity',name:'Infection and Immunity',code:'LS5008'},
 {id:'medical-genetics',name:'Medical Genetics',code:'LS5023'},
 {id:'physiology-research',name:'Medical Physiology, Research Methods and Skills',code:'LS5034'},
];
export const MODULES=DEFAULT_MODULES.map(m=>({...m}));
// Course codes identify modules; lecture names must not create separate groups.
export function moduleCode(module={}){
 const explicit=String(module.code||'').trim().toUpperCase();
 return explicit?explicit.replace(/\s+/g,''):String(module.name||'').match(/\bLS\s*\d{4}\b/i)?.[0].replace(/\s+/g,'').toUpperCase()||'';
}
export function moduleRegistry(state={},deleted=false,lectures=[]){
 const overrides=state.modules||{},defaults=DEFAULT_MODULES.filter(m=>Boolean(overrides[m.id]?.deleted)===deleted).map(m=>({...m,...overrides[m.id]}));
 const custom=Object.values(overrides).filter(m=>m.id?.startsWith('custom-')&&Boolean(m.deleted)===deleted&&typeof m.name==='string');
 const groups=new Map(),aliases=new Map();
 for(const m of [...defaults,...custom]){const inferred=new Set(lectures.filter(l=>l.moduleId===m.id).map(l=>moduleCode({code:l.moduleCode,name:`${l.title||''} ${l.source||''}`})).filter(Boolean));const code=moduleCode(m)||(inferred.size===1?[...inferred][0]:'');const key=code?`code:${code}`:`id:${m.id}`;const group=groups.get(key)||[];group.push({...m,code});groups.set(key,group)}
 const modules=[...groups.values()].map(group=>{
  // Stable across devices, independent of insertion order; keep default IDs.
  group.sort((a,b)=>Number(!DEFAULT_MODULES.some(m=>m.id===a.id))-Number(!DEFAULT_MODULES.some(m=>m.id===b.id))||a.id.localeCompare(b.id));
  const canonical=group[0],code=moduleCode(canonical);
  for(const m of group)aliases.set(m.id,canonical.id);
  return {...canonical,code,name:code==='LS5001'?'Molecular Biology of the Cell':canonical.name,memberIds:group.map(m=>m.id)};
 });
 return {modules,aliases};
}
let moduleAliases=new Map();
export function canonicalModuleId(id){return moduleAliases.get(id)||id||''}
export function configureModules(state={},lectures=[]){const registry=moduleRegistry(state,false,lectures);moduleAliases=registry.aliases;MODULES.splice(0,MODULES.length,...registry.modules)}
const bundled={'cell-injury':'pathobiology','cell-injury-2':'pathobiology','cell-death':'pathobiology',microorganisms:'infection-immunity','genetic-variation':'medical-genetics',viruses:'infection-immunity'};
export function moduleFor(lecture){const id=Object.hasOwn(lecture,'moduleId')?lecture.moduleId:bundled[lecture.lectureId];const canonical=canonicalModuleId(id);return MODULES.some(m=>m.id===canonical)?canonical:''}
export function moduleOptions(selected,esc,modules=MODULES){return `<option value="" ${!selected?'selected':''}>Unassigned</option>`+modules.map(m=>`<option value="${esc(m.id)}" ${selected===m.id?'selected':''}>${esc(m.name)}${m.code?` (${esc(m.code)})`:''}</option>`).join('')}
export function moduleTotals(lectures,id){const group=lectures.filter(l=>moduleFor(l)===id);const total=group.reduce((s,l)=>s+l.count,0),studied=group.reduce((s,l)=>s+(l.studied||0),0);return {lectures:group.length,total,studied,percent:total?Math.round(studied/total*100):0}}
export function modulesWorkspace(lectures,esc,user=null){return `<section class="modules-workspace"><span class="eyebrow">YOUR MODULES</span><h2>Pick a module.</h2><p>Keep your lectures together and see your progress across each module.</p>${user?`<form id="create-module" class="workspace-panel personal-module-form"><h3>Create a personal module</h3><p>Visible only in your account and synced across your devices.</p><label>Module name<input name="name" required maxlength="100" placeholder="e.g. Neuroscience"></label><label>Module code (optional)<input name="code" maxlength="30" placeholder="e.g. LS5010"></label><button class="button primary">Create module</button></form>`:'<p>Create your own modules with an account. <button class="text-button" data-view="account">Sign in</button></p>'}<button class="button subtle" data-view="trash">Open Trash</button><div class="module-grid">${MODULES.map(m=>{const p=moduleTotals(lectures,m.id);return `<article class="module-entry"><button class="module-tile" data-module="${esc(m.id)}"><span class="module-code">${esc(m.code||'PERSONAL MODULE')}</span><h3>${esc(m.name)}</h3><p>${p.lectures} lecture${p.lectures===1?'':'s'} · ${p.total} cards</p><div class="module-progress-label"><span>${p.studied} cards studied</span><strong>${p.percent}%</strong></div><div class="progress"><i style="width:${p.percent}%"></i></div><span class="module-open">View lectures →</span></button><button type="button" class="button subtle module-summary-button" data-summary-module="${esc(m.id)}">Quick summary</button><button class="text-button" data-delete-module="${esc(m.id)}">Move to Trash</button></article>`}).join('')}</div>${lectures.some(l=>!moduleFor(l))?`<button class="button subtle" data-module="unassigned">Unassigned lectures (${lectures.filter(l=>!moduleFor(l)).length}) →</button>`:''}</section>`}
