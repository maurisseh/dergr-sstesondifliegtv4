# Cam Overlay – alles auf Render

Ein einziger Render-Service liefert sowohl die Website (Overlay + Moderatoren-Ansicht) als auch den Live-Sync zwischen beiden aus. Kein GitHub Pages, keine zweite URL, kein manuelles Eintragen einer Server-Adresse nötig.

## Struktur

```
cam-overlay-render/
  server.js          ← liefert die Website aus UND macht den Live-Sync
  package.json
  public/
    index.html       ← das Overlay (für OBS-Browser-Quelle oder direkt im Vollbild)
    moderator.html   ← die Steuerung
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

Du bekommst eine einzige URL, z.B. `https://cam-overlay.onrender.com`. Damit sind automatisch beide Seiten erreichbar:

- **Overlay:** `https://cam-overlay.onrender.com/index.html` (oder einfach `https://cam-overlay.onrender.com/`)
- **Moderator:** `https://cam-overlay.onrender.com/moderator.html`

Beide Seiten verbinden sich automatisch mit dem Sync-Server auf demselben Host — nichts weiter einzutragen.

## Wer bekommt welchen Link

| Wer | Link | Was er tut |
|---|---|---|
| Die bis zu 9 Mitspieler | ihr persönlicher vdo.ninja-Sende-Link (aus der Moderatoren-Ansicht) | Kamera/Mikro erlauben, fertig |
| Der Moderator | `/moderator.html` | Namen, Herzen, Zug-Reihenfolge, Kicks steuern |
| Overlay-Anzeige / OBS | `/index.html` | zeigt das fertige Bild, z.B. als Browser-Quelle in OBS |

Alles läuft rein über den Browser — niemand muss etwas lokal installieren.

## Wichtig: Render Free-Tier

Der kostenlose Plan schläft nach ca. 15 Minuten Inaktivität ein und braucht dann beim nächsten Aufruf ein paar Sekunden zum Aufwachen. Vor dem eigentlichen Start also kurz `/moderator.html` öffnen, damit der Service "wach" ist, bevor's losgeht.

## Spielablauf

- Der Zug startet beim ersten Spieler oben links im Grid.
- In der Moderatoren-Ansicht: aktueller Spieler + **"Weiter"**-Button, nach jeder Frage klicken.
- Eine Runde = 2 Durchgänge (jeder kommt zweimal dran). Statusleiste zeigt "Runde X · Frage 1/2" bzw. "2/2".
- Nach der Runde: **"Runde beendet – jetzt voten"** — Herz manuell in der Spielerkarte abziehen, dann **"Neue Runde starten"**.
- 0 Herzen → Cam wird im Overlay automatisch schwarz-weiß, Spieler wird beim Zugwechsel übersprungen, **"Kicken"**-Button erscheint.
- Kicken entfernt ihn endgültig, das Overlay füllt sich automatisch neu — bis nur noch 2 Spieler übrig sind.

## vdo.ninja einbinden

In der Moderatoren-Ansicht pro Spieler eine vdo.ninja Stream-ID eintragen (frei wählbar, z.B. `spieler1-abc123`). Der zugehörige **Sende-Link** erscheint automatisch daneben — den an den Mitspieler schicken.

## Design anpassen

Farben/Schrift/Rahmenform stehen als CSS-Variablen oben in `public/style.css` (`:root { ... }`).
