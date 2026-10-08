import './image-viewer.css';
export function installImageViewer(){
 function open(image){
  const dialog=document.createElement('dialog');dialog.className='image-viewer';dialog.setAttribute('aria-label','Enlarged lecture image');
  dialog.innerHTML='<div class="image-viewer-toolbar"><span>Lecture image</span><button type="button" data-zoom="out" aria-label="Zoom out">−</button><output>100%</output><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-close autofocus>Close</button></div><div class="image-viewer-scroll"><img alt=""></div>';
  const enlarged=dialog.querySelector('img');enlarged.src=image.src;enlarged.alt=image.alt;let scale=1;
  const zoom=change=>{scale=Math.max(1,Math.min(4,scale+change));enlarged.style.width=`${scale*100}%`;dialog.querySelector('output').textContent=`${Math.round(scale*100)}%`;dialog.querySelector('[data-zoom="out"]').disabled=scale===1;dialog.querySelector('[data-zoom="in"]').disabled=scale===4};
  dialog.querySelector('[data-zoom="out"]').onclick=()=>zoom(-.5);dialog.querySelector('[data-zoom="in"]').onclick=()=>zoom(.5);dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  const previous=document.activeElement;dialog.addEventListener('close',()=>{dialog.remove();if(previous?.isConnected)previous.focus()},{once:true});document.body.append(dialog);zoom(0);dialog.showModal();
 }
 const target=e=>e.target.closest('.study-mode .study-layout img');
 document.addEventListener('click',e=>{const image=target(e);if(!image||e.ctrlKey||e.metaKey)return;e.preventDefault();e.stopImmediatePropagation();open(image)},true);
 document.addEventListener('keydown',e=>{const image=target(e);if(image&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();open(image)}},true);
}
