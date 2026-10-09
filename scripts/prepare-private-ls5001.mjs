// Produce an owner-run SQL artifact. Never commit the output or uploaded slides.
import {readFileSync,writeFileSync} from 'node:fs';
import {prepareChatGPTDeck} from '../src/chatgpt-deck.js';
const [motility,trafficking,output]=process.argv.slice(2);
if(!motility||!trafficking||!output)throw Error('Usage: node scripts/prepare-private-ls5001.mjs motility.json trafficking.json output.sql');
const literal=s=>"'"+String(s).replaceAll("'","''")+"'";
let sql='-- CHUDS.org private LS5001 decks + read-only admin viewer.\n-- Run this complete file once in Supabase SQL Editor.\n-- Contains private lecture content: do not publish this file.\nbegin;\n';
for(const file of ['delivery.sql','admin-view.sql','prepared-decks.sql'])sql+=readFileSync(new URL('../supabase/'+file,import.meta.url),'utf8')+'\n';
for(const [id,path] of [['ls5001-cell-motility',motility],['ls5001-intracellular-trafficking',trafficking]]){
 const deck=prepareChatGPTDeck(readFileSync(path,'utf8'));
 if(!deck.source||deck.moduleCode!=='LS5001'||!deck.moduleName||deck.generation!=='reviewed')throw Error('Use reviewed LS5001 decks with original source filename and module metadata.');
 const json=JSON.stringify(deck);if(json.includes('$reviewed$'))throw Error('Reserved SQL delimiter in deck content');
 sql+='insert into public.study_prepared_decks(id,source_name,title,module_name,module_code,payload) values('+[id,deck.source,deck.title,deck.moduleName,deck.moduleCode].map(literal).join(',')+',$reviewed$'+json+'$reviewed$::jsonb) on conflict(id) do update set source_name=excluded.source_name,title=excluded.title,module_name=excluded.module_name,module_code=excluded.module_code,payload=excluded.payload;\n';
}
sql+=readFileSync(new URL('../supabase/auto-deliver-ls5001.sql',import.meta.url),'utf8')+'\ncommit;\n';
writeFileSync(output,sql);console.log('Private SQL artifact prepared. Lecture pictures are embedded; keep this file off public hosting.');
