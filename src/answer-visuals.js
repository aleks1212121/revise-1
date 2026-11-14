import visuals from './answer-visuals.json' with {type:'json'};

export function visualFingerprint(card){
 let hash=2166136261;for(const char of `${card.text||card.question||''}\n${card.slide}`)hash=Math.imul(hash^char.codePointAt(0),16777619)>>>0;return hash.toString(16);
}

// Presentation only: never replace the stored card or its review history.
export function answerVisualCard(card){
 if(!card||card.showImagesFront||!Object.hasOwn(visuals.cards,card.id)||visuals.fingerprints[card.id]!==visualFingerprint(card))return card;
 return {...card,images:[],answerImages:[],illustrations:visuals.cards[card.id]};
}
export function answerVisualMedia(id){return visuals.media[id]}
