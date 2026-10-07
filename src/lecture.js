import JSZip from 'jszip';
import {draftCloze,clozeCards,deletions} from './cloze.js';
const xml = value => new DOMParser().parseFromString(value,'application/xml');
const elements=(node,name)=>[...node.getElementsByTagNameNS('*',name)];
function resolvePath(base,target){if(target.startsWith('/'))return target.slice(1);const parts=base.split('/');parts.pop();for(const p of target.split('/')){if(p==='..')parts.pop();else if(p!=='.')parts.push(p)}return parts.join('/')}
export async function readLecture(file){
 const zip=await JSZip.loadAsync(file);
 let names=Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));
 const presentation=zip.file('ppt/presentation.xml'),presentationRels=zip.file('ppt/_rels/presentation.xml.rels');
 if(presentation&&presentationRels){const rels=elements(xml(await presentationRels.async('string')),'Relationship');names=elements(xml(await presentation.async('string')),'sldId').map(node=>{const id=node.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||node.getAttribute('r:id');const rel=rels.find(r=>r.getAttribute('Id')===id);const path=rel?resolvePath('ppt/presentation.xml',rel.getAttribute('Target')):'';if(!zip.file(path))throw Error('A referenced PowerPoint slide is missing. Export this lecture as PDF and try again.');return path})}
 if(names.length>300)throw Error('Please split lectures longer than 300 slides into smaller files.');
 const cards=[],slides=[],media={};
 for(const [position,name] of names.entries()){
  const slide=position+1;
  const doc=xml(await zip.file(name).async('string'));
  const paragraphs=elements(doc,'p').map(p=>({text:elements(p,'t').map(t=>t.textContent).join('').trim(),emphasis:elements(p,'r').filter(r=>elements(r,'rPr').some(pr=>pr.getAttribute('b')==='1')).map(r=>elements(r,'t').map(t=>t.textContent).join(''))})).filter(p=>p.text.length>2&&!/^\d+$/.test(p.text));
  const topic=paragraphs[0]?.text||`Slide ${slide}`;
  const images=[];
  const relationships=zip.file(`ppt/slides/_rels/${name.split('/').pop()}.rels`);
  if(relationships){const rels=elements(xml(await relationships.async('string')),'Relationship');
   for(const blip of elements(doc,'blip')){
    const id=blip.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed')||blip.getAttribute('r:embed');
    const rel=rels.find(r=>r.getAttribute('Id')===id);
    if(!rel||rel.getAttribute('TargetMode')==='External')continue;
    const path=resolvePath(name,rel.getAttribute('Target'));
    const ext=path.split('.').pop().toLowerCase(),type={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'}[ext];
    if(!type||!zip.file(path))continue;
    if(!media[path])media[path]=`data:${type};base64,${await zip.file(path).async('base64')}`;
    if(!images.includes(path))images.push(path);
   }
  }
  slides.push({number:slide,topic,text:paragraphs.map(p=>p.text).join('\n'),images});
  for(const p of paragraphs.slice(1)){
   // One fact per card; keep sentence boundaries and wording from the lecture.
   const sentences=p.text.split(/(?<=[.!?])\s+(?=[A-Z])/);
   for(const sentence of sentences){const text=draftCloze(sentence,p.emphasis);if(text)cards.push(...clozeCards({text,topic,slide,images,source:sentence,showImagesFront:false,draft:true}))}
  }
 }
 if(!slides.length)throw Error('No slides were found in this PowerPoint.');
 return {version:2,title:file.name.replace(/\.pptx$/i,''),cards,slides,media};
}
export function normalizeDeck(value){
 if(!value||!Array.isArray(value.cards))throw Error('This file is not a flashcard deck.');
 const cards=value.cards.map(c=>{
  if(typeof c.question!=='string'||typeof c.answer!=='string')throw Error('A card has missing question or answer text.');
  const text=String(c.text||c.question),number=Number(c.clozeNumber)||1;
  if(c.type==='cloze'&&!deletions(text).some(d=>d.number===number))throw Error('A cloze card needs a valid deletion for its selected number.');
  return {...c,id:crypto.randomUUID(),text,clozeNumber:number,topic:String(c.topic||'Lecture'),slide:Number(c.slide)||0,status:['new','review','known'].includes(c.status)?c.status:'new',images:Array.isArray(c.images)?c.images.filter(x=>typeof x==='string'):[]};
 });
 return {...value,cards,slides:Array.isArray(value.slides)?value.slides.map(s=>({number:Number(s.number)||0,topic:String(s.topic||'Slide'),text:String(s.text||''),images:Array.isArray(s.images)?s.images.filter(x=>typeof x==='string'):[]})):[],media:value.media&&typeof value.media==='object'?value.media:{}};
}

export async function readPDF(file,onProgress=()=>{}){
 const {getDocument,GlobalWorkerOptions}=await import('pdfjs-dist');
 const {default:workerURL}=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
 GlobalWorkerOptions.workerSrc=workerURL;
 const loading=getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});
 const pdf=await loading.promise;
 try{
  if(pdf.numPages>300)throw Error('Please split lectures longer than 300 pages into smaller files.');
  const slides=[],media={},cards=[];
  for(let number=1;number<=pdf.numPages;number++){
   onProgress(`Reading page ${number} of ${pdf.numPages}…`);
   const page=await pdf.getPage(number),items=await page.getTextContent();
   let text='';for(const item of items.items){if('str' in item)text+=item.str+(item.hasEOL?'\n':' ')}
   text=text.trim();const topic=text.split('\n')[0].slice(0,100)||`Slide ${number}`;
   const natural=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(1.5,1200/natural.width)});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvas,viewport}).promise;
   const id=`pdf-${number}`;media[id]=canvas.toDataURL('image/jpeg',0.82);slides.push({number,topic,text,images:[id]});
   for(const sentence of text.split(/(?:\n|(?<=[.!?])\s+(?=[A-Z]))/)){const cloze=draftCloze(sentence);if(cloze)cards.push(...clozeCards({text:cloze,topic,slide:number,images:[id],draft:true,showImagesFront:false}))}
   canvas.width=canvas.height=0;page.cleanup();
  }
  return {version:2,title:file.name.replace(/\.pdf$/i,''),slides,media,cards};
 }finally{await loading.destroy()}
}
