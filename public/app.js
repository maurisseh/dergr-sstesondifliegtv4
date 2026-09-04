const HEART_SVG = `<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.3C.4 8 2 4.5 5.6 4c2-.3 3.8.7 6.4 3.4C14.6 4.7 16.4 3.7 18.4 4 22 4.5 23.6 8 22 11.7 19.5 16.4 12 21 12 21z"/></svg>`;
const STORAGE_KEY = 'camOverlayState';
const HEARTS_PER_PLAYER = 3;

const QUESTIONS_PER_ROUND = 2;

function uid(){
  return 'p_' + Math.random().toString(36).slice(2, 9);
}

function defaultState(n){
  const players = [];
  for(let i=0;i<n;i++){
    players.push({ id: uid(), name:'', hearts: HEARTS_PER_PLAYER, active: i===0, vdo:'' });
  }
  return { count:n, players, round:1, turnsThisRound:0 };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      // Migration: älterer State ohne neue Felder
      parsed.players.forEach(p=>{
        if(p.vdo === undefined) p.vdo = '';
        if(p.id === undefined) p.id = uid();
      });
      if(parsed.round === undefined) parsed.round = 1;
      if(parsed.turnsThisRound === undefined) parsed.turnsThisRound = 0;
      return parsed;
    }
  }catch(e){}
  return defaultState(6);
}

function saveState(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if(typeof pushSync === 'function') pushSync(state);
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

function saveState(state){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* Zeilenaufteilung, damit die Cams das komplette 16:9-Bild ausfüllen */
function rowsFor(n){
  const layouts = { 1:[1], 2:[2], 3:[3], 4:[4], 5:[3,2], 6:[3,3], 7:[4,3], 8:[4,4], 9:[3,3,3] };
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
  return `https://vdo.ninja/?push=${encodeURIComponent(id)}&webcam`;
}
