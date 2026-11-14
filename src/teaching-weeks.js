// Teaching Block 1, from the current Canvas roadmaps; never infer weeks from review dates.
export const TEACHING_WEEKS={
 'inheritance-clarification':[3],
 'microorganisms':[2], 'viruses':[2], 'genetic-variation':[2],
 'cell-injury':[1,3], 'cell-injury-2':[1,3], 'cell-death':[1,3],
 'neoplasia':[4,5], 'inflammation-acute':[7], 'inflammation-chronic':[8],
 'breast-cancer-revision':[2,5], 'breast-cancer-practical':[2,5], 'breast-cancer-lecture':[2,5],
 'microbiology-practical':[2,8], 'epidemiology-infection-spread':[4],
 'medically-important-viruses':[5], 'virulence-factors':[7], 'endotoxins':[7],
 'female-reproductive-physiology':[7], 'embryonic-development':[8],
 'coronary-artery-disease':[4], 'heart-failure':[5], 'anti-obesity-drugs':[8],
 'cardiovascular-practical':[7,9], 'cardiovascular-practical-handout':[7,9],
 'lab-safety':[1], 'human-microbiome':[3], 'bacterial-infections':[5], 'sterilisation':[8],
 'medical-genetics-introduction':[1], 'modes-of-inheritance':[3], 'human-genome-project':[4],
 'population-genetics-1':[5], 'population-genetics-2':[7], 'chromosomal-abnormalities-1':[8],
 'genetics-practical-overview':[4,8], 'genetics-practical-1':[4,7], 'genetics-practical-2':[8,9],
 'non-communicable-diseases':[1,2], 'substrate-metabolism':[2], 'glucose-metabolism':[3], 'lipid-metabolism':[3],
 'research-methods-introduction':[1], 'scientific-method-design-thinking':[1],
};
export function teachingWeek(lecture){
 const known=TEACHING_WEEKS[lecture.lectureId];
 const start=Object.hasOwn(lecture,'week')?Number(lecture.week):known?.[0];
 if(!Number.isInteger(start)||start<1||start>25)return null;
 const end=Object.hasOwn(lecture,'weekEnd')?Number(lecture.weekEnd):(known?.[1]||start);
 return {start,end:Number.isInteger(end)&&end>=start&&end<=25?end:start};
}
export function weekLabel(lecture){const w=teachingWeek(lecture);return !w?'Week not set':w.start===w.end?`Week ${w.start}`:`Weeks ${w.start}–${w.end}`}
export function compareTeachingWeeks(a,b){return (teachingWeek(a)?.start??99)-(teachingWeek(b)?.start??99)||(teachingWeek(a)?.end??99)-(teachingWeek(b)?.end??99)||String(a.title).localeCompare(String(b.title))}
export function weekGroups(lectures){const groups=new Map();for(const lecture of [...lectures].sort(compareTeachingWeeks)){const week=teachingWeek(lecture)?.start??null;if(!groups.has(week))groups.set(week,[]);groups.get(week).push(lecture)}return [...groups].map(([week,lectures])=>({week,label:week?`Week ${week}`:'Week not set',lectures}))}
export function weekOptions(lecture){const selected=teachingWeek(lecture)?.start||'';return `<option value="" ${!selected?'selected':''}>Week not set</option>`+Array.from({length:25},(_,i)=>`<option value="${i+1}" ${selected===i+1?'selected':''}>Week ${i+1}</option>`).join('')}
