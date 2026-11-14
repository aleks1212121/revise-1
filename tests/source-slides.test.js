import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {sourcePages,safeSourcePath,sourceSelection} from '../src/source-slide-model.js';
test('source paths stay local and do not accept remote URLs or path traversal',()=>{
 assert.equal(safeSourcePath('source-slides/human-microbiome/slide-10.webp'),'source-slides/human-microbiome/slide-10.webp');for(const bad of ['https://evil.test/slide.png','source-slides/../../secret.png','//evil.test/a.png','source-slides/x/slide-1.webp?url=bad','data:text/html,Hi'])assert.equal(safeSourcePath(bad),'');
});
test('source selection uses actual page images and leaves the stored deck untouched',()=>{
 const d={lectureId:'demo',cards:[{id:'c',reviews:4}],slides:[{number:1,text:'words',images:['fragment']}],media:{fragment:'data:image/png;base64,QQ=='}};const before=structuredClone(d),index={demo:{pages:[{number:1,src:'source-slides/demo/slide-1.webp',label:'Slide 1'}]}};assert.equal(sourcePages(d,index)[0].url,'/revise-1/source-slides/demo/slide-1.webp');assert.deepEqual(d,before);assert.equal(sourcePages(d,{})[0].url,'');
 const pdf={slides:[{number:2,sourceImage:'pdf-2',images:['pdf-2']}],media:{'pdf-2':'data:image/jpeg;base64,QQ=='}};assert.equal(sourcePages(pdf)[0].url,pdf.media['pdf-2']);
});
test('corrected practical cards can point to the current handout without changing their review identity',()=>{
 const index={old:{cardOverrides:{a:{lectureId:'handout',number:6}}},handout:{pages:[]}};assert.deepEqual(sourceSelection({lectureId:'old'},{id:'a',slide:17},index),{lectureId:'handout',number:6});assert.deepEqual(sourceSelection({lectureId:'old'},{id:'b',slide:17},index),{lectureId:'old',number:17});
});
test('bundled source previews cover every referenced card including hidden slides and split injury pages',()=>{
 const index=JSON.parse(readFileSync(new URL('../public/source-slides/index.json',import.meta.url)));
 for(const [id,entry] of Object.entries(index)){
  assert.equal(new Set(entry.pages.map(p=>p.number)).size,entry.pages.length);
  for(const p of entry.pages){assert.ok(safeSourcePath(p.src));assert.ok(existsSync(new URL('../public/'+p.src,import.meta.url)),p.src)}
  const folder=id==='microorganisms'?'lecture':id==='cell-injury-2'?'cell-injury':id;const deck=JSON.parse(readFileSync(new URL(`../public/${folder}/deck.json`,import.meta.url)));
  const cards=deck.cards.filter(c=>!id.startsWith('cell-injury')||((id==='cell-injury-2')===(c.slide>=40)));
  for(const card of cards){const target=sourceSelection({lectureId:id},card,index);assert.ok(index[target.lectureId].pages.some(p=>p.number===target.number),`${id}: source for card ${card.id} / ${target.number}`)}
 }
 for(const [id,count] of [['breast-cancer-lecture',58],['medical-genetics-introduction',48],['modes-of-inheritance',48]])assert.equal(index[id].pages.length,count);
 assert.equal(index['cell-injury-2'].pages[0].number,40);
});
