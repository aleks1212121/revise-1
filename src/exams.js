import {exams,courses} from './exam-catalog.js';
import {escapeHTML as esc} from './cloze.js';

function canvasLink(url,label){
 return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
}

export function examWorkspace(selected,lectures){
 const exam=exams.find(item=>item.id===selected)||exams[0];
 const [course,moduleName]=courses[exam.module];
 const base=`https://canvas.kingston.ac.uk/courses/${course}/`;
 const saved=new Map(lectures.map(lecture=>[lecture.lectureId,lecture]));
 const options=exams.map(item=>`<option value="${item.id}" ${item===exam?'selected':''}>${item.module} · ${esc(item.title)}</option>`).join('');
 const rows=exam.lectures.map(lesson=>{
  const files=lesson.files.map(([id,label])=>canvasLink(base+'files/'+id,label));
  const decks=lesson.decks.filter(id=>saved.has(id)).map(id=>`<div class="exam-deck"><span>${esc(saved.get(id).title)}</span><div><button type="button" class="text-button" data-open-lecture="${id}">Study cards</button><a href="#/slides?lecture=${id}">Slide reference</a></div></div>`).join('');
  const pageLabel=lesson.page==='module-roadmap'?'Canvas roadmap':'Canvas lecture page';
  return `<li><h3>${esc(lesson.title)}</h3>${lesson.availability?`<p>${esc(lesson.availability)}</p>`:''}<div class="exam-links">${[...files,canvasLink(base+'pages/'+lesson.page,pageLabel)].join('')}</div>${decks}</li>`;
 }).join('');
 return `<section class="exam-workspace"><h1>Exams</h1><label for="exam-choice">Choose an assessment</label><select id="exam-choice">${options}</select><article><p class="exam-module">${exam.module} · ${esc(moduleName)}</p><h2>${esc(exam.title)}</h2><p class="exam-date">${esc(exam.date)}</p><p>${esc(exam.scope)}</p>${canvasLink(base+exam.brief,'Canvas assessment guidance')}</article><h2>Lectures and slides</h2><ol>${rows}</ol></section>`;
}
