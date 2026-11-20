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

## C2a/C2b – Exaktes Modell für Skizzenkörper (erledigt, 20.11.2026)

| Punkt | Umsetzung |
|---|---|
| Skizze → exaktes Profil | `kern/cad/skizzeProfile.js` übersetzt Linienzüge (auch mit Eckradien), Dreipunktbögen, Kreise, Rechtecke, Langlöcher und verbundene Ketten aus Linien und Bögen exakt, mit Löchern wie in der App. **Splines, Ellipsen und Text** gelten als «noch nicht exakt»; sie werden nicht angenähert. |
| Features → Kommandos | `extrusionKommandos` (eine/umgekehrt/symmetrisch) und `rotationKommandos` (rechtshändig um die Skizzenachse, Drehrichtung gegen das Netz geprüft) in `kern/cad/featureBau.js` |
| Exaktes Modell in der App | Ist der Kern eingeschaltet, baut die App nach jedem Neuaufbau (250 ms verzögert, im Worker) Extrusionen und Drehungen samt **Verbinden, Ausschneiden und Schneiden** sowie Blechteile exakt. Danach **ersetzt sie deren Anzeige-Netz durch die Tessellierung des exakten Körpers**, mit Flächenzuordnung je Dreieck (`userData.exakt`). Plan, Messen, Kollision und STL arbeiten damit auf dem exakten Netz. |
| Ehrlicher Rückfall | Was noch nicht exakt geht, bleibt Netz und steht in der Statusmeldung: Abrunden/Fasen, Schale, Muster, Spiegeln, Bewegen, Sweep, Loft, Import, Kehle, Flächenblech, Splines/Ellipsen/Text, Drehung mit Löchern, Blechteile mit Komponentenlage. Beispiel: «Exakt aus dem CAD-Kern: 3 Körper · als Netz: Ellipse (Ellipse noch nicht exakt)». |
| Veraltete Ergebnisse | Kommt ein neuerer Neuaufbau dazwischen, wird das ältere Ergebnis verworfen (Laufnummer). Alle Kernkörper werden nach jedem Lauf freigegeben. |

**Tests**
- **`test/cad.test.js`** (+4): Rechteck mit Kreis- und Langloch; Linienzug mit 4 Eckradien; Kette mit umgekehrtem Stück und Bogen; Ellipse → «noch nicht exakt»
- **`tests/app-kern/pruefen.mjs`** (+6, gesamt 15/15) mit einem Projekt aus Platte mit Loch, ausgeschnittener Bohrung, Ring (Drehung 360°), Segment (Drehung 90°) und Ellipse:
  - **Aus:** Alles bleibt Netz wie 0.2.
  - **Ein:** 3 Körper kommen aus dem Kern. Die Netzvolumen stimmen auf 0,2 % mit den exakten Werten überein (der Rest ist Sehnenfehler der Anzeige). Das 90°-Segment liegt wie das Netz (gleiche Grenzen). Die Ellipse bleibt Netz und wird genannt. Keine Seitenfehler.

**Hinweis:** Masse, die die App heute aus Netzen rechnet (z. B. Messen am Körper), werden bei eingeschaltetem Kern mit dem genaueren Netz gerechnet. Exakte Masse direkt aus dem Kern (Volumen, Fläche, Schwerpunkt im Prüfen-Menü) sind der nächste Schritt.

## Nächste Schritte (C2c …)
1. **Prüfen → Eigenschaften:** exaktes Volumen, Fläche, Schwerpunkt und Masse je Körper aus dem Kern; Gültigkeitsprüfung
2. **Splines und Ellipsen exakt** (B-Spline- und Ellipsenkurven im Profilformat)
3. **Abrunden/Fasen und Schale** über Kanten- und Flächenreferenzen (`topologie.js`) statt über Koordinaten am Netz.
4. **Feature-Fehler** aus dem Kern (`KernFehler.code`) direkt in der Zeitleiste anzeigen.
5. **Offline:** Service Worker legt `cad/` beim ersten Laden in den Zwischenspeicher. Heute geschieht das bereits über «Netz zuerst, dann Cache», aber ohne Vorabladen.
