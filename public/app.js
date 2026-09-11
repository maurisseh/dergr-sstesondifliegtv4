const HEART_SVG = `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.6 4c2-.3 3.8.7 6.4 3.4C14.6 4.7 16.4 3.7 18.4 4 22 4.5 23.6 8 22 11.7 19.5 16.4 12 21 12 21z"/></svg>`;
const HEARTS_PER_PLAYER = 3;
const QUESTIONS_PER_ROUND = 2;

/* Der Zustand lebt nur noch im Speicher (kein localStorage mehr) und kommt
   ausschließlich vom Sync-Server -> alle Geräte/Browser sehen garantiert denselben Stand. */
let currentState = null;

function uid(){
  return 'p_' + Math.random().toString(36).slice(2, 9);
}

function defaultState(n){
  const players = [];
  for(let i=0;i<n;i++){
    players.push({ id: uid(), name:'', hearts: HEARTS_PER_PLAYER, active: i===0, vdo:'' });
  }
  return { count:n, players, round:1, turnsThisRound:0, bgColor:'#1a1533', logoDataUrl:'' };
}

/* Liefert den aktuellen Zustand. Solange noch nichts vom Server kam, ein Platzhalter-Setup,
   das automatisch überschrieben wird, sobald der Server antwortet. */
function loadState(){
  if(!currentState) currentState = defaultState(6);
  return currentState;
}

/* Lokale Änderung übernehmen UND an den Server schicken, der sie an alle anderen verteilt */
function saveState(state){
  currentState = state;
  if(typeof pushSync === 'function') pushSync(state);
}

/* Wird von sync.js aufgerufen, wenn eine Nachricht vom Server ankommt */
function applyServerState(payload){
  payload.players.forEach(p=>{
    if(p.vdo === undefined) p.vdo = '';
    if(p.id === undefined) p.id = uid();
  });
  if(payload.round === undefined) payload.round = 1;
  if(payload.turnsThisRound === undefined) payload.turnsThisRound = 0;
  if(payload.bgColor === undefined) payload.bgColor = '#1a1533';
  if(payload.logoDataUrl === undefined) payload.logoDataUrl = '';
  currentState = payload;
}

/* Ein Spieler mit 0 Herzen ist "raus" (graustufig im Overlay), aber noch nicht gekickt */
function isEliminated(p){
  return p.hearts <= 0;
}

function activePlayerIndex(players){
  return players.findIndex(p=>p.active);
}

function activeCount(players){
  return players.filter(p=>!isEliminated(p)).length;
}

function roundComplete(state){
  const n = activeCount(state.players);
  return n > 0 && state.turnsThisRound >= n * QUESTIONS_PER_ROUND;
}

/* Zug an den nächsten (nicht ausgeschiedenen) Spieler weitergeben, Fragenzähler hochzählen */
function advanceTurn(state){
  const players = state.players;
  const n = activeCount(players);
  if(n < 1) return state;
  let idx = activePlayerIndex(players);
  if(idx === -1) idx = 0;
  let next = idx;
  for(let step=0; step<players.length; step++){
    next = (next + 1) % players.length;
    if(!isEliminated(players[next])) break;
  }
  players.forEach(p=>p.active=false);
  players[next].active = true;
  state.turnsThisRound = (state.turnsThisRound || 0) + 1;
  return state;
}

/* Neue Runde: Zähler zurücksetzen, Rundennummer hoch */
function startNewRound(state){
  state.round = (state.round || 1) + 1;
  state.turnsThisRound = 0;
  return state;
}

/* ---------- 20-Sekunden-Fragetimer ---------- */
function startTimer(state, durationSec=20){
  state.timer = { running:true, startedAt: Date.now(), duration: durationSec*1000 };
  return state;
}

function stopTimer(state){
  state.timer = { running:false, startedAt:0, duration:0 };
  return state;
}

/* Restzeit in Sekunden (aufgerundet), 0 wenn kein Timer läuft oder abgelaufen */
function timerRemainingSec(state){
  if(!state.timer || !state.timer.running) return 0;
  const elapsed = Date.now() - state.timer.startedAt;
  const remainingMs = state.timer.duration - elapsed;
  return Math.max(0, Math.ceil(remainingMs / 1000));
}

/* Spieler endgültig entfernen (nachdem er auf 0 Herzen ist) */
function kickPlayer(state, idx){
  if(state.players.length <= 2) return state;
  const wasActive = state.players[idx].active;
  state.players.splice(idx, 1);
  state.count = state.players.length;
  if(wasActive || !state.players.some(p=>!isEliminated(p) && p.active)){
    const firstAlive = state.players.findIndex(p=>!isEliminated(p));
    state.players.forEach(p=>p.active=false);
    state.players[firstAlive !== -1 ? firstAlive : 0].active = true;
  }
  state.turnsThisRound = 0;
  return state;
}

/* Zeilenaufteilung, damit die Cams das komplette 16:9-Bild ausfüllen und zentriert wirken */
function rowsFor(n){
  const layouts = {
    1:[1],
    2:[2],
    3:[2,1],
    4:[2,2],
    5:[3,2],
    6:[3,3],
    7:[2,3,2],
    8:[3,3,2],
    9:[3,3,3]
  };
  return layouts[n] || [n];
}

/* Baut aus Stream-ID oder komplettem Link eine saubere vdo.ninja Viewer-URL */
function buildVdoViewSrc(input){
  if(!input) return '';
  let url = input.trim();
  if(!url) return '';
  if(!url.startsWith('http')){
    url = `https://vdo.ninja/?view=${encodeURIComponent(url)}`;
  }
  if(!/[?&]cleanoutput/.test(url)){
    url += (url.includes('?') ? '&' : '?') + 'cleanoutput';
  }
  // Ordentliche Ziel-Bitrate für scharfes Bild ohne unnötig hohe Bandbreite
  if(!/[?&](videobitrate|vb)=/.test(url)){
    url += '&videobitrate=4000';
  }
  // H.264 nutzt auf den meisten Geräten Hardware-Encoding -> stabiler, weniger CPU-Last
  if(!/[?&]codec=/.test(url)){
    url += '&codec=h264';
  }
  return url;
}

/* Baut den Push-Link, den man an den jeweiligen Cam-Teilnehmer schickt */
function buildVdoPushLink(input){
  if(!input) return '';
  let id = input.trim();
  if(!id) return '';
  if(id.startsWith('http')){
    try{
      const u = new URL(id);
      id = u.searchParams.get('view') || u.searchParams.get('push') || id;
    }catch(e){}
  }
  // &quality=0 zielt auf 1080p, &width/&height erzwingt es strikter (fällt zurück falls Kamera nicht mitmacht),
  // &lowlatency reduziert Puffer/Jitter-Verzögerung
  return `https://vdo.ninja/?push=${encodeURIComponent(id)}&webcam&quality=0&width=1920&height=1080&lowlatency`;
}
