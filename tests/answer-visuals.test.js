import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {answerVisualCard,answerVisualMedia} from '../src/answer-visuals.js';
function sourceCard(id){for(const dir of readdirSync(new URL('../public/',import.meta.url))){const p=new URL('../public/'+dir+'/deck.json',import.meta.url);if(existsSync(p)){const c=JSON.parse(readFileSync(p)).cards.find(c=>c.id===id);if(c)return c}}}
const rules=JSON.parse(readFileSync(new URL('../src/answer-visuals.json',import.meta.url)));
test('answer support replaces unrelated stored images without changing review data',()=>{
 const id=Object.keys(rules.cards).find(id=>rules.cards[id].length);
 const card={...sourceCard(id),id,images:['unrelated-portrait'],illustrations:['generic'],due:123456,interval:8,history:[{rating:'again'}]};
 const original=structuredClone(card),rendered=answerVisualCard(card);
 assert.deepEqual(card,original);assert.deepEqual(rendered.images,[]);assert.deepEqual(rendered.illustrations,rules.cards[id]);
 const edited={...card,text:'My edited question'};assert.equal(answerVisualCard(edited),edited);
 assert.equal(rendered.due,card.due);assert.equal(rendered.history,card.history);
});
test('uncertain matches omit the image; visual recall and personal cards keep their intentional pictures',()=>{
 const id=Object.keys(rules.cards).find(id=>!rules.cards[id].length);
 assert.deepEqual(answerVisualCard({...sourceCard(id),id,images:['stock-photo']}).illustrations,[]);
 const visual={id,showImagesFront:true,images:['masked'],answerImages:['labelled']};assert.equal(answerVisualCard(visual),visual);
 const personal={id:'my-private-card',images:['my-diagram']};assert.equal(answerVisualCard(personal),personal);
});
test('every approved excerpt resolves to a bundled local file',()=>{
 for(const ids of Object.values(rules.cards))for(const id of ids){const m=answerVisualMedia(id);assert.match(m.src,/^explanatory-visuals\/excerpt-[a-f0-9]{20}\.webp$/);assert.ok(existsSync(new URL('../public/'+m.src,import.meta.url)));assert.match(m.title,/Lecture excerpt/)}
});
