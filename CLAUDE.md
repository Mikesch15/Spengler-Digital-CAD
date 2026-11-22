# Spengler Digital CAD – Arbeitsregeln für Claude (Token sparen)

Antworten kurz, deutsch. Keine Wiederholung von Bekanntem, keine langen Zusammenfassungen.

## Suchen statt Lesen
- NIE lesen: `index.html`, `dist/`, `package-lock.json`, `node_modules/`, `docs/cad/KARTE.md` (nur grep), `src/cad.js` ganz (>6000 Zeilen).
- Finden: `node tools/karte.mjs <name>` → Datei:Zeile (auch `regen-Zweig <typ>` für die Feature-Zweige in `regen()`).
- Anzeigen: `node tools/fn.mjs <name> [datei] [--max=60]` zeigt eine Funktion; sonst Read mit offset/limit.
- Nach grösseren Umbauten: `node tools/karte.mjs --schreibe`.
- Task-Liste nur bei grossen Aufträgen nutzen und erledigte Tasks löschen (die Liste wird bei jedem Hinweis mitgeschickt).

## Aufbau
- `kern/` reine Rechnung (Tests in `test/`): geometrie, profile, flansch, flaechenblech, stirnflansch, skizze, loeser, dxf, zeichnung, step, ebenen, richtung; `kern/dach/` Dach; `kern/cad/` exakter OCCT-Kern.
- `src/cad.js` Oberfläche + 3D (`regen()` baut alle Features neu, Zweig je `f.typ`), `src/cad.html` Markup/CSS/Hilfe, `src/plan.js` Planblatt, `src/kontext.js` Kontextleiste, `src/befehlssuche.js`, `src/arbeitsbereich.js`, `src/meldungen.js`.
- Feature-Dialog: `featureDialog(f, istNeu, felder, setze, titel, hinweis, extra)`; Schritte: `mitSchritten(felder, regeln)`; Bearbeiten: `bearbeite(f)`; Werkzeugknöpfe: `#w…` in `cad.html`.

## Prüfen (Ausgabe kurz halten)
- `node build.mjs >/dev/null` dann `npm run t` = Kern + zu den geänderten Dateien passende App-Tests, parallel, eine Ergebniszeile (Fehler nur bei Fehlern).
- `npm run t:alle` nur vor Merge/Release; gezielt: `node tests/lauf.mjs kontext dach`.
- Neuer App-Test: `tests/app-kern/<name>.mjs` (Port aus `process.env.PORT`), Zuordnung in `tests/karte.json` eintragen.
- Keine vollen Testlogs lesen, keine Screenshots ausser bei Darstellungsproblemen.

## Git
- Arbeit auf Feature-Branch, nach grünen Tests per Fast-Forward nach `main` (Besitzer will jede Änderung als Update; jeder Push auf `main` veröffentlicht ein Windows-Release mit Auto-Update). `index.html` und `dist/index.html` nach `node build.mjs` mitcommitten. Kein PR ohne Auftrag.
