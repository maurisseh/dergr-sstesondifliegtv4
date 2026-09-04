const express = require('express');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const PORT = process.env.PORT || 8080;

// Website (index.html, moderator.html, style.css, app.js, sync.js) ausliefern
app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(PORT, () => {
  console.log(`Cam-Overlay läuft auf Port ${PORT}`);
});

// WebSocket-Sync läuft auf demselben Server/Port -> ein Deploy, eine URL
const wss = new WebSocketServer({ server });
let latestState = null;

wss.on('connection', (ws) => {
  if (latestState) {
    ws.send(JSON.stringify({ type: 'state', payload: latestState }));
  }

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (msg.type === 'state' && msg.payload) {
      latestState = msg.payload;
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'state', payload: latestState }));
        }
      });
    }
  });
});
