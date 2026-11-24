import {readdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {studyNote} from '../src/study-notes.js';

// Run on the published copy so source decks and their review identities stay stable.
export async function embedStudyNotes(directory) {
 for(const entry of await readdir(directory,{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const path=join(directory,entry.name,'deck.json');
  let raw;
  try { raw=await readFile(path,'utf8'); }
  catch(error){if(error.code==='ENOENT')continue;throw error}
  const deck=JSON.parse(raw);
  for(const card of deck.cards)card.studyNote=studyNote(deck,card);
  await writeFile(path,JSON.stringify(deck));
 }
}
