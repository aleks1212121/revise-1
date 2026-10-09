export const WORKSPACE_ID='__workspace-settings';
export const emptyWorkspace=()=>({modules:{},lectures:{}});
export const lectureTrashed=(state,id)=>state?.lectures?.[id]?.deleted===true;
export function mergeWorkspace(a=emptyWorkspace(),b=emptyWorkspace()){
 const result=emptyWorkspace();
 for(const kind of ['modules','lectures'])for(const id of new Set([...Object.keys(a[kind]||{}),...Object.keys(b[kind]||{})])){
  const x=a[kind]?.[id],y=b[kind]?.[id];
  result[kind][id]=!x?y:!y?x:(x._at||0)!==(y._at||0)?((x._at||0)>(y._at||0)?x:y):JSON.stringify(x)>=JSON.stringify(y)?x:y;
 }
 return result;
}
export function setWorkspaceEntry(state,kind,id,values,now=Date.now()){
 if(!['modules','lectures'].includes(kind))throw Error('Invalid collection setting');
 const previous=state[kind]?.[id];return {...state,[kind]:{...state[kind],[id]:{...previous,...values,_at:Math.max(now,(previous?._at||0)+1)}}};
}
