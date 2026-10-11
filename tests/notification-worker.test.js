import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
test('push worker shows a notification without caching data and opens only the CHUDS scope',async()=>{
 const handlers={},shown=[],opened=[],messages=[];let focused=false;
 const self={registration:{scope:'https://aleks1212121.github.io/revise-1/',showNotification:async(...args)=>shown.push(args)},addEventListener:(name,fn)=>handlers[name]=fn};
 let windows=[];const clients={matchAll:async()=>windows,openWindow:async url=>opened.push(url)};
 vm.runInNewContext(readFileSync(new URL('../public/notification-sw.js',import.meta.url),'utf8'),{self,clients,URL});
 let pending;handlers.push({data:{json:()=>({title:'New slides',body:'Check your inbox',tag:'submission'})},waitUntil:p=>pending=p});await pending;assert.equal(shown[0][0],'New slides');assert.equal(shown[0][1].icon,'https://aleks1212121.github.io/revise-1/chuds-logo.png');assert.equal('fetch' in handlers,false);
 let closed=false;const event={notification:{close:()=>closed=true,data:{url:'https://evil.test'}},waitUntil:p=>pending=p};handlers.notificationclick(event);await pending;assert.equal(closed,true);assert.equal(opened[0],'https://aleks1212121.github.io/revise-1/?inbox=1');
 windows=[{url:'https://aleks1212121.github.io/revise-1/',focus:async()=>focused=true,postMessage:msg=>messages.push(msg)}];handlers.notificationclick(event);await pending;assert.equal(focused,true);assert.equal(messages[0].type,'chuds-open-inbox');assert.equal(opened.length,1);
 windows=[];handlers.push({data:{json:()=>({title:'Ready',destination:'lectures'})},waitUntil:p=>pending=p});await pending;event.notification.data=shown[1][1].data;handlers.notificationclick(event);await pending;assert.equal(opened[1],'https://aleks1212121.github.io/revise-1/?decks=1');
});
