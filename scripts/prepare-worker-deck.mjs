import {readFileSync} from 'node:fs';
import {prepareChatGPTDeck} from '../src/chatgpt-deck.js';
try{console.log(JSON.stringify(prepareChatGPTDeck(readFileSync(0,'utf8'))))}catch(error){console.error(error.message);process.exitCode=1}
