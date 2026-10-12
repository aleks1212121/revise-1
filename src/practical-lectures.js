export const PRACTICAL_LECTURES = new Set(['breast-cancer-revision','breast-cancer-practical']);
export function lectureGroups(lectures) {
 return {lectures:lectures.filter(l=>!PRACTICAL_LECTURES.has(l.lectureId)),practical:lectures.filter(l=>PRACTICAL_LECTURES.has(l.lectureId))};
}
