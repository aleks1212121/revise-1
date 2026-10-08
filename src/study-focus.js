import {escapeHTML as esc} from './cloze.js';
export const LIMITS={any:0,easy:10,medium:25,hard:50};
export function focusSettings(deck){const s=deck?.studyFocus||{};return {importance:['all','important','standard'].includes(s.importance)?s.importance:'all',difficulty:['any','easy','medium','hard'].includes(s.difficulty)?s.difficulty:'any',cram:s.cram===true}}
export function cardDifficulty(card){
 if(['easy','medium','hard'].includes(card.difficulty))return card.difficulty;
 if(['again','hard'].includes(card.lastRating))return 'hard';
 if(card.lastRating==='easy'||(card.status==='known'&&card.intervalDays>=7))return 'easy';
 return 'medium';
}
export function cardImportance(card){
 if(['important','standard'].includes(card.importance))return card.importance;
 const text=`${card.topic||''} ${card.text||card.question||''}`;
 if(/\b(19\d\d|20\d\d|Ivanovsky|Beijerinck|Chamberland|Rameses|Nobel|history|historical|discovery)\b/i.test(text))return 'standard';
 return /\b(mechanism|replication|genome|capsid|DNA|RNA|infection|immunity|immune|pathogen|apoptosis|necrosis|injury|death|mutation|inheritance|chromosome|gene|membrane|cell wall|peptidoglycan|antibiotic|vaccine|prion|viroid|latency|lysogenic|lytic|bacteria|virus|viruses|virion)\b/i.test(text)?'important':'standard';
}
export function focusLimit(settings){return LIMITS[settings.difficulty]||(settings.cram?25:0)}
export function focusSelection(cards,settings){
 const importance=settings.cram?'important':settings.importance;
 let matched=cards.filter(c=>(importance==='all'||cardImportance(c)===importance)&&(settings.difficulty==='any'||cardDifficulty(c)===settings.difficulty));
 if(settings.cram){const rank={hard:0,medium:1,easy:2};matched=[...matched].sort((a,b)=>rank[cardDifficulty(a)]-rank[cardDifficulty(b)])}
 const limit=focusLimit(settings);return {matched:matched.length,cards:limit?matched.slice(0,limit):matched,limit};
}
export function focusHTML(deck,current,eligible){
 const settings=focusSettings(deck),result=focusSelection(eligible,settings);
 const options=(values,selected)=>values.map(([v,label])=>`<option value="${v}" ${v===selected?'selected':''}>${label}</option>`).join('');
 return `<details class="study-focus" id="study-focus"><summary>${settings.cram?'⚡ Cram':'Focus'}${settings.importance!=='all'||settings.difficulty!=='any'||settings.cram?` · ${result.cards.length}`:''}</summary><div class="focus-panel"><strong>Revision settings · this deck</strong><label class="focus-cram"><input type="checkbox" id="focus-cram" ${settings.cram?'checked':''}> Cram mode · important cards only</label><label>Importance<select id="focus-importance" ${settings.cram?'disabled':''}>${options([['all','All importance'],['important','Important only'],['standard','Supporting cards']],settings.cram?'important':settings.importance)}</select></label><label>Difficulty & session size<select id="focus-difficulty">${options([['any','Any difficulty · '+(settings.cram?'up to 25':'all matches')],['easy','Easy only · up to 10'],['medium','Medium only · up to 25'],['hard','Hard only · up to 50']],settings.difficulty)}</select></label><p>${result.cards.length} cards in this session · ${result.matched} match your filters. Cram includes cards ahead of their due date and puts harder cards first.</p><p>Automatic difficulty follows your ratings; unstudied cards start Medium. Importance is a suggested core/supporting label, not an exam prediction.</p>${current?`<div class="focus-card"><strong>This card</strong><label>Importance<select id="card-importance">${options([['auto',`Suggested (${cardImportance({...current,importance:'auto'})})`],['important','Important'],['standard','Supporting']],current.importance||'auto')}</select></label><label>Difficulty<select id="card-difficulty">${options([['auto',`Automatic (${cardDifficulty({...current,difficulty:'auto'})})`],['easy','Easy'],['medium','Medium'],['hard','Hard']],current.difficulty||'auto')}</select></label></div>`:''}<button type="button" class="text-button" id="focus-reset">Reset deck filters</button><button type="button" class="text-button" id="focus-close">Done</button></div></details>`;
}
