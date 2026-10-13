import test from 'node:test';
import assert from 'node:assert/strict';
import {explanationPrompt,explanationURL,explanationHTML} from '../src/ai-explain.js';
test('explanation uses active linked cloze, lecture context and no account or review data',()=>{
 const card={type:'cloze',text:'{{c1::Cells}} produce {{c2::ATP::energy molecule}}.',clozeNumber:2,slide:3,topic:'Energy',explanation:'ATP supplies energy.',lastRating:'again',reviews:3};
 const prompt=explanationPrompt({title:'Lecture',user_id:'private-account'},card);
 assert.match(prompt,/Question: Cells produce \[blank\]\./);assert.match(prompt,/Answer: ATP/);assert.match(prompt,/ATP supplies energy/);assert.doesNotMatch(prompt,/private-account|lastRating|reviews/);
 assert.equal(new URL(explanationURL(prompt)).searchParams.get('q'),prompt);
});
test('basic and escaped card links open only ChatGPT',()=>{
 const card={question:'Why <script> & "?',answer:'A & B',slide:1};
 const prompt=explanationPrompt({title:'Basic'},card);assert.match(prompt,/Answer: A & B/);
 const html=explanationHTML({title:'Basic'},card);assert.match(html,/rel="noopener noreferrer"/);assert.doesNotMatch(html,/<script>/);assert.match(html,/https:\/\/chatgpt.com\//);
});
