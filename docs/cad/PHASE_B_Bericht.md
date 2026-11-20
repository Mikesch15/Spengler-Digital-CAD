# Phase B – CAD-Kern und Windows-Nachweis (Bericht)

Stand 20.11.2026 · Branch `claude/tauri-windows-github-action-ltlved`
Version 0.2 bleibt unverändert: `src/` ist nicht angefasst, `index.html` baut identisch, alle bisherigen Tests sind grün.

## Erledigt

| Punkt | Ergebnis |
|---|---|
| OCCT/replicad verifiziert | replicad 1.2.1 (MIT), replicad-opencascadejs 1.2.1 (LGPL-2.1-only). **OCCT-Version 8.0**, belegt durch den STEP-Kopf («Open CASCADE STEP processor 8.0»). Build über das Docker-Image `ghcr.io/taucad/opencascade.js:3.1.0`. |
| STEP-Schema | **AP242** (`AP242_MANAGED_MODEL_BASED_3D_ENGINEERING_MIM_LF`), Einheit mm, exakte Zylinder- und Kegelflächen |
| WASM separat ausliefern | `kern/cad/bauen.mjs` → `cad-worker.js` (448 KB) und eine **separate** `replicad_single.wasm` (22,9 MB, gzip 7,2 MB), ersetzbar. Dazu `LIZENZEN/` mit LGPL-Text, MIT-Text und `HERKUNFT.txt` (Quellen, Austauschanleitung) |
| Schnittstelle | `kern/cad/schnittstelle.js`: 26 Kommandos als reine Daten, Einheiten mm/Grad, 9 Fehlercodes, begründete Toleranzen |
| Adapter | `kern/cad/occt.js`: der **einzige** Ort mit OCCT. Er arbeitet auf Kopien (replicad verbraucht Eingaben). **Jedes Ergebnis wird mit BRepCheck geprüft**, ungültige werden verworfen (`UNGUELTIG`). Leere Ergebnisse geben einen Fehler. |
| Topologie-Referenzen | `kern/cad/topologie.js`: Signaturen (Trägergerade/-ebene, Normale, Länge). Eine Kante wird nach einer Parameteränderung wiedergefunden. Ist sie verschwunden oder mehrdeutig, kommt der Fehler `REFERENZ` statt einer stillen Fehlzuordnung. |
| Tessellierung | Netz mit Zuordnung Dreieck → Flächenindex und Linie → Kantenindex. Damit lässt sich jede Auswahl im Viewport auf die exakte Topologie zurückführen. |
| Worker | `kern/cad/worker.js` + `klient.js`: WASM wird erst beim ersten Kommando geladen. Netze werden ohne Kopie übertragen. Zeitlimit und Abbruch beenden den Worker, danach wird neu gestartet (Ereignis `neustart`, alte Kennungen sauber ungültig). Fehlt das WASM, kommt `NICHT_GELADEN` statt eines Absturzes. |
| Spengler rein | `kern/cad/blech.js` (Querschnitt aus `kern/geometrie.js`, Zuschnitt-Gegenprüfung aus dem Volumen), **neu** `kern/abwicklungRund.js` (Zylinder- und Kegelabwicklung auf der K-Faser, Abwickelbarkeitsprüfung) |
| Speicher | Nach 300 Zyklen Erzeugen/Boolesch/Netz/Freigeben bleibt der WASM-Heap bei 100 MB (kein Wachstum). Die Anzahl gehaltener Körper geht auf den Ausgangswert zurück. |

## Tests und Ergebnisse

| Testlauf | Umgebung | Ergebnis |
|---|---|---|
| `npm test` (10 alte Testdateien + `test/cad.test.js` mit 70 Prüfungen) | Node 22, Linux | alle bestanden, Kern-Tests ≈ 8 s |
| Prüfseite `tests/cad-worker` (14 Prüfungen) | Chromium 153 (Playwright) | 14/14 · Laden 0,3 s · Rinnenwinkel 1,7 s, Hauptthread-Lücke max. 17 ms |
| Tauri-2-Probe `tests/tauri-probe` | Linux, WebKitGTK (Safari-Engine) | 14/14 · Laden 1,0 s |
| Workflow `cad-windows.yml` | windows-latest: Node, Edge, Tauri 2/WebView2 | siehe unten |

Referenzbibliothek (`test/cad.test.js`), alle gegen analytische Werte. Toleranz relativ 1e-9, sonst angegeben:
- **Körper:** Quader, Zylinder (beliebige Achse), Kegel, Kegelstumpf, Kugel (V, A, Schwerpunkt, Grenzen)
- **Boolesch:** Differenz, Vereinigung, Schnittmenge. Eine leere Schnittmenge ergibt einen Fehler.
- **Bohrungen:** Durchgang, Sackloch, Senkung 90°. **Gewinde ist nicht umgesetzt.**
- **Bearbeiten:** Verrunden und Fasen an Referenzkanten, zu grosser Radius gibt einen Fehler. Schale, Muster, Spiegeln, Drehen.
- **Freiform:** Sweep (Pappus), Loft (Pyramidenstumpf)
- **Zeichnung/Schnitt:** Projektion vorn (Umriss 240 mm, Bohrungsmantel verdeckt), Schnittfläche 1600 mm²
- **Spengler, Zuschnitt aus 3D = Abwicklung auf 1e-6 mm:** abgekantet, Ortgang mehrfach, Umschlag, Halbrunde Rinne mit Wulst. Doppelstehfalz Unter- und Oberfalz direkt aus der Kurzschrift.
- **Gehrungen:** Ortgang 45° und Rinnenwinkel 90°, Überschneidung 0, V = V_A + V_B
- **Runde Bleche:** Zylinder- und Kegelsegment gegen `abwicklungRund.js`
- **Lukarnen-Seitenblech:** Gültigkeit, liegt auf der Dachfläche, STEP. Keine analytische Volumenreferenz – das ist ehrlich so gekennzeichnet.
- **Kaminanschluss (vereinfacht):** Dach mit schrägem Durchbruch (V exakt), Brust- und Nackenblech liegen an Kamin und Dach an (Abstand < 1e-6 mm, keine Durchdringung), Draufsicht, Längsschnitt, STEP mit 4 Körpern. **Seitenbleche sind noch offen.**
- **Fehlerfälle:** Eingabe, unbekannte Kennung, unbekanntes Kommando, selbstüberschneidendes Profil

## Windows-Nachweis

Lauf 1 des Workflows fand sofort einen echten Fehler. In Node ergab `new URL(...).pathname` unter Windows `/D:/…`, daraus wurde der Pfad `D:\D:\…`.
- **Ursache:** Pfadumwandlung, nicht WASM oder WebView2
- **Behebung:** `fileURLToPath` (Commit «WASM-Pfad in Node über fileURLToPath»)
- **Nebenwirkung, offen genannt:** Der Installer-Workflow (`windows-build.yml`) führt `npm test` aus. Er war auf diesem Branch für die Commits B1 und B2 rot (Läufe 66/67). Mit dem Fix ist das behoben (siehe neuer Lauf).

Ergebnis nach dem Fix: Lauf 2 (`44717167321`, windows-latest) war **grün**. Der Installer-Lauf 68 war ebenfalls wieder grün.

| Nachweis | Ergebnis |
|---|---|
| 1 Kern-Tests mit Node unter Windows | alle bestanden |
| 2 Microsoft Edge (Playwright, Kanal msedge) | 14/14 |
| 3 **Tauri 2 / WebView2 157.0.4341.46** (Edg/157, `csp: null`) | **14/14** · Laden 0,52 s · Rinnenwinkel 1,7 s · Hauptthread-Lücke max. 11 ms · STEP AP242 hin und zurück · Speicher stabil · Zeitlimit, Abbruch, Neustart und Ausfall korrekt |

Die Probe-App (`sdcad-cad-probe.exe`) und die Ergebnis-JSON liegen als Artefakt «cad-windows-nachweis» am Lauf. Der Workflow läuft bei jeder Änderung an `kern/cad/` erneut und dient damit als dauerhafte Regression für Windows.

**Abnahme Phase B: erfüllt.** Der Kern läuft unter Windows in Node, Edge und Tauri/WebView2, im Browser (Chromium) und unter WebKit (Tauri unter Linux). Die Adaptertests sind grün. Damit ist der Weg frei für Phase C, weiterhin hinter einem Schalter.

## Offene Punkte und Risiken

1. Gewinde (Darstellung und Geometrie) fehlt.
2. HLR-Projektion liefert auch verdeckte Kanten, die genau unter sichtbaren liegen. Für Zeichnungen müssen sie in Phase E unterdrückt werden.
3. Topologie-Referenzen: Bei grossen Formänderungen gibt es bewusst einen Fehler statt einer Zuordnung. Benennung über die Feature-Herkunft ist in Phase C ein Thema.
4. WASM 7,2 MB gzip: Erstladen auf dem Handy dauert. Offline-Cache: Der Service Worker muss `cad/` aufnehmen (Phase C).
5. CSP: Die App nutzt `csp: null`. Wird eine CSP gesetzt, braucht es `script-src 'wasm-unsafe-eval'` und `worker-src 'self'`.
6. Speicher im Browser: `performance.memory` gibt es nur in Chromium. Gemessen wird der WASM-Heap über das Kommando `speicher`.

## Nächste Phase (C1), sobald der Windows-Nachweis grün ist

- Schalter `einst.programm.kern` mit den Werten «netz» (Standard, wie 0.2) und «occt» (Beta) in den Einstellungen
- `dist/cad/` wird mit `node build.mjs` gebaut und erst beim Einschalten geladen
- **STEP exakt (B-Rep):** Blechprofile, Vorlagen und Blech aus Linienzug kommen über den Kern als exakte Körper in die STEP-Datei. Was noch nicht exakt geht, wird gemeldet und **nicht** als Netz in die STEP-Datei geschrieben. Der alte STEP-Export bleibt als «STEP aus Netz (facettiert)».
- **3D-Gegenprüfung in der Werkstatt:** Zuschnitt aus dem exakten Körper gegen die Abwicklung, je Blechteil.
