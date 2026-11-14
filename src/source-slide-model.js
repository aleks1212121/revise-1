export function safeSourcePath(path){return typeof path==='string'&&/^(?:source-slides\/[a-z0-9-]+\/slide-\d+\.webp|[a-z0-9-]+\/[a-z0-9-]+\.(?:jpg|png|webp))$/.test(path)?path:''}
export function sourcePages(deck,index={},base='/revise-1/'){
 const entry=index[deck?.lectureId];
 if(entry?.pages?.length)return entry.pages.filter(p=>Number.isInteger(p.number)&&p.number>0&&safeSourcePath(p.src)).map(p=>({...p,url:base+p.src}));
 return (deck?.slides||[]).map(s=>{const id=s.sourceImage||s.images?.find(k=>/^pdf-\d+$/.test(k));const url=id?deck.media?.[id]:'';return {number:s.number,label:s.sourceLabel||`Page ${s.number}`,text:s.text,url:typeof url==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url)?url:''}});
}
export function sourceSelection(deck,card,index){const override=index[deck?.lectureId]?.cardOverrides?.[card?.id];return override&&index[override.lectureId]?{lectureId:override.lectureId,number:override.number}:{lectureId:deck?.lectureId,number:card?.slide}}
