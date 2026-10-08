export function advanceSession(queue,index,rating,removeAnswered=false){
 const next=[...queue],id=next[index],gap=rating==='again'?3:rating==='hard'?5:0;
 if(id===undefined)return {queue:next,index,retry:false,intervening:0};
 // Keep one pending appearance per card, even if navigation revisits it.
 for(let i=next.length-1;i>index;i--)if(next[i]===id)next.splice(i,1);
 if(gap){next.splice(index,1);const position=Math.min(index+gap,next.length);next.splice(position,0,id);return {queue:next,index,retry:true,intervening:position-index}}
 if(removeAnswered)next.splice(index,1);else index++;
 return {queue:next,index,retry:false,intervening:0};
}
