const corrections={
  "cardiovascular-practical-ccecf470572562fc0112": {
    "previousText": "A resting systolic BP above {{c1::130 mmHg}} excludes the student from the cold-water test in this protocol.",
    "text": "The 2026–27 handout asks volunteers with resting SBP above {{c1::130 mmHg}} to speak to the academic before the occlusion experiment.",
    "question": "The 2026–27 handout asks volunteers with resting SBP above {{c1::130 mmHg}} to speak to the academic before the occlusion experiment.",
    "answer": "130 mmHg",
    "explanation": "This is a practical eligibility instruction, not a clinical diagnosis threshold. This current handout instruction replaces the older cold-test exclusion wording. The original theory-slide image is an older source; consult the Current Handout & Results Analysis deck.",
    "sourceLabel": "2026–27 practical handout"
  },
  "cardiovascular-practical-33909ac6f73d7e9b3f84": {
    "previousText": "The hot-water protocol states that temperature must not exceed {{c1::46°C}}.",
    "text": "The 2026–27 handout states that hot water must not exceed {{c1::47°C}}.",
    "question": "The 2026–27 handout states that hot water must not exceed {{c1::47°C}}.",
    "answer": "47°C",
    "explanation": "The stated target is 45–46°C, with an upper limit of 47°C in the current handout. The older supplied theory slides used different wording. This is a supervised teaching protocol, not a home experiment.",
    "sourceLabel": "2026–27 practical handout"
  },
  "cardiovascular-practical-5d1caac2af6edb7821e4": {
    "previousText": "The protocol sets a maximum occlusion-cuff pressure of {{c1::160 mmHg}}.",
    "text": "The 2026–27 handout sets a maximum occlusion-cuff pressure of {{c1::150 mmHg}}.",
    "question": "The 2026–27 handout sets a maximum occlusion-cuff pressure of {{c1::150 mmHg}}.",
    "answer": "150 mmHg",
    "explanation": "The current handout supersedes the 160 mmHg limit in the older theory slides. Follow the current supervised protocol and demonstrator instructions.",
    "sourceLabel": "2026–27 practical handout"
  },
  "cardiovascular-practical-f6836195257b6894beb9": {
    "previousText": "The maximum stated cuff-occlusion period is {{c1::one minute}}.",
    "text": "The 2026–27 handout limits the cuff-occlusion period to {{c1::30 seconds}}.",
    "question": "The 2026–27 handout limits the cuff-occlusion period to {{c1::30 seconds}}.",
    "answer": "30 seconds",
    "explanation": "The current handout supersedes the one-minute period in the older supplied theory slides. Stop immediately for pain, discomfort, numbness or tingling.",
    "sourceLabel": "2026–27 practical handout"
  }
};
// Apply only known source corrections; keep review fields, IDs and personal edits.
export function correctBundledProtocol(deck){
 if(deck?.lectureId!=='cardiovascular-practical'||deck.protocolRevision>=1)return deck;
 return {...deck,protocolRevision:1,cards:deck.cards.map(card=>{const patch=corrections[card.id];if(!patch||card.text!==patch.previousText)return card;const {previousText,...content}=patch;return {...card,...content}})};
}
