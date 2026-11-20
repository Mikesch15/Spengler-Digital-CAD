# Kernvergleich OpenCascade ↔ OpenGeometry (isolierter Machbarkeitstest)

Getrennter Testbereich. Die Anwendung (`src/`, `kern/`, `build.mjs`, Version 0.2) wird **nicht** verändert und nutzt nichts von hier.
Eigene `package.json`, eigene Abhängigkeiten; aus `kern/` werden nur `geometrie.js` und `materialien.js` gelesen (Spenglerlogik als Referenz).

| Datei | Inhalt |
|---|---|
| `kernschnittstelle.mjs` | Entwurf der gemeinsamen Kern-Schnittstelle (Einheiten mm/Grad, Fehlercodes) |
| `adapter/occt.mjs` | OpenCascade über replicad 1.2.1 + replicad-opencascadejs 1.2.1 |
| `adapter/opengeometry.mjs` | OpenGeometry 3.0.1 (rechnet intern in Metern) |
| `faelle.mjs` | Gemeinsame Testbeschreibung, Tests 1–7, Spengler-Querschnitte aus `kern/geometrie.js` |
| `run.mjs` | Führt alle Fälle mit beiden Kernen aus → `ergebnisse/messprotokoll.json` / `.csv`, STEP-Dateien |
| `abwicklung.mjs` | Teil D: Zuschnitt aus dem 3D-Körper ↔ eigene Abwicklungsrechnung → `ergebnisse/abwicklung.json` |
| `vorschau/` | Test 7 im Browser (Chromium): beide Kerne, Three.js-Darstellung, Picking → `ergebnisse/vorschau.png/.json` |
| `BERICHT.md` | Abschlussbericht mit Bewertung und Empfehlung |

## Installation und Start

```bash
cd tests/cad-kernel-comparison
npm install                 # replicad, replicad-opencascadejs, opengeometry, three 0.184 (nur hier)
npm test                    # run.mjs + abwicklung.mjs; Exitcode ≠ 0 bei neuen Fehlern
node run.mjs occt           # nur ein Kern
npm run vorschau            # Browser-Test: bündelt vorschau/ (esbuild aus dem Hauptprojekt) und prüft mit Playwright
```

Voraussetzungen: Node 22, für die Vorschau Playwright mit Chromium (`NODE_PATH` auf die globale Installation, falls nicht lokal).
`vorschau/dist/` (≈ 29 MB WASM) wird nicht eingecheckt.

## Bekannte, dokumentierte Grenzen (kein Testfehler)
OpenGeometry 3.0.1: keine Verrundung/Fase, kein Loft, keine NURBS, keine Schnittkurve, kein STEP-Import (als «nicht unterstützt»
markiert); Kegelsegment und Gehrungsverschnitt brechen mit `CoverageGap` ab (als bekannter Fehler im Test hinterlegt).
