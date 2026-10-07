const diagrams={
 'bacterial-cell':{title:'Bacterial cell and its structures',slides:[4,5,12,13,15,16,17,35,36,37]},
 'cell-envelopes':{title:'Gram-positive and Gram-negative envelopes',slides:[6,25,26]},
 'peptidoglycan':{title:'Peptidoglycan sugar chains and peptide cross-links',slides:[4,25,26]},
 'membrane':{title:'Phospholipid bilayer',slides:[23,24,28]},
 'genetics':{title:'Chromosome, nucleoid and plasmids',slides:[18,29,30,31]},
 'ribosome':{title:'Bacterial ribosome and translation',slides:[8,33]},
 'biofilm':{title:'Cells within an extracellular matrix',slides:[14,44,46,48]},
 'growth':{title:'Four phases of bacterial growth',slides:[10]},
 'motility':{title:'Different mechanisms of motility',slides:[19,21,22,49]},
 'mycolic-acids':{title:'Mycolic-acid-rich envelope',slides:[27]},
};
export function addStudyVisuals(deck){
 if(!deck?.curated)return deck;
 const media={...deck.media},mediaCredits={...deck.mediaCredits};
 for(const [id,item] of Object.entries(diagrams)){
  media[`diagram-${id}`]=`illustrations/${id}.png`;
  mediaCredits[`diagram-${id}`]={title:item.title,credit:'Original Micro study schematic · not to scale'};
 }
 return {...deck,media,mediaCredits,cards:deck.cards.map(c=>({...c,illustrations:Object.entries(diagrams).filter(([id,item])=>item.slides.includes(c.slide)&&(id!=='peptidoglycan'||c.slide!==4||/peptidoglycan/i.test(c.question))).map(([id])=>`diagram-${id}`)}))};
}
