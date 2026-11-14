import {teachingWeek,weekLabel,compareTeachingWeeks} from './teaching-weeks.js';
import {MODULES,moduleFor} from './modules.js';
import {PRACTICAL_LECTURES} from './practical-lectures.js';
export function roadmapStatus(lecture){
 if(lecture.reviewDue>0)return 'Review due';
 if(!lecture.studied)return 'Not started';
 return lecture.studied<lecture.count?'In progress':'First pass complete';
}
export function roadmapModel(lectures){
 const ordered=[...lectures].sort(compareTeachingWeeks);
 const totals=ordered.reduce((a,l)=>({cards:a.cards+l.count,studied:a.studied+(l.studied||0),reviewDue:a.reviewDue+(l.reviewDue||0),started:a.started+Number(l.studied>0),seen:a.seen+Number(l.count>0&&l.studied>=l.count)}),{cards:0,studied:0,reviewDue:0,started:0,seen:0});
 const known=ordered.filter(l=>teachingWeek(l));const last=Math.max(0,...known.map(l=>teachingWeek(l).start));
 const weeks=Array.from({length:last},(_,i)=>({week:i+1,lectures:known.filter(l=>teachingWeek(l).start===i+1)}));
 const unassigned=ordered.filter(l=>!teachingWeek(l));if(unassigned.length)weeks.push({week:null,lectures:unassigned});
 for(const group of weeks){group.total=group.lectures.reduce((n,l)=>n+l.count,0);group.studied=group.lectures.reduce((n,l)=>n+(l.studied||0),0);group.complete=group.lectures.length>0&&group.studied>=group.total;}
 const next=ordered.filter(l=>l.count>0&&(l.reviewDue>0||(l.studied||0)<l.count)).sort((a,b)=>Number(b.reviewDue>0)-Number(a.reviewDue>0)||compareTeachingWeeks(a,b)).slice(0,3);
 return {totals,weeks,next};
}
export function roadmapWorkspace(lectures,esc,selected=''){
 const filtered=selected?lectures.filter(l=>moduleFor(l)===selected):lectures,{totals,weeks,next}=roadmapModel(filtered);
 const firstOpen=(weeks.find(w=>w.lectures.length&&!w.complete)||weeks.find(w=>w.lectures.length))?.week;
 const percent=totals.cards?Math.round(totals.studied/totals.cards*100):0;
 const moduleLabel=l=>MODULES.find(m=>m.id===moduleFor(l))?.code||'Personal lecture';
 const row=l=>`<li class="roadmap-lecture"><div><span class="roadmap-kicker">${esc(moduleLabel(l))} · ${esc(weekLabel(l))}${PRACTICAL_LECTURES.has(l.lectureId)?' · Practical':''}</span><h4>${esc(l.title)}</h4><span class="roadmap-status">${esc(roadmapStatus(l))}</span><span class="roadmap-coverage">${l.studied||0}/${l.count} cards seen${l.reviewDue>0?` · ${l.reviewDue} reviews due`:''}</span></div><button type="button" class="button subtle" data-open-lecture="${esc(l.lectureId)}">${l.reviewDue>0?'Review':l.studied?'Continue':'Start'} →</button></li>`;
 return `<section class="roadmap-workspace"><div class="workspace-heading"><div><span class="eyebrow">YOUR STUDY PLAN</span><h2>Roadmap</h2><p>One week at a time. Refresh older cards, then work through your lectures.</p></div><label class="roadmap-module">Module<select id="roadmap-module" aria-label="Roadmap module"><option value="">All modules</option>${MODULES.map(m=>`<option value="${esc(m.id)}" ${m.id===selected?'selected':''}>${esc(m.name)} (${esc(m.code||'Personal')})</option>`).join('')}</select></label></div>
 <section class="workspace-panel roadmap-overview" aria-label="Roadmap progress"><div class="roadmap-numbers"><span><strong>${totals.started}/${filtered.length}</strong> lectures started</span><span><strong>${totals.seen}</strong> first passes complete</span><span><strong>${totals.reviewDue}</strong> cards to refresh</span></div><div class="progress" role="progressbar" aria-label="Roadmap study coverage" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${percent}%"></i></div><p>${totals.studied}/${totals.cards} cards seen · ${percent}% coverage. Reviews keep returning after your first pass.</p></section>
 ${next.length?`<section class="workspace-panel roadmap-next"><span class="eyebrow">A GOOD PLACE TO START</span><h3>Up next</h3><ul>${next.map(row).join('')}</ul></section>`:filtered.length?'<p class="workspace-panel">You’re up to date with these decks. New reviews will appear here when they’re due.</p>':'<p class="workspace-panel">No lectures here yet. Add a deck in Lectures to start your roadmap.</p>'}
 <div class="roadmap-week-heading"><h3>Week by week</h3><button type="button" class="text-button" id="roadmap-expand" aria-expanded="false">Expand all weeks</button></div><p class="roadmap-note">Teaching Block 1 · Decks spanning several weeks appear once, under their first week. Change a week in Lectures if needed. This lists your available decks; it isn’t your full university timetable.</p>
 <div class="roadmap-weeks">${weeks.map(w=>`<details class="roadmap-week" data-roadmap-week="${w.week||'unset'}" ${w.lectures.length&&w.week===firstOpen?'open':''}><summary><span><strong>${w.week?'Week '+w.week:'Week not set'}</strong><small>${w.lectures.length?`${w.lectures.length} deck${w.lectures.length===1?'':'s'} · ${w.studied}/${w.total} cards seen`:w.week===6?'Enrichment · consolidate earlier topics':'No decks assigned'}</small></span><span class="roadmap-week-state">${w.complete?'First pass complete':w.lectures.length?'View plan':'—'}</span></summary>${w.lectures.length?`<ul>${w.lectures.map(row).join('')}</ul>`:`<p>${w.week===6?'Revisit earlier topics and catch up on unfinished cards.':'No decks are assigned here yet. This does not mean there is no teaching this week.'}</p>`}</details>`).join('')}</div></section>`;
}
