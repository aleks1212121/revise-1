import {isDue} from './scheduler.js';
export function lectureProgress(cards=[],now=Date.now()){
 const total=cards.length;
 const studied=cards.filter(c=>(Number(c.reviews)||0)>0||(Number(c.lastReviewedAt)||0)>0).length;
 return {total,studied,confident:cards.filter(c=>c.status==='known').length,due:cards.filter(c=>isDue(c,now)).length,percent:total?Math.round(studied/total*100):0};
}
