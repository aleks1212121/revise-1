import {exams,courses} from './exam-catalog.js';
import {escapeHTML as esc} from './cloze.js';

function canvasLink(url,label){
 return `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
}

export function examWorkspace(selected,lectures){
 const exam=exams.find(item=>item.id===selected);
 if(!exam){
  const cards=exams.map(item=>`<a class="module-tile exam-tile" href="#/exams?exam=${item.id}"><span class="module-code">${item.module} · ${esc(courses[item.module][1])}</span><h2>${esc(item.title)}</h2><p>${esc(item.date)}</p></a>`).join('');
  return `<section class="exam-workspace"><h1>Exams</h1><div class="module-grid">${cards}</div></section>`;
 }
 const [course,moduleName]=courses[exam.module];
 const base=`https://canvas.kingston.ac.uk/courses/${course}/`;
 const saved=new Map(lectures.map(lecture=>[lecture.lectureId,lecture]));
 const renderLesson=lesson=>{
  const files=lesson.files.map(([id,label])=>canvasLink(base+'files/'+id,label));
  const decks=lesson.decks.filter(id=>saved.has(id)).map(id=>`<div class="exam-deck"><span>${esc(saved.get(id).title)}</span><div><button type="button" class="text-button" data-open-lecture="${id}">Study cards</button><a href="#/slides?lecture=${id}">Slide reference</a></div></div>`).join('');
  const pageLabel=lesson.page==='module-roadmap'?'Canvas roadmap':'Canvas lecture page';
  return `<li><h3>${esc(lesson.title)}</h3>${lesson.availability?`<p>${esc(lesson.availability)}</p>`:''}<div class="exam-links">${[...files,canvasLink(base+'pages/'+lesson.page,pageLabel)].join('')}</div>${decks}</li>`;
 };
 const materials=exam.id==='micro-case'
  ? microbiologyPlan(exam.lectures,renderLesson)
  : `<h2>Lectures and slides</h2><ol>${exam.lectures.map(renderLesson).join('')}</ol>`;
 return `<section class="exam-workspace"><a class="exam-back" href="#/exams">← All exams</a><article><p class="exam-module">${exam.module} · ${esc(moduleName)}</p><h2>${esc(exam.title)}</h2><p class="exam-date">${esc(exam.date)}</p><p>${esc(exam.scope)}</p>${canvasLink(base+exam.brief,'Canvas assessment guidance')}</article>${materials}</section>`;
}

const revisionWeeks=[
 ['26–29 Nov','Foundations','Skim the introduction, then close the slides. Explain how a virus differs from a bacterium and why finding a microorganism in a healthy person can be expected. Check your explanation against the microbiome lecture.',
  ['module-introduction','revisiting-microorganisms','revisiting-microbes-viruses','the-human-microbiome']],
 ['30 Nov–6 Dec','Infections and spread','Pick one bacterial and one viral example from the slides. For each, explain which clinical or epidemiological clues support your interpretation and what else you would need to know.',
  ['epidemiology-and-infection-spread','medically-important-bacterial-infections','medically-important-viruses-2']],
 ['7–13 Dec','Disease mechanisms and the practical','Compare the clinical effects described in the two toxin lectures from memory. Revisit your practical notes and explain one observation, one conclusion it supports and one limitation. Use the TB1 revision session to check a point you found difficult.',
  ['exotoxins','endotoxins','coshh-and-risk-assessment','microbiology-practical-tb1']],
 ['14–20 Dec','Prevention, treatment and the mock','Use the slides to distinguish disinfection, sterilisation, vaccination and treatment. Try the module mock, then use peer-marking feedback to rewrite one answer with a clearer explanation.',
  ['disinfection','sterilisation','vaccination','module-roadmap','practicals-and-workshops']],
 ['21–27 Dec','Recall the whole block','Split the lecture list across two short sessions. For each topic, answer one question from memory. Mark the questions you missed and return to those slides the next day.',[]],
 ['28 Dec–3 Jan','Practise both cases','For each released case, write down the clues, the concept that explains each clue, and one uncertainty. If the cases are still to come, practise with two workshop examples and repeat with the official cases on release.',[]],
 ['4–10 Jan','Mix case questions with wider TB1','Write a short answer about each case or workshop example without notes. Then answer two questions from lectures neither example covered. Check your reasoning against the slides and redo the weakest answer.',[]],
 ['11–13 Jan','Final review','Talk through both available cases and revisit the questions you missed. On 13 January, keep the review short and check MyTimetable for your room and start time.',[]]
];

function microbiologyPlan(lectures,renderLesson){
 const byPage=new Map(lectures.map(lesson=>[lesson.page,lesson]));
 const weeks=revisionWeeks.map(([dates,title,task,pages])=>{
  const materials=pages.map(page=>renderLesson(byPage.get(page))).join('');
  return `<section class="revision-week"><h3>${dates} · ${title}</h3><p>${task}</p>${materials?`<ol aria-label="Study materials">${materials}</ol>`:''}</section>`;
 }).join('');
 return `<h2>January revision plan</h2><p>Start with the slides under each week. As soon as Canvas releases the two case studies, read both and connect their clues to the lectures as you go.</p>${weeks}`;
}
