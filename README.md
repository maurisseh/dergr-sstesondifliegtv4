# Cam Overlay – alles auf Render

Ein einziger Render-Service liefert sowohl die Website (Overlay + Moderatoren-Ansicht) als auch den Live-Sync zwischen beiden aus. Kein GitHub Pages, keine zweite URL, kein manuelles Eintragen einer Server-Adresse nötig.

## Struktur

```
cam-overlay-render/
  server.js          ← liefert die Website aus UND macht den Live-Sync
  package.json
  public/
    index.html       ← die Moderatoren-Ansicht (Hauptseite / Startseite)
    overlay.html      ← das Overlay (für OBS-Browser-Quelle oder direkt im Vollbild)
    style.css
    app.js
    sync.js
```

## Deployment auf Render

1. Diesen Ordner (`cam-overlay-render`) als Repo auf GitHub pushen (Inhalt direkt im Root, kein Unterordner nötig).
2. Bei Render: **New → Web Service** → Repo auswählen.
3. **Root Directory:** leer lassen (alles liegt schon im Root).
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. Deploy abwarten, bis oben ein grüner Punkt "Live" steht.

Du bekommst eine einzige URL, z.B. `https://cam-overlay.onrender.com`. Diese URL öffnest du selbst — das ist die **Moderatoren-Ansicht**. Dort steht ganz oben eine Box mit dem fertigen **Overlay-Link** (inkl. Kopieren-Button), den du dann an OBS bzw. den Ort weitergibst, wo das Bild gezeigt werden soll.

## Wer bekommt welchen Link

| Wer | Link | Was er tut |
|---|---|---|
| Die bis zu 9 Mitspieler | ihr persönlicher vdo.ninja-Sende-Link (aus der Moderatoren-Ansicht) | Kamera/Mikro erlauben, fertig |
| Der Moderator | die Hauptseite, z.B. `https://cam-overlay.onrender.com` | Namen, Herzen, Zug-Reihenfolge, Kicks steuern |
| Overlay-Anzeige / OBS | der Link aus der Kopieren-Box (`.../overlay.html`) | zeigt das fertige Bild, z.B. als Browser-Quelle in OBS |

Alles läuft rein über den Browser — niemand muss etwas lokal installieren.

## Wichtig: Render Free-Tier

Der kostenlose Plan schläft nach ca. 15 Minuten Inaktivität ein und braucht dann beim nächsten Aufruf ein paar Sekunden zum Aufwachen. Vor dem eigentlichen Start also kurz die Moderatoren-Seite öffnen, damit der Service "wach" ist, bevor's losgeht.

## Spielablauf

- Der Zug startet beim ersten Spieler oben links im Grid.
- In der Moderatoren-Ansicht: aktueller Spieler + **"Weiter"**-Button, nach jeder Frage klicken.
- **20-Sekunden-Timer:** daneben ein Button **"Timer starten (20s)"** — startet einen Countdown, der auf der Kachel des aktuell aktiven Spielers im Overlay als Badge oben rechts eingeblendet wird. Erneut klicken startet ihn neu.
- Eine Runde = 2 Durchgänge (jeder kommt zweimal dran). Statusleiste zeigt "Runde X · Frage 1/2" bzw. "2/2".
- Nach der Runde: **"Runde beendet – jetzt voten"** — Herz manuell in der Spielerkarte abziehen, dann **"Neue Runde starten"**.
- 0 Herzen → Cam wird im Overlay automatisch schwarz-weiß, Spieler wird beim Zugwechsel übersprungen, **"Kicken"**-Button erscheint.
- Kicken entfernt ihn endgültig, das Overlay ordnet sich automatisch neu — bis nur noch 2 Spieler übrig sind.

## Feste 16:9-Kacheln

Jede Cam-Kachel behält immer exakt das 16:9-Seitenverhältnis, egal wie viele Spieler gerade aktiv sind — sie wird nie gestreckt oder gestaucht. Das Overlay berechnet die größtmögliche einheitliche Kachelgröße per JavaScript und zentriert das Grid; übrig bleibender Platz wird mit der Hintergrundfarbe aufgefüllt (Letterboxing), genau wie bei einem echten Streaming-Layout.

## Beste Qualität & möglichst wenig Verzögerung (vdo.ninja)

Das Overlay setzt bereits sinnvolle Standard-Parameter (`&videobitrate=4000`, `&codec=h264`, `&lowlatency`, `&quality=0`). Für noch bessere Ergebnisse:

- **Kabel statt WLAN:** Die Mitspieler sollten wenn möglich per Ethernet-Kabel statt WLAN senden — WLAN verursacht die meiste Latenz-Schwankung.
- **Bandbreite realistisch einschätzen:** `&videobitrate` sollte zur tatsächlichen Upload-Geschwindigkeit passen. Zu hoch angesetzt führt zu Rucklern/Frame-Drops statt zu besserer Qualität. 2500–4000 kbps sind für "Talking-Head"-Webcams meist ein guter Bereich; bei sehr guter Leitung kann man höher gehen.
- **Chrome/Edge statt Safari/Firefox** für die sendende Seite — bessere Hardware-Encoding-Unterstützung, stabiler bei mehreren gleichzeitigen Streams.
- **Andere bandbreitenhungrige Programme schließen** (Cloud-Sync, Downloads, andere Video-Calls) während der Show.
- **`&codec=av1`** auf der Viewer-Seite kann bei guter Verbindung bessere Bildqualität pro Bitrate liefern, braucht aber deutlich mehr CPU — nur sinnvoll bei starken Rechnern.
- **`&scale=100`** auf der Viewer-Seite verhindert, dass vdo.ninja das Bild automatisch verkleinert, falls das mal schärfer sein soll als nötig.
- Die ersten paar Sekunden nach dem Öffnen eines Sende-Links sind durch den WebRTC-Verbindungsaufbau (STUN/Peer-Handshake) immer etwas langsamer — das ist normal und nicht durchs Overlay beeinflussbar. Danach läuft die Verbindung direkt (Peer-to-Peer) mit sehr geringer Verzögerung.

## vdo.ninja einbinden

In der Moderatoren-Ansicht pro Spieler eine vdo.ninja Stream-ID eintragen (frei wählbar, z.B. `spieler1-abc123`). Der zugehörige **Sende-Link** erscheint automatisch daneben — den an den Mitspieler schicken.

## Design anpassen

In der Moderatoren-Ansicht gibt es jetzt eine Design-Box ganz oben:

- **Hintergrundfarbe:** Farbwähler — ändert sofort und live die Farbe, die im Overlay zwischen/um die Cam-Kacheln zu sehen ist (bei allen verbundenen Geräten gleichzeitig).
- **Logo (PNG):** Datei auswählen, erscheint automatisch oben links im Overlay. Über "Logo entfernen" wieder wegnehmen. Empfehlung: kleines, freigestelltes PNG mit transparentem Hintergrund, max. ca. 3 MB.

Für Feinschliff an Schrift/Rahmenform stehen zusätzlich CSS-Variablen ganz oben in `public/style.css` (`:root { ... }`) zur Verfügung.

## Sind die Cams in 1080p?

Der Sende-Link enthält bereits `&quality=0&width=1920&height=1080`, was der sendenden Seite gezielt 1080p abverlangt (Fallback auf 720p, falls Kamera oder Internetverbindung das nicht hergeben). Für stabiles 1080p wird auf Senderseite ein halbwegs aktueller Rechner mit 4 CPU-Kernen sowie eine gute Upload-Bandbreite empfohlen — bei schwächerer Hardware/Leitung regelt vdo.ninja automatisch auf 720p runter, um Ruckler zu vermeiden.
