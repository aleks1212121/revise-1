// This worker handles notifications only; it never caches study/account data.
self.addEventListener('push',event=>{
 let message={};try{message=event.data?.json()||{}}catch{}
 event.waitUntil(self.registration.showNotification(message.title||'New lecture slides',{body:message.body||'Open CHUDS to check the slide inbox.',icon:new URL('chuds-logo.png',self.registration.scope).href,badge:new URL('chuds-logo.png',self.registration.scope).href,tag:message.tag||'chuds-slides',data:{url:new URL('?inbox=1',self.registration.scope).href}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const url=new URL('?inbox=1',self.registration.scope).href;
 event.waitUntil((async()=>{const windows=await clients.matchAll({type:'window',includeUncontrolled:true});const current=windows.find(c=>c.url.startsWith(self.registration.scope));if(current){await current.focus();current.postMessage({type:'chuds-open-inbox'});}else await clients.openWindow(url)})());
});
