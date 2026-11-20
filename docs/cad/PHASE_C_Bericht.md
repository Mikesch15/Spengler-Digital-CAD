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
  - **Ein:** Knopf sichtbar (seit C2b lädt der Kern, sobald er eingeschaltet ist), 3D-Prüfung Traufblech Δ 0,0000 mm, STEP exakt (AP242, Volumenkörper, Biegezylinder), Statusmeldung, keine Konsolenfehler
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

## C2c – Prüfen → Eigenschaften (exakt) (erledigt, 20.11.2026)
- **Prüfen ▾ → «Eigenschaften (exakt)»** (nur mit eingeschaltetem Kern): Tabelle je exaktem Körper mit Volumen, Oberfläche, Masse (Dichte aus dem Material, falls vorhanden), Schwerpunkt, Abmessungen und Gültigkeit (BRepCheck). Dazu der Export als CSV. Nicht exakte Körper werden mit Grund genannt.
- **Test (App, jetzt 18/18):** Platte 89,696 cm³ = analytisch. Schwerpunkt x 50,63 = (250000 − π·100·25 − π·64·75)/(5000 − π·164) analytisch. Abmessungen 100 × 50 × 20. Ring 1055,575 cm³. CSV-Export.
- **Grenze:** Bei Teilen mit Komponentenlage beziehen sich Schwerpunkt und Abmessungen auf die unverschobene Lage (mit * markiert).

## C2d – Splines und Ellipsen exakt (erledigt, 20.11.2026)
- **Splines:** Die App zeichnet zentripetale Catmull-Rom-Kurven. Jedes Segment wird **exakt** als kubische Bézierkurve an den Kern übergeben (Barry–Goldman-Tangenten). Abweichung zu den Kurvenpunkten der App: 0,0000 mm. Das gilt für offene Splines in Ketten und für geschlossene Splines.
- **Ellipsen:** zwei halbe Ellipsenbögen, auch gedreht (V = π·a·b·h exakt)
- **Weiterhin nicht exakt:** Skizzentext (bleibt Netz, wird genannt)
- **Tests:** `cad.test.js` +5. App-Test 20/20 (Ellipse exakt aus dem Kern, Text als Netz gemeldet).

## C2e – Abrunden/Fasen, Schale, Muster, Spiegeln, Bewegen exakt (erledigt, 20.11.2026)
- **Kern:** Nahtkanten werden erkannt (`BRep_Tool.IsClosed`), Kantenpunkte mit Toleranz für angeklickte Netzkanten angenommen, und es gibt das neue Kommando `matrix` (3×4, auch Spiegelung mit det −1, gültig geprüft).
- **`featureBau.js`:**
  - `extrusionsHoehen` und `extrusionsKanten`: «senkrecht» sind gerade Kanten entlang der Extrusion ohne Nähte, «quer» sind die Kanten in Boden und Deckel.
  - `extrusionsFlaechen`: Boden- und Deckelflächen für die Schale.
  - `matrixZeilen`: Umrechnung der Matrix aus three.js.
- **App (Kern ein):**
  - Abrunden/Fasen einer Extrusion (wie `gerundeteExtrusion`) läuft im Kern.
  - Angeklickte Kanten werden über ihre Mitte im exakten Körper gefunden und abgerundet oder gefast.
  - Schale: oben, unten oder beidseitig offen, Wände nach innen.
  - Muster, Spiegeln und Bewegen über `matrix`; Kopien unter denselben Schlüsseln wie in der App (`id:k`).
- **Test (App, jetzt 25/25):** 10 Körper exakt, analytisch auf 0,3 % (Netz der Anzeige) und gegen das Netz-Ergebnis von 0.2 auf 2 %. Die Fase an allen Kanten ergibt 98 676 mm³ exakt wie im Netz, Bewegen liegt auf z 50…60, die Spiegelkopie auf x −450…−400.
- **Unterschied zu 0.2, offen genannt:** Die Schale wird exakt auf den **aktuellen** Körper angewendet (Wände auch um vorher ausgeschnittene Löcher). Version 0.2 zieht nur die Skizzenkontur ein.
- **Weiterhin als Netz (mit Meldung):** Sweep, Loft, Import, Kehle, Flächenblech, Text, Schale ohne offene Seite, Muster/Bewegen an Blechteilen, Kanten an verschobenen Komponenten.

## Nächste Schritte (C3 …)
1. **Splines und Ellipsen exakt** (B-Spline- und Ellipsenkurven im Profilformat)
3. **Abrunden/Fasen und Schale** über Kanten- und Flächenreferenzen (`topologie.js`) statt über Koordinaten am Netz.
4. **Feature-Fehler** aus dem Kern (`KernFehler.code`) direkt in der Zeitleiste anzeigen.
5. **Offline:** Service Worker legt `cad/` beim ersten Laden in den Zwischenspeicher. Heute geschieht das bereits über «Netz zuerst, dann Cache», aber ohne Vorabladen.
