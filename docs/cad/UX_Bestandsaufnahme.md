# UX-Bestandsaufnahme (Stand main 75d83be, 21.11.2026)

Grundlage: tatsächlicher Quellcode (`src/cad.html` ≈ 101 KB, `src/cad.js` ≈ 572 KB, `src/plan.js`, `src/ansicht.js`, `src/projekte.js`, `src/cloud.js`), Vorher-Screenshots in `docs/cad/ux/vorher/` (Desktop hell/dunkel, Tablet, Handy, Dach-Dialog).

## 1. Hauptbereiche

| Bereich | Ort | Befund |
|---|---|---|
| Kopfleiste / Werkzeugleiste | `nav#leiste` | Logo, danach Gruppen mit Einzelknöpfen und aufklappbaren Menüs (`.klapp` → `.klappmenue`): Körper, Blech, Dach, Kanten, Ändern, Prüfen, Datei, Einfügen, Werkstatt. 92 Werkzeugknöpfe (`.wz`). Skizzenleiste (`#gSkizze`) ersetzt bei aktiver Skizze die Hauptgruppe. |
| Browser (Modellbaum) | `aside.browser` | Überlagert die 3D-Ansicht oben links (Desktop, halbtransparent); auf kleinen Displays unter der Ansicht. Einklappbar. |
| 3D-Ansicht | `section#ansicht` | Canvas, ViewCube, Ansichtsknöpfe, Status, Fangzeichen, Kantenleiste, Layerbox, Eingabezeile (L/∠), Masslabels. |
| Teil / Auftrag | `aside.werkstatt` | Register «Teil» (Abwicklung, Biegetabelle, Holz-/Mengenliste, Etikett) und «Auftrag» (App-Projekt, Objekt, Nr.). Rechts, 300 px, einklappbar. |
| Zeitleiste | `footer.zeitleiste` | Feature-Chips, Rückgängig/Wiederholen, «Letzten Schritt löschen». |
| Dialoge | `#dialog` | Ein gemeinsamer Dialog für alle Features (Felder, Info, OK/Abbrechen/Löschen) – seit dieser Arbeit mit Schritt-Assistent. |
| Modale Fenster | `#einst`, `#projekte`, `#ablage`, `#bEditor`, `#planEditor`, `#hilfe` | Einstellungen (Materialien, Dach, Lager, Etiketten …), Projekte, Cloud-Ablage, Baustein-Editor, Planblatt, Hilfe. |
| Plan | `src/plan.js` | Planblatt mit eigenem Editor (Ansichten, Details, Bemassung, Schriftfeld), Drucken/PDF/SVG. |
| 2D-Modus | `#w2D` | Zeichnen ohne Körper (Layer, Farben, Linienarten, DXF). |

## 2. Bedienung

- **Maus:** Mausrad = Zoom zur Oberfläche unter dem Zeiger; Rad gedrückt = Verschieben; Umschalt + Rad = Drehen (in der Skizze: nur Drehung in der Ebene); linke Taste wählt/zeichnet.
- **Touch/Stift:** ein Finger/Stift dreht, zwei Finger zoomen/verschieben (in der Skizze zeichnet der Stift).
- **Tastatur:** Strg+S/O/P/Z/Y/D, Entf, X (Hilfslinie), D (Bemassung), F1 Hilfe, Esc.
- **Ziehpfeile** im 3D-Raum für Masse (Extrusion, Blech, Dachfenster/Kamin/Lukarne).
- **Responsive:** Breakpoints 1000 px (einspaltig: Ansicht 60 vh, Browser/Werkstatt darunter, Dialog als Bodensheet), 800 px (Plan), 640 px (Anleitung), `pointer: coarse` (grössere Beschriftungen).

## 3. Bewertung und Probleme (P0 kritisch … P3 kosmetisch)

| Prio | Problem | Massnahme / Stand |
|---|---|---|
| P1 | Dialoge überdeckten die 3D-Ansicht (rechts oben, 330 px) – gerade bei Dach/Lukarne wird das Modell verdeckt. | **Erledigt:** Dialog ist am Desktop in der rechten Spalte angedockt, Teil/Auftrag weicht solange. |
| P1 | Funktionsumfang (92 Werkzeuge, 11 Menüs) nur über Menüs auffindbar; neue Nutzer kennen die Gruppen nicht. | **Erledigt:** Befehlssuche (Strg+K, «/», Knopf «Suchen») startet jedes Werkzeug über denselben Knopf. |
| P1 | Lange Dialoge (bis 40 Felder) auf einer Seite. | Erledigt für Dach, Gebäude, Lukarne, Dachfenster/Kamin, Dachbleche, Vorlage, Blechprofil, Rundblech (Schritt-Assistent); übrige Dialoge haben < 10 Felder. |
| P1 | Werkstatt-Panel: Tabellen (Holzliste, Mengen) werden bei 300 px abgeschnitten («MENG», «16 St»). | Offen → Konzept: Panelbreite verstellbar, Tabellen horizontal scrollbar. |
| P2 | Handy: Werkzeugleiste zeigt nur wenige Knöpfe, Rest nur durch Wischen erreichbar. | Befehlssuche als vollständiger Zugang; weiteres Konzept offen. |
| P2 | Mehrere aufeinanderfolgende CSS-/Override-Blöcke in `cad.html` (Zeilen 11–440+), Farben teilweise direkt (`rgb(...)`, `#...`) statt über Tokens. | Offen → Token-Erweiterung (Abstände, Radien, Schatten, Typografie). |
| P2 | Status- und Fehlermeldungen erscheinen an wechselnden Stellen (Statuszeile, Dialog-Info, Alerts). | Offen. |
| P2 | Fokus-/Tab-Reihenfolge, sichtbare Fokusringe nicht durchgängig definiert. | Offen. |
| P3 | Icons uneinheitlich in Strichstärke/Füllung (`.f`-Füllung nur teilweise). | Offen. |
| P3 | Hilfetexte in Dialogen teilweise sehr lang. | Offen. |

## 4. Technische Randbedingungen

Build: `node build.mjs` (esbuild bündelt `src/cad.js` samt `kern/` in `index.html`/`dist/`), Tests: `npm test` (Kern) + `tests/app-kern/*.mjs` (Playwright, Port 8797). Windows-Release (Tauri) wird bei Push auf `main` ausgelöst – das Redesign läuft deshalb auf dem Branch `ux/professionalisierung` ohne Release.
