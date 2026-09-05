/* Verbindet sich automatisch mit dem Sync-Server, der dieselbe Seite ausliefert
   (alles läuft in einem einzigen Render-Service) — keine manuelle Adresse nötig. */

let __syncWs = null;
let __syncReady = false;

function getSyncUrl(){
  // Manuelle Override-Möglichkeit (z.B. für lokale Tests gegen einen anderen Server)
  if(window.CAM_OVERLAY_WS_URL) return window.CAM_OVERLAY_WS_URL;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}`;
}

function connectSync(){
  const url = getSyncUrl();
  if(!url) return;

  try{
    __syncWs = new WebSocket(url);
  }catch(e){
    console.warn('Sync-Server nicht erreichbar:', e);
    return;
  }

  __syncWs.addEventListener('open', ()=>{
    __syncReady = true;
    console.log('Sync-Server verbunden');
    if(typeof window.onSyncStatusChange === 'function') window.onSyncStatusChange(true);
  });

  __syncWs.addEventListener('close', ()=>{
    __syncReady = false;
    if(typeof window.onSyncStatusChange === 'function') window.onSyncStatusChange(false);
    setTimeout(connectSync, 2000); // automatischer Reconnect
  });

  __syncWs.addEventListener('error', ()=>{
    try{ __syncWs.close(); }catch(e){}
  });

  __syncWs.addEventListener('message', (event)=>{
    try{
      const msg = JSON.parse(event.data);
      if(msg.type === 'state' && msg.payload){
        localStorage.setItem(STORAGE_KEY, JSON.stringify(msg.payload));
        if(typeof window.onSyncStateUpdate === 'function') window.onSyncStateUpdate();
      }
    }catch(e){}
  });
}

function pushSync(state){
  if(__syncReady && __syncWs && __syncWs.readyState === WebSocket.OPEN){
    __syncWs.send(JSON.stringify({ type:'state', payload: state }));
  }
}

connectSync();
