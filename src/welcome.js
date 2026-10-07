import './welcome.css';
const KEY='chuds-welcome-seen-v1';
export function showWelcome(){
 try{if(sessionStorage.getItem(KEY))return}catch{}
 const logo=`${import.meta.env.BASE_URL}chuds-logo.png`;
 const dialog=document.createElement('dialog');dialog.className='dog-welcome';dialog.setAttribute('aria-labelledby','welcome-title');dialog.setAttribute('aria-describedby','welcome-description');
 dialog.innerHTML=`<div class="welcome-dogs" aria-hidden="true">${['one','two','three','four'].map(n=>`<img class="welcome-dog ${n}" src="${logo}" alt="">`).join('')}<span class="welcome-paw paw-one">🐾</span><span class="welcome-paw paw-two">🐾</span></div><section class="welcome-card"><span class="welcome-badge">CHUDS.org · certified silly</span><img class="welcome-mascot" src="${logo}" alt="Our dog mascot"><h1 id="welcome-title">Welcome friends to my<br><span>goofy ahh revision app</span></h1><p id="welcome-description">Come for the dog. Stay because your exam is approaching.</p><p class="welcome-caption">Head empty. Flashcards loading. 🐶</p><button class="button primary" id="welcome-start" type="button" autofocus>Let’s revise →</button><small>Your decks and progress are waiting inside.</small></section>`;
 document.body.append(dialog);
 const finish=()=>{try{sessionStorage.setItem(KEY,'1')}catch{}dialog.remove()};
 dialog.addEventListener('close',finish,{once:true});dialog.querySelector('#welcome-start').onclick=()=>dialog.close();dialog.showModal();
}
