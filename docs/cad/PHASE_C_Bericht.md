# Phase C – Parametrisches CAD-Grundgerüst (laufender Bericht)

## C1 – Kern in der App hinter einem Schalter (erledigt, 20.11.2026)

| Punkt | Umsetzung |
|---|---|
| Schalter | Einstellungen → Programm → «Exakter CAD-Kern (Beta)»: **Aus – wie Version 0.2** (Standard) / Ein – OpenCascade 8.0. Beim Ausschalten wird der Worker beendet. |
| Laden | `node build.mjs` schreibt zusätzlich `dist/cad/` (Worker, separate WASM, `LIZENZEN/`). Die App lädt den Kern **erst beim ersten Gebrauch**. `index.html` wächst nur um 7 KB (Klient). |
| STEP exakt | Datei ▾ → «STEP exakt (B-Rep)» (nur sichtbar, wenn der Kern eingeschaltet ist). Blechprofile, Vorlagen und Blech aus Linienzug kommen als exakte Volumenkörper (AP242) in die Datei, in derselben Lage wie in der Anzeige. Was noch keinen exakten Bauplan hat (Extrusion, Drehung, Sweep, Loft, Import, Flächenblech, Kehle, Teile mit Komponentenlage), wird **nicht** facettiert hineingeschrieben, sondern in der Statusmeldung genannt. |
| STEP aus Netz | Der bisherige Export bleibt, ist jetzt aber ehrlich beschriftet: «aus dem Anzeige-Netz (facettiert)». |
| 3D-Prüfung | Werkstatt → «3D-Prüfung (exakt)»: Der exakte Körper wird gebaut und geprüft, danach wird der Zuschnitt aus dem Volumen mit der Abwicklung verglichen. Ergebnis mit Δ, bei Abweichung > 0,001 mm als Warnung. |
| Ausfall | Wird die Datei per Doppelklick geöffnet (file://) oder fehlt das WASM, kommt eine verständliche Meldung. Alles andere läuft weiter. |

**Tests**
- **`npm test`:** 11 Testdateien, darunter `test/cad.test.js` mit Tests für App-Feature → Kern (3 Ebenen × 3 Richtungen) und dem Abweisen linkshändiger Ebenen.
- **`node tests/app-kern/pruefen.mjs`** (App in Chromium, nach `node build.mjs`), 10/10:
  - **Aus:** Knopf verborgen, kein Kern-Download, keine 3D-Prüfung, keine Konsolenfehler
  - **Ein:** Knopf sichtbar, Kern wird erst bei Gebrauch geladen, 3D-Prüfung Traufblech Δ 0,0000 mm, STEP exakt (AP242, Volumenkörper, Biegezylinder), Statusmeldung, keine Konsolenfehler
- Nicht in CI: Der App-Test braucht Playwright und läuft bisher nur lokal. Eine Aufnahme in CI ist offen.

**Geänderte Dateien:** `build.mjs` (+ Kernbündel), `src/cad.js` (Imports, Einstellung `programm.kern`, `_kernLage` in `regen()` für Vorlage, Profil und Blech, Abschnitt «Exakter CAD-Kern», Export-Verteilung, Werkstatt-Knopf), `src/cad.html` (Menüeintrag), `.gitignore` (`dist/cad/`), `tests/app-kern/pruefen.mjs`, `index.html`, `dist/index.html`.

**Grösse:** Das Windows-Installationsprogramm und die Web-Version enthalten jetzt zusätzlich 23 MB WASM (die Web-Version lädt sie nur bei Bedarf).

## Nächste Schritte (C2 …)
1. **Anzeige aus dem Kern:** Bei eingeschaltetem Kern werden Blechteile aus `tessellieren` dargestellt (mit Flächen- und Kanten-IDs) statt aus `ExtrudeGeometry`. Die Auswahl im Viewport läuft dann über die exakte Topologie.
2. **Extrusion und Drehung aus Skizzenprofilen:** Linien, Bögen, Kreise, Splines aus `kern/skizze.js` werden zu Kern-Profilen. Boolesch (verbinden, ausschneiden, schneiden) läuft über den Kern.
3. **Abrunden/Fasen und Schale** über Kanten- und Flächenreferenzen (`topologie.js`) statt über Koordinaten am Netz.
4. **Feature-Fehler** aus dem Kern (`KernFehler.code`) direkt in der Zeitleiste anzeigen.
5. **Offline:** Service Worker legt `cad/` beim ersten Laden in den Zwischenspeicher. Heute geschieht das bereits über «Netz zuerst, dann Cache», aber ohne Vorabladen.
