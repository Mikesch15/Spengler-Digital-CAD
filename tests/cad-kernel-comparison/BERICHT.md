# Abschlussbericht: CAD-Kern-Vergleich OpenCascade (OCCT/WASM) ↔ OpenGeometry

Stand 20.11.2026 · Branch `claude/tauri-windows-github-action-ltlved` · Node 22.22 · Chromium (Playwright)
Alle Zahlen stammen aus `ergebnisse/messprotokoll.json`, `abwicklung.json` und `vorschau.json` (reproduzierbar mit `npm test` / `npm run vorschau`).
Version 0.2 unverändert: `npm test` (Kern, 10 Testdateien) grün, `node build.mjs` unverändert, keine Datei in `src/` oder `kern/` geändert.

---

## 1. Bestehende Architektur (Bestandsaufnahme)

| Bereich | Stand |
|---|---|
| Build | esbuild 0.25 (`build.mjs`) bündelt `src/cad.js` + `src/cad.html` → eine Datei `index.html` / `dist/index.html`; GitHub Actions `web.yml` (Pages + Vorschau je Branch), `windows-build.yml` (Tauri) |
| PC-Programm | Tauri 2 (`src-tauri/`, Version 0.2.0), `csp: null` |
| 3D | three.js 0.160 (`src/cad.js` 4138 Z., `src/plan.js`, `src/ansicht.js`) |
| Geometriemodell | Features im Dokument; `regen()` erzeugt daraus **Three.js-Dreiecksnetze**. Es gibt keinen exakten Körper. |
| Boolesche Operationen | three-bvh-csg (Netz-CSG) in `src/cad.js` (Brush/Evaluator) und `src/plan.js` (Schnittansichten) |
| Zeichnungsansichten | `src/ansicht.js`: Kanten aus Netzen (EdgesGeometry + Umrisse), Sichtbarkeit über Tiefenpuffer |
| STEP-Export | `kern/step.js` `stepDatei()`: aus Dreiecken, ebene Flächen zusammengefasst – gekrümmte Flächen bleiben facettiert |
| STEP-Import | occt-import-js 0.0.23 (OCCT, LGPL), lazy aus `dist/occt/` geladen, liefert **nur Netze** (`src/cad.js` ~Z. 4030) |
| DXF | `kern/dxf.js` (Abwicklungen schreiben), `kern/dxflesen.js` (2D lesen, Tests) |
| Spenglerlogik (bleibt) | `kern/geometrie.js` `berechne()` (Biegung, K-Faktor, Zuschnitt), `kern/materialien.js` (t, ri, k je Material), `kern/profile.js`, `kern/flaechenblech.js` (Kantenbausteine, Ecken, Abwicklung), `kern/details.js` (Kurzschrift), `kern/zuschnitt.js` |
| Tests | reine Node-Skripte `test/*.test.js` (`npm test`), keine Testbibliothek |
| Direkt netzabhängig | `src/cad.js`, `src/plan.js`, `src/ansicht.js` (Three.js + three-bvh-csg). `kern/` ist netzfrei – ausser `kern/step.js` (arbeitet auf Dreiecken). |
| Lücke | **Keine Kegel-/Zylinderabwicklung in `kern/`** (Kehle/Grat nur in `src/cad.js`) |

## 2. Technologiestand

**OpenCascade (OCCT)**
- Geprüft: `replicad` 1.2.1 (MIT, Mod. 06.11.2026) + `replicad-opencascadejs` 1.2.1 (LGPL-2.1-only, eigener OCCT-Build über Docker-Image `taucad/opencascade.js:3.1.0`).
  WASM 22,9 MB (gzip 7,2 MB), zusätzlich eine Multithread-Variante.
- Weitere Bindings: `opencascade.js` 1.1.1 (stabil, alt), 2.0.0-beta (03.2023, nicht mehr bewegt), `@taucad/opencascade.js` 3.0.0-beta.1 – nicht im Test.
  `occt-import-js` (schon in der App) kann nur Import → Netz.
- OCCT-Version des Builds: **nicht eindeutig belegt** (Typen nutzen `NCollection_Array2` als `TColgp_*`-Alias → vermutlich OCCT ≥ 7.8).
- Die Bindings sind ein **ausgewählter Teil** der OCCT-API (nur, was replicad braucht). Fehlende Klassen bräuchten einen eigenen Build (Docker, ytt).
  Im Test direkt genutzt und vorhanden: `BRepCheck_Analyzer`, `BRepAlgoAPI_Section`, `STEPControl_*`, `BRepOffsetAPI_ThruSections`, `GeomAPI_PointsToBSplineSurface`.

**OpenGeometry**
- `opengeometry` 3.0.1 (MPL-2.0, 16.11.2026), Rust → WASM, Three.js-SDK. WASM 2,9 MB (gzip 1,1 MB).
  Peer-Abhängigkeit `three` ≥ 0.168 < 0.185 – **die App nutzt 0.160** (ein Upgrade wäre nötig).
- Grosser API-Bruch von 2.x zu 3.0. Laut eigenem README «APIs … evolving». Auf npm ist ein Maintainer eingetragen.
- Laut README «What does not exist» in 3.0: Loft, Fillets, Splines/NURBS, Ellipsen, STL, Projektion, öffentliche Triangulation. STEP **nur Export**.

## 3. Verifizierte Funktionen

| Funktion | OCCT (replicad) | OpenGeometry 3.0.1 |
|---|---|---|
| B-Rep Ebene/Zylinder/Kegel | verifiziert | verifiziert |
| NURBS-Fläche | verifiziert (B-Spline über Loft) | nicht vorhanden |
| Vereinigung/Differenz/Schnitt | verifiziert | verifiziert (einfache Fälle); `CoverageGap` bei Kegel + Sektor und bei gedrehten Gehrungskörpern |
| Verrundung / Fase | verifiziert | nicht vorhanden (nur Grundkörper ROUNDED_BOX) |
| Extrusion / Rotation | verifiziert (Rotation mit Teilwinkel) | verifiziert (Rotation nur 360°, Teilwinkel per Boolesch) |
| Sweep | verifiziert | verifiziert (Pfad nur Linien/Bögen) |
| Loft | verifiziert | nicht vorhanden |
| Schnittkurve | verifiziert (`BRepAlgoAPI_Section`) | nicht vorhanden (nur 2D-Regionen) |
| Gültigkeitsprüfung | verifiziert (`BRepCheck_Analyzer`) | verifiziert (`validity()`) |
| Volumen | exakt (GProp) | mit Fehlerschranke (z. B. ±35 mm³ bei Zylinder r20 h50) |
| STEP-Export | verifiziert | verifiziert (von OCCT fehlerfrei gelesen, Volumen exakt) |
| STEP-Import | verifiziert (Roundtrip Δ 0) | **nicht vorhanden** |
| Netz für Three.js | verifiziert, mit Flächenzuordnung (`faceGroups`) | verifiziert, Körper ist `THREE.Group`; Picking über `resolveHit` |
| Browser (Chromium) | verifiziert | verifiziert |
| Tauri/WebView2 (Windows) | **nicht getestet** (kein Windows hier; WebView2 ist Chromium, `csp: null`) | **nicht getestet** |

## 4. Ergebnisse der Prototyp-Tests (47 Einträge)

✓ = gültig und richtig, – = nicht unterstützt, ✗ = Fehler des Kerns

| Test | OCCT | OpenGeometry |
|---|---|---|
| 1 Quader, Zylinder, Kegelstumpf | ✓ ✓ ✓ (Δ 0) | ✓ ✓ ✓ (Δ ≤ 3·10⁻⁵, innerhalb Schranke) |
| 2 Differenz, Vereinigung, Schnitt | ✓ ✓ ✓ | ✓ ✓ ✓ |
| 3 Verrundung r2, Fase 3 | ✓ ✓ (Volumen exakt) | – – |
| 4 Sweep, Loft, NURBS, Schnittkurve | ✓ ✓ ✓ ✓ (Kreislänge exakt 125,6637) | ✓ – – – |
| 5 Abkantung, Umschlag, Mehrfachprofil | ✓ ✓ ✓ | ✓ ✓ ✓ |
| 5 Zylindersegment / Kegelsegment | ✓ / ✓ | ✓ / ✗ `CoverageGap` |
| 5 Gehrung (2 Ortgangprofile, 45° verschnitten, vereinigt) | ✓ Überlappung 0 mm³, Volumen = Summe | ✗ `CoverageGap` (auch mit Versatz); ein schräger Schnitt ohne Drehung um zwei Achsen gelingt |
| 6 STEP-Export / Re-Import | ✓ / ✓ (Volumen und BBox Δ 0) | ✓ / – (Kreuzprüfung: OG-Export in OCCT ✓) |
| 7 Netz: Lage, Massstab, Normalen | ✓ (BBox Δ 0, 0 falsche Normalen) | ✓ (BBox Δ 0 nach Weltmatrix, 0 falsche Normalen) |
| 7 Browser + Picking | ✓ Treffer → Fläche über `faceGroups` | ✓ Treffer → `faceId` über `resolveHit` (Kernkörper in Metern) |

Ein Ausschnitt der Browser-Vorschau liegt in `ergebnisse/vorschau.png`.

## 5. Performance (dieser Container, ein Lauf, Richtwerte)

| | OCCT | OpenGeometry |
|---|---|---|
| WASM-Grösse roh / gzip | 22,9 MB / 7,2 MB | 2,9 MB / 1,1 MB |
| Laden Node / Chromium (lokal, ohne Netz) | 0,30 s / 0,24 s | 0,08 s / 0,05 s |
| Quader − Zylinder | 75 ms | 14 ms |
| Spenglerprofil extrudieren | 4–6 ms | 1–3 ms |
| Gehrung (4 Boolesche Op.) | 0,72 s | – |
| STEP-Export | 64 ms | 5 ms |
| Profil mit Loch im Browser bauen + Netz | 208 + 48 ms | 116 + 18 ms |

Speicherbedarf zur Laufzeit wurde nicht gemessen (**nicht bewertet**).

## 6. Teil D – Abwicklungsabgleich

Material Titanzink 0,70 (t 0,7, ri 1,0, k 0,4 – Startwerte, nicht kalibriert).
Methode: Für Blech mit konstanter Dicke gilt exakt V = t · A_Mitte. Daraus folgt Zuschnitt = L_Mitte + (k − 0,5)·t·Σθ, verglichen mit `berechne().zuschnitt`.
Geprüft wird die **Übereinstimmung 3D ↔ eigene Abwicklung**, nicht der K-Faktor.

| Referenzteil | Soll (eigene Rechnung) | OCCT | OpenGeometry |
|---|---|---|---|
| Einfach abgekantet 40/60, 90° | 99,3106 mm × 200 | Δ 0,0000 | Δ −0,0005 (Schranke ±1,15) |
| Umschlag 50 + U 10 | 60,6212 mm | Δ 0,0000 | Δ −0,0010 |
| Ortgang 30/50/80/50/15 (4 Biegungen) | 219,4294 mm | Δ 0,0000 | Δ −0,0023 |
| Zylindersegment Rm 200, 90°, h 300 | 314,0493 mm × 300 | Δ 0,0000 | Δ −0,0504 |
| Kegelsegment 200→100, h 150, 90° | Kreisringsektor R 360,56 / 180,28, Öffnung 49,92°, A 42 476,90 mm² | Δ 0,000 mm² | ✗ (Körper nicht erzeugbar) |

Offen bzw. ehrlich gekennzeichnet:
- Der Kegel ist exakt abwickelbar. Die Formel dafür steht nur im Test, **im Produkt fehlt sie**.
- Freiformflächen (NURBS) sind im Allgemeinen nicht abwickelbar. Eine Erkennung (Gauss-Krümmung ≈ 0) ist nicht umgesetzt.
- Bei OpenGeometry ist der Zuschnitt nur so genau wie dessen Volumenschranke.

## 7. Lizenzen (keine Rechtsberatung)

| | Lizenz | Für eine kommerzielle Tauri-App |
|---|---|---|
| replicad | MIT | unproblematisch |
| replicad-opencascadejs / OCCT | LGPL-2.1 (OCCT zusätzlich mit «Open CASCADE Exception») | Möglich, wenn die `.wasm` als **separate, austauschbare Datei** ausgeliefert wird (wie heute `dist/occt/`), mit Lizenztext und Bezugsquelle des Quellcodes. Eigene Änderungen am Kern müssen veröffentlicht werden. |
| OpenGeometry | MPL-2.0 | Unverändert nutzbar. Änderungen an MPL-Dateien sind offenzulegen, eigener Code nicht. |
| Parasolid (Siemens) / ACIS (Spatial/Dassault) | kommerziell, Preis auf Anfrage (nicht belegt) | Native C++-Bibliotheken, kein offizieller Browser-/WASM-Build bekannt. Für Tauri nur nativ über Rust-FFI denkbar, die Browser-/Handy-Version fiele weg. Für dieses Projekt **nicht realistisch** (Kosten, Vertrag, Plattform). |

## 8. Vergleichsmatrix (0–5, gewichtet)

| Kriterium (Gewicht) | OCCT | Begründung | OpenGeometry | Begründung |
|---|---|---|---|---|
| Genauigkeit / B-Rep (20 %) | 5 | alle Δ 0, BRepCheck | 3 | exaktes B-Rep, Volumen nur mit Schranke |
| Flächen, Verrundung, Boolesch (20 %) | 5 | alle Tests inkl. Gehrung, Kegel, NURBS | 1 | keine Fillets/Loft/NURBS, 2 Abbrüche |
| STEP (15 %) | 5 | Export + Import, Roundtrip exakt | 2 | nur Export (der ist korrekt) |
| Browser/WASM/Tauri (15 %) | 3 | läuft, aber 7,2 MB gzip; Tauri nicht getestet | 4 | klein, schnell, Three-SDK; braucht three ≥ 0.168; Tauri nicht getestet |
| Reife, Wartbarkeit, Doku (10 %) | 4 | OCCT seit Jahrzehnten; replicad klein, ein Hauptentwickler | 2 | 3.0 ganz neu, API-Brüche, ein Maintainer |
| Lizenz (10 %) | 3 | LGPL-Pflichten, machbar | 4 | MPL, einfacher |
| Performance/Speicher (5 %) | 3 | gut, Laden gross; Speicher nicht gemessen | 5 | 2–5× schneller in den Tests |
| Erweiterbarkeit/Testbarkeit (5 %) | 4 | volle OCCT-API mit eigenem Build | 3 | Rust-Quellcode, typisierte Fehler, Undo-Marken |
| **Gewichtete Summe** | **4,25** | | **2,85** | |

## 9. Risiken und offene Fragen

- **Grösse:** OCCT braucht 7,2 MB gzip für die Web- und Handy-Version. Abhilfe: nur bei Bedarf in einem Web Worker laden. Die App bleibt ohne Kern nutzbar (Profile, Abwicklung, DXF).
- **replicad:** Es gibt im Wesentlichen einen Hauptentwickler. Bei Bedarf ginge auch ein direkter Zugriff auf die OpenCascade-Bindings (eigener Build).
- **Speicher:** replicad «verbraucht» Eingabekörper (im Test gefunden). Der Adapter muss Kopien übergeben und Speicher freigeben. Es braucht dafür ein Muster.
- **Tauri/Windows:** In WebView2 noch nicht getestet. Das ist der nächste Pflichttest.
- **OCCT-Version:** Welche Version im replicad-Build steckt, ist offen.
- **OpenGeometry:** Ein Wiederaufnehmen ist sinnvoll, falls eine spätere Version Fillets, Loft, NURBS und STEP-Import bringt (aktive Entwicklung).

## 10. Empfehlung

**OpenCascade (über replicad + replicad-opencascadejs) als exakten CAD-Kern einsetzen, hinter der Schnittstelle aus `kernschnittstelle.mjs`.**
Es ist der einzige geprüfte Kandidat, der alle Pflichtfunktionen (Verrundung, Loft, NURBS, Schnittkurven, STEP hin und zurück) und alle Spengler-Geometrien (inklusive Kegel und Gehrung) gültig und exakt erzeugt.
OpenGeometry ist kleiner und schneller, deckt aber für ein professionelles Spengler-CAD heute zu wenig ab.
Die Spenglerlogik bleibt wie verlangt unabhängig: Der Kern baut nur aus den Querschnitten, die `kern/` liefert, und die Abwicklung wird gegengeprüft (V = t·A).

### Architekturvorschlag (Teil E)
- Ein neuer Ordner `kern/cad/` mit der Schnittstelle: Einheiten mm/Grad, `KernFehler` mit `code`, undurchsichtige Körper-Handles. Dazu kommt `kern/cad/occt.js` als Adapter.
- Der Kern läuft in einem **Web Worker**. Die Oberfläche schickt Feature-Befehle und bekommt `netz()` (Positionen, Normalen, Flächengruppen) zurück. Three.js zeigt nur an, ein Netz ist nie die CAD-Quelle.
- Picking geht über die Flächengruppen → Flächen-ID → Kernabfrage.
- Die Spenglerlogik liefert reine Daten (Querschnitt, Pfade). Eine Funktion wie `blechQuerschnitt()` wandert als reine Funktion nach `kern/`. Ein Gegentest prüft, dass 3D und Abwicklung übereinstimmen.
- Ein Wechsel des Kerns bedeutet: neuer Adapter, dieselben `faelle.mjs`.

### Nächste Schritte (erst nach Freigabe)
1. Tauri-Windows-Test (WebView2): Laden, Speicher, CSP.
2. Worker und bedarfsweises Laden in die App, hinter einem Schalter. Ohne Kern bleibt alles wie in 0.2.
3. Zuerst Blechprofile und Flächenblech als B-Rep. STEP-Export über OCCT statt aus Dreiecken.
4. Kegel- und Zylinderabwicklung in `kern/` ergänzen, mit Tests (Formeln aus diesem Test).
5. Verrundungen, Fasen und Boolesch der App schrittweise vom Netz-CSG auf den Kern umstellen. Ansichten und Schnitte (`src/ansicht.js`, `src/plan.js`) aus exakten Kanten.
6. Lizenzhinweise und Bezug des OCCT-Quellcodes in Über/Hilfe und im Installer.

## Geänderte und neue Dateien

- Neu: `tests/cad-kernel-comparison/` (`package.json`, `package-lock.json`, `README.md`, `BERICHT.md`, `kernschnittstelle.mjs`, `faelle.mjs`, `run.mjs`, `abwicklung.mjs`, `adapter/occt.mjs`, `adapter/opengeometry.mjs`, `vorschau/{index.html, vorschau.mjs, bauen.mjs, pruefen.mjs}`, `ergebnisse/*`)
- Geändert: `.gitignore` (+ `tests/cad-kernel-comparison/vorschau/dist/`)
- Nicht geändert: `src/`, `kern/`, `test/`, `build.mjs`, `package.json`, `src-tauri/`

Quellen: npm-Registry (Paketversionen und Daten), Paketinhalte (`README`, `.d.ts`, `LICENSE`) der installierten Versionen, [OpenGeometry-Repository](https://github.com/OpenGeometry-io/OpenGeometry), [OpenCascade.js](https://ocjs.org/docs/about), [opencascade.js auf GitHub](https://github.com/donalffons/opencascade.js).
help.autodesk.com und die OpenGeometry-Doku-Seite waren in dieser Umgebung nicht abrufbar. Geprüft wurde deshalb gegen die installierten Pakete.
