// Companion questions for microbiology lectures keep the emphasis on
// clinical interpretation, underlying concepts and the limits of a finding.
export function clinicalCue(deck,card){
 const topic=card.topic||'';
 if(deck.lectureId==='virulence-factors'){
  if(/botulinum|tetanus/i.test(topic))return ['Localise the effect to nerve signalling before naming the muscle finding.','Why can two diseases that affect neurotransmission produce very different muscle findings?','The clinical effect depends on whether excitatory or inhibitory signalling is impaired.'];
  if(/cholera|enterotoxin|G-protein/i.test(topic))return ['Trace altered intestinal signalling to the loss of water and salts.','What makes profuse watery diarrhoea immediately dangerous?','Rapid losses of fluid and electrolytes can cause severe dehydration and circulatory compromise.'];
  if(/toxin|diphtheria/i.test(topic))return ['Separate the bacterial infection from the effect of a toxin on host cells.','Why can immunity against a toxin reduce illness?','Neutralising antibodies can prevent toxin-mediated injury to host tissues.'];
  return ['Exposure, colonisation and symptomatic disease are distinct observations.','Does finding a microorganism in a patient establish the cause of the illness?','No. The finding must fit the clinical picture and the other available evidence.'];
 }
 if(deck.lectureId==='microbiology-practical'){
  if(/Gram|microscopy/i.test(topic))return ['Report the staining pattern and cell shape as observations.','Does a Gram reaction alone establish species identity?','No. It narrows the possibilities and needs other identifying evidence.'];
  if(/safety|aseptic|handwashing/i.test(topic))return ['Think about which exposure the precaution interrupts.','Why do consistent precautions matter even before an organism is identified?','Its identity and risk may be unknown when the sample is first handled.'];
  if(/urease|catalase|oxidase|API|identification/i.test(topic))return ['An observed reaction contributes one piece of an identification profile.','Why interpret several biochemical findings together?','Different organisms can share an individual test result.'];
  return ['Separate what was observed in the specimen from what can be concluded about its identity.','Can appearance alone confirm the cause of a patient’s infection?','No. Identification and clinical significance both require supporting evidence.'];
 }
 return null;
}
