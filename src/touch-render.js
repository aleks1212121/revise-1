// Keep a study tap on the card/control that was visible when the finger went down.
// Background sync must not replace its DOM or change the active card mid-gesture.
export function touchRenderGate({document,enabled,flush}){
 let active=false,pending=false,timer=null;const waiters=[];
 function release(){active=false;clearTimeout(timer);setTimeout(()=>{if(active)return;for(const resolve of waiters.splice(0))resolve();if(pending){pending=false;flush()}},0)}
 document.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||!event.isPrimary||!enabled()||!event.target.closest('.study-layout'))return;
  clearTimeout(timer);active=true;
 },true);
 // The compatibility click follows pointerup. Keep the target until that click
 // finishes; scrolling/cancelled gestures use the fallback instead.
 document.addEventListener('pointerup',()=>{if(active)timer=setTimeout(release,350)},true);
 document.addEventListener('pointercancel',()=>{if(active)release()},true);
 document.addEventListener('click',()=>{if(active)release()},true);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)release()});
 return {defer(){if(active){pending=true;return true}pending=false;return false},idle(){return active?new Promise(resolve=>waiters.push(resolve)):Promise.resolve()}};
}
