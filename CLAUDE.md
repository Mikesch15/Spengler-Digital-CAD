# Spengler Digital CAD – Hinweise für Claude (tokensparend arbeiten)

Antworten kurz und auf Deutsch. Keine langen Zusammenfassungen, keine Wiederholung von Bekanntem.

## Nicht lesen / durchsuchen
- `index.html`, `dist/` (gebaut, minifiziert, >1 MB), `package-lock.json`, `node_modules/`
- `src/cad.js` (~4000 Zeilen) nie ganz lesen: erst `grep -n` nach Funktion/Abschnitt (`// ----`), dann nur den Ausschnitt

## Aufbau
- `kern/` reine Rechnung (mit Tests in `test/`): geometrie (Biegung), profile, materialien, skizze, loeser,
  skizzenloeser, details (Kurzschrift), flaechenblech (Kantenbausteine), ausdruck (Parameter),
  zeichnung (SVG), dxf / dxflesen, step (STEP/STL), ebenen
- `src/cad.js` Oberfläche + 3D (three.js), `regen()` baut alle Features neu; `src/plan.js` Planblatt;
  `src/ansicht.js` Ansichten/Kanten; `src/cad.html` Markup, CSS, Hilfe
- Feature-Dialoge: `featureDialog(f, istNeu, felder, setze, titel, hinweis, extra)`; Bearbeiten: `bearbeite(f)`

## Prüfen
- `npm test` (Kern) und `node build.mjs`; Oberfläche nur gezielt mit einem kurzen Playwright-Skript testen
- Keine Screenshots/Bilder lesen, ausser bei Darstellungsproblemen

## Git
- Branch `claude/tauri-windows-github-action-ltlved`, kein PR ohne Auftrag; `index.html` und `dist/index.html` nach `node build.mjs` mitcommitten
