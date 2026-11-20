# Phase A – Bestandsaufnahme, Inventar, Zielarchitektur, Migrationsplan

Stand 20.11.2026 · Branch `claude/tauri-windows-github-action-ltlved` · Commit-Basis `6c1c9e4`
In dieser Phase gibt es **keine produktiven Änderungen** (nur dieses Dokument).

## 1. Verifizierter Ausgangszustand

| Prüfung | Ergebnis |
|---|---|
| `npm test` (10 Testdateien in `test/`) | alle bestanden |
| `node build.mjs` | `index.html` 1327 KB, reproduzierbar (keine Git-Änderung nach dem Build) |
| GitHub Actions | `web.yml` (Tests, Build, Pages inkl. Vorschau je Branch), `windows-build.yml` (Tests, Tauri-NSIS-Installer; Release nur auf `main`) |
| Kernvergleich | `tests/cad-kernel-comparison/` (OCCT/replicad ↔ OpenGeometry). Ergebnis bestätigt: 47 Einträge, OCCT ohne Fehler |
| Bekannte Fehler vor Beginn | keine roten Tests. Funktionale Grenzen siehe Abschnitt 3 (keine neuen Fehler vermischt) |

Technik: JavaScript (ESM), three.js 0.160, three-bvh-csg 0.0.17, esbuild 0.25, Tauri 2 (`csp: null`), occt-import-js 0.0.23 (nur STEP → Netz), pdf.js 4.10.
Die Datei `index.html` ist alles in einem. Bei Bedarf geladen werden `dist/occt/` und `dist/pdfjs/`. Der Service Worker `web/sw.js` arbeitet «Netz zuerst», danach aus dem Cache.

### Geometrische Wahrheit heute
`regen()` (`src/cad.js` ≈ Z. 651) baut die Features der Zeitleiste der Reihe nach als **Three.js-Dreiecksnetze**. Boolesche Operationen laufen als Netz-CSG (three-bvh-csg).
Masse, Volumen, Messen, Kollision, Planansichten (`src/ansicht.js`, `src/plan.js`) und der STEP-Export (`kern/step.js`) beruhen auf Netzen.
**Ausnahme:** Blechprofile, Flächenblech und Abwicklung. Ihr Zuschnitt, die Biegungen und das DXF werden exakt in `kern/` gerechnet (reine Daten), nur der 3D-Körper ist ein Netz.

## 2. Modulübersicht

| Modul | Inhalt | Abhängig von |
|---|---|---|
| `kern/geometrie.js` | Biegerechnung (K-Faktor, Rückversatz, Umschlag, Rundung), Zuschnitt | – |
| `kern/materialien.js` | Materialien t/ri/k/Dichte, K-Faktor aus Probe, Lagerformate | – |
| `kern/profile.js` | Profilvorlagen, freies Profil | geometrie |
| `kern/flaechenblech.js` | Flächenblech, Kantenbausteine, Eckregeln (Gehrung/Schrägschnitt), Abwicklung | geometrie |
| `kern/details.js` | Kurzschrift, Details A–K | – |
| `kern/skizze.js`, `skizzenloeser.js`, `loeser.js`, `bedingungen.js` | Skizzengeometrie, Gleichungslöser, 17 Abhängigkeitsarten | – |
| `kern/ebenen.js` | 7 Arten Konstruktionsebenen | – |
| `kern/ausdruck.js` | Parameter und Formeln | – |
| `kern/zeichnung.js`, `dxf.js`, `dxflesen.js` | SVG-Zeichnungen, DXF schreiben/lesen | – |
| `kern/step.js` | STEP/STL **aus Dreiecken** | – |
| `kern/auftrag.js`, `zuschnitt.js` | Stückliste, Materialbedarf | – |
| `src/cad.js` (4138 Z.) | Oberfläche, Szene, `regen()`, alle Feature-Dialoge, Skizzenumgebung, Messen, Austausch | three, three-bvh-csg, kern/* |
| `src/plan.js` | Planblatt: Ansichten, Schnitte (Netz-CSG), Lupe, Bemassung, Druck | three, three-bvh-csg, ansicht |
| `src/ansicht.js` | Kanten aus Netzen, sichtbar/verdeckt per Tiefenpuffer | three |

Feature-Typen in der Zeitleiste: `ebene`, `achse`, `konpunkt`, `skizze`, `extrusion`, `drehung`, `sweep`, `loft`, `kantenrund`, `kanten3d`, `schale`, `kmuster`, `kspiegel`, `bewegen`, `import`, `bild`, `blech`, `vorlage`, `profil`, `flaeche` (→ `flaechenteil`), `kehle`, `detail` (veraltet, meldet Fehler).

## 3. Inventar nach Auftrag (Kapitel 4)

Legende: **V** vorhanden · **T** teilweise · **F** fehlt · **X** fehlerhaft bzw. geometrisch nicht belastbar (Netz).

### 4.1 Oberfläche
| Punkt | Stand | Bemerkung |
|---|---|---|
| Werkzeugleiste mit Gruppen, Browser/Zeitleiste, Dialoge im 3D-Raum | V | |
| Arbeitsbereiche (Konstruktion, Blech, Skizze, Plan) | T | Gruppen im Menü, keine getrennten Umgebungen; Messen als Werkzeug |
| Anpassbare Werkzeugleisten | F | |
| Tastenkürzel | V | Kurzanleitung vorhanden |
| Befehlssuche | F | |
| Undo/Redo | V | Projekt-Schnappschüsse |
| Speichern, automatisch wiederherstellen | V | `localStorage` + Datei `.sdcad`; kein Versionsverlauf (F) |
| Vorlagen für Spenglerarbeiten | V | Profilvorlagen, Bausteine |
| Einheiten | T | nur mm |
| Formeln/Parameter | V | `kern/ausdruck.js` |
| Fang, Raster, Ebenen, Achsen, Punkte | V | |
| Standardansichten | T | vorn/oben/seitlich vorhanden. Isometrisch nur im Plan, gespeicherte Ansichten fehlen (F) |
| Drahtmodell / Transparenz / verdeckte Kanten im Viewport | T | Transparenz und Schnittebene vorhanden, Drahtmodell fehlt (F) |

### 4.2 Skizzen
| Punkt | Stand |
|---|---|
| Linie, Rechteck (3 Arten), Kreis (3 Arten), Bögen, Polygon, Langloch, Punkt, Ellipse, Spline, Text | V |
| Abrunden, Versatz, Spiegeln, Stutzen, Dehnen, Trennen, Muster, Projizieren | V |
| 17 Abhängigkeiten inkl. tangential, konzentrisch, symmetrisch, Mittelpunkt, gleich, fix | V |
| Bemassung treibend, nachträglich ändern | V |
| Freiheitsgrad-Anzeige | T (Analyse vorhanden; Anzeige vereinfacht) |
| Skizze auf Ebenen und Flächen | V |
| Elliptischer Bogen, Fase in der Skizze, Konstruktionslinien | T |

### 4.3 Volumenmodellierung
| Punkt | Stand | Bemerkung |
|---|---|---|
| Extrusion neu/verbinden/ausschneiden/schneiden | V/X | Boolesch per Netz-CSG |
| Drehung, Sweep, Loft (2–3 Profile) | V/X | Netz |
| Abrunden/Fasen an Extrusion bzw. angeklickten Kanten | T/X | an Netzen, Kanten über Koordinaten wiedergefunden |
| Schale, Muster, Spiegeln, Bewegen | V/X | Netz |
| Bohrung, Gewinde, Entformung, Rippe, Teilen, Flächen-Versatz/Trimmen | F | |
| Referenzebenen, Achsen, Punkte | V | |
| Feature bearbeiten, Fehlerzustand in der Zeitleiste, Unterdrücken, Zurückrollen | V | |
| Direktmodellierung | F | |

### 4.4 Baugruppen
Komponenten mit Lage (verschieben/drehen) und Kollisionsprüfung (Netz) sind vorhanden (V/X). Gelenke, Abhängigkeiten zwischen Komponenten und Explosion fehlen (F). Die Stückliste mit Menge und Material ist da (V).

### 4.5 Blech/Spengler (höchste Priorität)
| Punkt | Stand | Bemerkung |
|---|---|---|
| Materialbibliothek, eigene Materialien, K-Faktor aus Probebiegung | V | |
| Blechprofil (Vorlage, frei, aus Linienzug), Abkantliste, Anschlag A/B | V | Rechnung exakt in `kern/` |
| Flächenblech mit Kantenbausteinen, Kurzschrift, Baustein-Editor | V | |
| Gehrung / schräger Saumanschnitt, Abwicklung = 3D | V | exakt in `kern/`, 3D als Netz |
| Umschlag, Stehfalz, Doppelfalz als Bausteine | V | |
| Lasche an 3D-Kante, Kehle/Grat | T | in `src/cad.js`, nicht in `kern/` getestet |
| Zylinder-/Kegelabwicklung | **F** | im Kernvergleich nur als Testformel |
| Sicken, Eckfreistiche, Übergänge Rund-Eckig | F | |
| Erkennen nicht abwickelbarer Flächen | F | |
| DXF mit Layern | T | Kontur und Biegelinien. Layer-Satz noch vereinfacht |
| Rinnen, Einlauf, Kamin, Lukarne usw. als Werkzeuge | T | über Bausteine/Profile möglich, keine eigenen Werkzeuge |

### 4.6 Zeichnungen
| Punkt | Stand | Bemerkung |
|---|---|---|
| Blatt A4/A3, Schriftfeld, Druck/PDF über den Browser | V | |
| Ansichten mit verdeckten Kanten | V/X | aus Netzen, Tiefenpuffer |
| Schnittansicht mit Schraffur, Detailausschnitt | V/X | Netz-CSG |
| Bemassung (linear, automatisch) | T | Radius-, Winkel- und Durchmessermasse in der Skizze, im Plan teilweise |
| Werkstattblatt mit Abwicklung, Biegefolge | V | exakt aus `kern/` |
| Mittellinien, Hilfs- und Projektionsansichten, mehrere Schnitte mit Kennzeichnung | T/F | |

### 4.7 Messen
Abstand und Fang gibt es (V/X, am Netz). Volumen und Fläche liefert die Werkstatt für Blech exakt (T). Schwerpunkt, Winkel zwischen Flächen, Wandstärke und Gültigkeitsprüfung fehlen (F).

### 4.8 Austausch
| Format | Stand |
|---|---|
| Projektdatei `.sdcad` mit Historie | V |
| STEP-Export | **X** (aus Dreiecken, gekrümmte Flächen facettiert) |
| STEP-Import | **X** (nur Netz) |
| STL Export/Import | V |
| DXF Abwicklung / DXF-Import in Skizze | V |
| PDF über Druck, SVG | V |
| 3MF | F |

## 4. Risiken

1. **WASM-Grösse:** 22,9 MB roh, 7,2 MB gzip. Das bedeutet lange Erstladezeit auf dem Handy und einen grossen Offline-Cache. → Laden nur bei Bedarf, im Worker, mit Fortschrittsanzeige. Die App bleibt ohne Kern bedienbar.
2. **Tauri/WebView2 unter Windows nicht nachgewiesen.** → Pflichtnachweis in Phase B (eigene Probe-App in GitHub Actions).
3. **Speicher:** replicad «verbraucht» Eingabeformen, OCCT-Objekte müssen mit `delete()` freigegeben werden → Handle-Verwaltung und Lecktest.
4. **Stabile Topologie-IDs:** OCCT hat kein persistentes Benennen («topological naming»). → geometrische Signaturen und Feature-Herkunft. Grenzen werden dokumentiert.
5. **`src/cad.js` ist monolithisch** (4138 Z.). Migrieren geht nur Feature für Feature hinter einem Schalter.
6. **Ein Maintainer bei replicad.** → Die Adapter-Schnittstelle kapselt das. Rohe OCCT-Aufrufe sind möglich.
7. **Lizenz (LGPL-2.1, OCCT):** Die WASM-Datei muss separat und austauschbar ausgeliefert werden, mit Lizenztexten und Quellbezug.
8. **three.js 0.160** genügt für OCCT. Ein Upgrade ist für OCCT nicht nötig.

## 5. Zielarchitektur

```
src/cad.js (UI) ──► kern/cad/klient.js ──postMessage──► kern/cad/worker.js ──► kern/cad/occt.js (einziger Ort mit replicad/OCCT)
                     (Promise, Timeout,                  (lazy WASM, Handles)      │
                      Abbruch, Fallback)                                            ├─ kern/cad/tessellierung.js (Netz + Flächen-/Kanten-IDs)
                                                                                    └─ kern/cad/topologie.js (Signaturen, stabile Referenzen)
kern/cad/schnittstelle.js : Einheiten, Fehlercodes, Kommandoformat (reine Daten)
kern/cad/blech.js         : Spengler → Querschnitte/Bauanweisungen (rein, ohne Kern; nutzt kern/geometrie.js)
```
- Die UI hält nur **Daten**: Kommandos, Handle-IDs, Netze und Topologie-Referenzen. Sie hält nie OCCT-Objekte.
- Ein **Schalter** `einst.kern = "netz" | "occt"` (Standard «netz» = Version 0.2). Fällt der Kern aus, gilt automatisch wieder «netz» mit Meldung.
- Spenglerlogik bleibt in `kern/*.js` rein und wird gegen den Kern gegengeprüft (V = t·A_Mitte, Abwicklung = 3D).

## 6. Migrationsplan (Reihenfolge aus Auftrag 5.4, mit Abnahme)

| Schritt | Inhalt | Abnahme |
|---|---|---|
| B | Kern in Node, Browser-Worker, Edge und Tauri/WebView2 (Windows), Speicher, Lizenzen | Referenztests grün, Windows-Probe grün |
| C1 | Schalter und Worker in der App: Blechprofile und Vorlagen als B-Rep, STEP-Export exakt | Netz und B-Rep liefern dieselben Masse, 0.2 unverändert bei «netz» |
| C2 | Extrusion, Drehung, Boolesch, Sweep, Loft, Abrunden/Fasen, Schale über den Kern | Volumen gegen analytische Werte |
| D | Flächenblech/Kantenbausteine als B-Rep, Zylinder-/Kegelabwicklung in `kern/`, Abwickelbarkeitsprüfung, DXF-Layer | Referenzteile, Abwicklung = 3D |
| E | Planansichten/Schnitte aus exakten Kanten (HLR), Masse aus Topologie | Projektionen gegen bekannte Kanten |
| F | STEP-Import als B-Rep, 3MF, Messen (Schwerpunkt, Winkel, Gültigkeit), Baugruppen | Roundtrip-Tests |
| G | Regression, Windows-Build, Offline, Mobile | Release-Notizen |

Alter Netz-Code wird erst entfernt, wenn die jeweilige Funktion migriert und regressionsgetestet ist.
