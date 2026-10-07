import {escapeHTML as esc} from './cloze.js';
export function voicePractice(){
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const canRead=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance);
 let scope='',key='',revealed=false,transcript='',open=false,autoRead=false,notice='',listening=false,speaking=false,recognition=null,generation=0,autoPending=false,audioGeneration=0,currentUtterance=null;
 function update(){const panel=document.getElementById('voice-practice');if(!panel)return;const field=panel.querySelector('#voice-transcript');if(field&&document.activeElement!==field)field.value=transcript;const status=panel.querySelector('#voice-status');if(status)status.textContent=notice;const mic=panel.querySelector('#voice-dictate');if(mic){mic.textContent=listening?'Stop dictation':'Dictate answer';mic.setAttribute('aria-pressed',String(listening))}const stop=panel.querySelector('#voice-stop');if(stop)stop.disabled=!speaking}
 function stopDictation(){generation++;const old=recognition;recognition=null;listening=false;try{old?.abort()}catch{}update()}
 function stopAudio(){audioGeneration++;currentUtterance=null;if(canRead)window.speechSynthesis.cancel();speaking=false;update()}
 function stop(){stopDictation();stopAudio()}
 function speak(){
  if(!canRead)return;stopDictation();stopAudio();
  const text=[document.querySelector('#flip h2')?.textContent,revealed?document.querySelector('#flip .card-explanation')?.textContent:''].filter(Boolean).join('. ').replace(/\[\s*[.…]+\s*\]/g,' blank ').replace(/\s+/g,' ').trim();if(!text)return;
  const audioToken=audioGeneration,utterance=new SpeechSynthesisUtterance(text);currentUtterance=utterance;utterance.lang='en-GB';utterance.rate=.95;
  const voices=window.speechSynthesis.getVoices();const voice=voices.find(v=>v.lang==='en-GB'&&v.localService)||voices.find(v=>v.lang.startsWith('en')&&v.localService)||voices.find(v=>v.lang.startsWith('en'));if(voice)utterance.voice=voice;
  speaking=true;notice=revealed?'Reading the revealed answer.':'Reading the question. Blanks stay hidden.';update();
  utterance.onend=()=>{if(audioToken!==audioGeneration)return;currentUtterance=null;speaking=false;update()};utterance.onerror=e=>{if(audioToken!==audioGeneration)return;currentUtterance=null;speaking=false;if(!['canceled','interrupted'].includes(e.error))notice='Audio could not play. Try Read aloud again.';update()};window.speechSynthesis.speak(utterance);
 }
 function dictate(){
  if(listening){stopDictation();notice='Dictation stopped. You can edit your answer below.';update();return}
  if(!Recognition)return;stopAudio();const token=++generation;let r;try{r=new Recognition();recognition=r;r.lang='en-GB';r.continuous=false;r.interimResults=true;
   r.onresult=e=>{if(token!==generation)return;transcript=Array.from(e.results).map(result=>result[0]?.transcript||'').join(' ');update()};
   r.onerror=e=>{if(token!==generation)return;listening=false;const messages={'not-allowed':'Microphone access was denied. Allow it in your browser settings, or type your answer.','service-not-allowed':'Dictation is unavailable in this browser. You can type your answer instead.','audio-capture':'No microphone was found. Check your microphone and try again.','no-speech':'No speech detected. Try again or type your answer.','network':'Your browser’s speech service could not connect. Try again when online.'};notice=messages[e.error]||'Dictation stopped. Try again or type your answer.';update()};
   r.onend=()=>{if(token!==generation)return;recognition=null;listening=false;if(notice==='Listening…')notice=transcript?'Answer captured. Reveal the card to compare, then choose your rating.':'No answer captured. Try again or type below.';update()};
   r.start();transcript='';listening=true;notice='Listening…';update();
  }catch{recognition=null;listening=false;notice='Dictation could not start. Try again or type your answer.';update()}
 }
 function html(info){
  if(info.scope!==scope||info.key!==key){stop();transcript='';notice='';key=info.key;scope=info.scope;autoPending=false}
  if(info.revealed!==revealed){stop();autoPending=info.revealed&&autoRead&&open}revealed=info.revealed;
  return `<details id="voice-practice" class="voice-practice" ${open?'open':''}><summary>Voice practice <span>Speak or listen</span></summary><div class="voice-actions"><button type="button" class="button subtle" id="voice-read" ${canRead?'':'disabled'}>${revealed?'Read answer aloud':'Read question aloud'}</button><button type="button" class="button subtle" id="voice-stop" ${speaking?'':'disabled'}>Stop audio</button><button type="button" class="button subtle" id="voice-dictate" aria-pressed="${listening}" ${Recognition?'':'disabled'}>${listening?'Stop dictation':'Dictate answer'}</button></div><label class="voice-answer-label" for="voice-transcript">Your answer</label><textarea id="voice-transcript" rows="2" placeholder="Speak your answer, or type it here…">${esc(transcript)}</textarea><label class="voice-auto"><input id="voice-auto" type="checkbox" ${autoRead?'checked':''} ${canRead?'':'disabled'}> Read answers aloud when I reveal them</label><p id="voice-status" role="status">${esc(notice)}</p>${!Recognition?'<p class="voice-note">Dictation isn’t supported in this browser. Try Android Chrome, or type your answer.</p>':''}${!canRead?'<p class="voice-note">Read aloud isn’t supported in this browser.</p>':''}<p class="voice-note">Compare your answer after revealing, then choose your rating. Your browser may process microphone audio online. This app doesn’t save audio or dictated answers.</p></details>`;
 }
 function bind(active){
  if(!active){stop();transcript='';notice='';key='';return}
  const panel=document.getElementById('voice-practice');if(!panel)return;
  panel.addEventListener('toggle',()=>{open=panel.open;if(!open)stop()});panel.querySelector('#voice-read').onclick=speak;panel.querySelector('#voice-stop').onclick=stopAudio;panel.querySelector('#voice-dictate').onclick=dictate;
  panel.querySelector('#voice-transcript').oninput=e=>transcript=e.target.value;
  panel.querySelector('#voice-auto').onchange=e=>autoRead=e.target.checked;
  if(autoPending){autoPending=false;speak()}
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});window.addEventListener('pagehide',stop);
 return {html,bind};
}
