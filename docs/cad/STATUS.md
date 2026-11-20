# Statusbericht Auftrag «Professionelles CAD» (Stand 20.11.2026)

**Das gesamte CAD-System ist nicht fertig.** Fertig sind die Phasen A, B und grosse Teile von C, D und E, alles hinter dem Schalter «Exakter CAD-Kern (Beta)» (Einstellungen → Programm). Ausgeschaltet verhält sich die App wie Version 0.2. Details je Phase: `PHASE_A_…`, `PHASE_B_Bericht.md`, `PHASE_C_Bericht.md`, `PHASE_D_Bericht.md`, `PHASE_E_Bericht.md`.

## Phasen
| Phase | Stand |
|---|---|
| A Bestandsaufnahme | fertig |
| B CAD-Kern und Windows-Nachweis | fertig – OCCT 8.0 läuft unter Windows in Node, Edge und Tauri/WebView2 (14/14), eigener CI-Lauf |
| C Parametrisches Grundgerüst | grösstenteils: Extrusion, Drehung, Verbinden/Ausschneiden/Schneiden, Abrunden/Fasen, Schale, Muster, Spiegeln, Bewegen, Bohrung (Kern), Flächenblech, Rundblech exakt; Eigenschaften und STEP exakt |
| D Spengler-CAD | teilweise: Flächenblech mit Kantenbausteinen exakt, Rund-/Kegelblech mit Abwicklung/DXF, Rohr mit Dachanschnitt |
| E Zeichnungen und Schnitte | teilweise: exakte Ansichten ohne doppelte verdeckte Kanten, Schnittansichten aus dem Kern, Ø/R-Masse |
| F Baugruppen, Import/Export, Analyse | kaum begonnen (STEP-Export exakt ja; STEP-Import als B-Rep, 3MF, Gelenke nein) |
| G Release-QS | läuft mit: Regression `npm test` + App-Tests, Windows-CI |

## Noch Netz (bewusst mit Meldung, nie still angenähert)
Sweep, Loft, STEP/STL-Import, Kehle/Grat, Skizzentext, Lupe/Detailansicht im Plan, Muster/Bewegen an Blechteilen, Schale ohne offene Seite, Kegel mit schrägem Anschnitt.

## Offen gegenüber dem Auftrag (Auswahl)
- **Modellieren:** Gewinde, Entformung, Rippen, Teilen/Trennen, Flächen-Versatz/Trimmen, Direktmodellierung
- **Skizze:** Freiheitsgrad-Anzeige vollständig, elliptischer Bogen, Fase in der Skizze
- **Baugruppen:** Gelenke, Abhängigkeiten zwischen Komponenten, Explosion
- **Blech:** Sicken, Eckfreistiche, Übergänge Rund–Eckig, Kehl-/Gratblech exakt, Erkennung nicht abwickelbarer Flächen im Modell, DXF-Layer-Satz erweitern, Rinnenwerkzeuge (Rinne, Winkel, Stutzen), Lukarne/Kamin als Werkzeuge (vorhanden: Referenzmodelle im Test)
- **Zeichnung:** Mittellinien, Winkelmasse, Ø/R per Klick, Hilfs-/Detailansichten aus dem Kern, Schnittverlaufslinien mit Kennzeichnung, Toleranzen
- **Oberfläche:** Befehlssuche, anpassbare Leisten, Versionsverlauf, Einheiten
- **Austausch:** STEP-Import als B-Rep, 3MF
- **Plattform:** Offline-Cache für den Kern (Service Worker), Mobiltest, Speicher im Browser
- **Lizenz:** Hinweise im Programm (Info/Hilfe) einbauen; LGPL-Texte liegen in `dist/cad/LIZENZEN/`

## Tests (alle grün)
- `npm test` – 12 Testdateien, darunter `test/cad.test.js` (über 130 Prüfungen) und `test/abwicklungRund.test.js`
- `tests/app-kern/pruefen.mjs`, `rundblech.mjs`, `plan.mjs`, `cloud.mjs`, `bausteine.mjs` (Parameter-Bausteine, Sicherung), `umform.mjs` (Rundblech beurteilen) (Konto & Cloud gegen Server-Nachbau) – App in Chromium, Kern aus und ein
- GitHub: Web-Version, Windows-Installer (Release auf `main`), «CAD-Kern Windows-Nachweis» (Node, Edge, Tauri/WebView2)

## Nicht getestet
Echtes Windows-Gerät mit dem installierten Programm (nur CI-Runner), Handy/Touch-Bedienung des exakten Modus, grosse Modelle (Leistung), STEP-Dateien in anderen CAD-Systemen (Fusion, SolidWorks) – nur Roundtrip im eigenen Kern.
