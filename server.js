const express = require('express');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const PORT = process.env.PORT || 8080;

// Website (index.html, overlay.html, style.css, app.js, sync.js) ausliefern.
// Kein Caching, damit nach jedem Deploy garantiert die neueste Version ankommt.
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
}));

const server = app.listen(PORT, () => {
  console.log(`Cam-Overlay läuft auf Port ${PORT}`);
});

// WebSocket-Sync läuft auf demselben Server/Port -> ein Deploy, eine URL
const wss = new WebSocketServer({ server });
let latestState = null;
let clientCounter = 0;

wss.on('connection', (ws) => {
  clientCounter++;
  const id = clientCounter;
  console.log(`[sync] Client #${id} verbunden (aktuell ${wss.clients.size} verbunden)`);

  if (latestState) {
    ws.send(JSON.stringify({ type: 'state', payload: latestState }));
    console.log(`[sync] initialer Stand an Client #${id} gesendet`);
  }

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      console.warn(`[sync] Client #${id}: ungültige Nachricht konnte nicht geparst werden`, e.message);
      return;
    }
    if (msg.type === 'state' && msg.payload) {
      latestState = msg.payload;
      let sentTo = 0;
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'state', payload: latestState }));
          sentTo++;
        }
      });
      console.log(`[sync] Update von Client #${id} an ${sentTo} andere Clients verteilt (insgesamt ${wss.clients.size} verbunden)`);
    }
  });

  ws.on('close', () => {
    console.log(`[sync] Client #${id} getrennt (noch ${wss.clients.size - 1} verbunden)`);
  });

  ws.on('error', (err) => {
    console.warn(`[sync] Client #${id} Fehler:`, err.message);
  });
});
