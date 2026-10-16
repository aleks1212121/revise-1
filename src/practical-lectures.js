export const PRACTICAL_LECTURES = new Set(['breast-cancer-revision','breast-cancer-practical','microbiology-practical']);
export function lectureGroups(lectures) {
 return {lectures:lectures.filter(l=>!PRACTICAL_LECTURES.has(l.lectureId)),practical:lectures.filter(l=>PRACTICAL_LECTURES.has(l.lectureId))};
}

export function practicalHeading(lectures){
 if(lectures.length&&lectures.every(l=>l.lectureId==='microbiology-practical'))return 'Microbiology — identifying unknown bacteria';
 if(lectures.length&&lectures.every(l=>l.lectureId.startsWith('breast-cancer-')))return 'Breast cancer histopathology';
 return 'Practical revision decks';
}
