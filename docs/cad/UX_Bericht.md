# UX-Professionalisierung – Abschlussbericht

Branch: `ux/professionalisierung` (Basis `main` 75d83be). Es wurde **nicht** auf `main` veröffentlicht: Ein Merge löst ein Windows-Release mit Auto-Update aus und liegt in der Entscheidung des Besitzers.

## 1. Zusammenfassung
Die Oberfläche wurde gezielt neu organisiert, ohne CAD-Kern, Geometrie, Datenformate oder Build zu verändern. Kernpunkte: angedockte Dialoge/Assistenten, Befehlssuche mit «zuletzt benutzt», verstellbares Arbeitsbereich-Panel, durchgängiger Hell-/Dunkelmodus, Designsystem-Tokens, einheitliche Rückmeldungen, Tastatur-/Touch-/Stift-Prüfung, Responsive-Test über sechs Fenstergrössen.

## 2. Navigations- und Layoutkonzept
Siehe `UX_Konzept.md`. Kurz: 3D-Ansicht im Zentrum; rechts **eine** Spalte für das jeweils Wichtige (Teil/Auftrag, oder der aktive Dialog – bei Blechwerkzeugen mit Teil-Panel darunter, damit Zuschnitt/Abwicklung live sichtbar bleiben); Browser schwebend; Leiste gruppiert + Befehlssuche als vollständiger Zugang (skaliert mit dem Funktionsumfang: 90+ Werkzeuge, Suche statt Menüjagd). Smartphone quer: Dialog als Seitenleiste, hoch/Tablet: Bodensheet.

## 3. Überarbeitete Bereiche
- Dialogsystem (alle Feature-Dialoge): Docking, Schrittleiste, Zurück/Weiter/OK/Abbrechen/Löschen einheitlich, Esc/Enter.
- Schritt-Assistenten: Dach, Gebäude, Lukarne, Dachfenster/Kamin, Dachbleche, Vorlage, Blechprofil, Rundblech. Übrige Dialoge haben höchstens 8 Felder und bleiben einseitig (Vorgabe: einfache Werkzeuge nicht verkomplizieren).
- Navigation: Befehlssuche (Strg+K, «/», Knopf), zuletzt benutzte Befehle, «Arbeitsbereich zurücksetzen».
- Arbeitsbereich: verstellbare Spalte (260–720 px, gespeichert).
- Designsystem: Tokens für Abstände, Radien, Schriftgrössen, Schatten, Fokus, Warn-/Akzentfarben, Leiste/Glas/Meldung/Ansicht (je Hell/Dunkel).
- Rückmeldung: Statuszeile als Pille mit `aria-live`, Warnungen rot; Meldungen (`role=alert`, schliessbar, blockieren die Zeichenfläche nicht).
- Dunkelmodus: Leiste, Ansichtsknöpfe, Meldungen, 3D-Hintergrund, Einstellungen, Plan-Editor, Projekte, Hilfe, Ablage geprüft (Screenshots).
- Responsive: Leistenrand-Hinweis, Smartphone-quer-Layout, scrollbare Tabellen in Fenstern, Einstellungs-Register umbrechend.
- Tastatur: Sprunglink, Tab-Reihenfolge = DOM-Reihenfolge, Esc/Enter.

## 4. Bewusst unverändert
CAD-Kern, OCCT/Worker/WASM, Mesh-Fallbacks, Löser, Feature-/Zeitleistenstruktur und IDs, Projektdateien/Formate, Import/Export, Cloud/Projekte-Integration, Materialien/Vorlagen/Bausteine, Sicherung, Tastenkürzel, Maus-/Touch-/Stiftsteuerung, Plan-Modul (nur Grundstil der Eingabefelder), Tauri/Android-Hülle, Lizenz/Update.

## 5. Beim Test gefundene und behobene Fehler
- **Dunkelmodus** war im Bestand inkonsistent (weisse Leiste mit hellem Text, unlesbare Ansichtsknöpfe).
- **Regression auf `main`** (seit Commit 3ec760d): Der neue Fusspfeil der Extrusion fing Klicks bei der Flächenwahl in der Skizze ab (Test `flaechen.mjs` schlug fehl). Behoben auf dem Branch (Fusspfeil bei aktiver Flächenwahl ohne Trefferfläche).
- Angedocktes Dialog-Layout versteckte bei Blechwerkzeugen das Teil-Panel (Zuschnitt/DXF) → bleibt jetzt unter dem Dialog sichtbar (`rundblech.mjs`).
- Meldungen deckten die Zeichenfläche ab und fingen Klicks → klickdurchlässig.

## 6. Offene UX-Punkte / Einschränkungen
- Stift und Touch sind mit echten Eingabeereignissen (Chromium/CDP, `pointerType` touch/pen) geprüft, nicht auf echter Tablet-Hardware.
- Android-App: Build nur auf `main` (Workflow); die Web-Ressourcen sind dieselben wie in der geprüften Web-Version, ein Android-Build wurde hier nicht ausgeführt.
- Alt-CSS: grosse Teile nutzen weiterhin feste Werte; Radien, Schatten und Hauptfarben laufen über Tokens, der Rest ist visuell konsistent, aber nicht token-basiert.
- Kein Vollumbau der Leiste: die gruppierte Leiste blieb bewusst erhalten (bewährt, durch Suche ergänzt).
- Plan-Editor: zweizeilige Werkzeugleiste unverändert, Grundstil der Felder angeglichen.

## 7. Tests und CI
- `npm test` (Kern): grün.
- 43 Playwright-App-Tests (`tests/app-kern/*.mjs`): grün. Neu: `befehlssuche.mjs`, `assistent.mjs`, `responsive.mjs` (6 Fenstergrössen × Hell/Dunkel, ~90 Prüfungen), `eingabegeraete.mjs` (Touch/Stift), `projektdatei.mjs` (Öffnen/Neustart), `skizzenansicht.mjs` u. a.
- CI auf dem Branch: «Web-Version» und «Windows-Installer» (Tauri/WebView2) erfolgreich (Runs 197–200 für die ersten Commits; Lauf zum letzten Commit siehe GitHub Actions).
- Exakter CAD-Kern ein/aus: `pruefen.mjs`, `rundblech.mjs` (Kern netz/occt), `detail3d.mjs` grün.

## 8. Screenshots und Commits
Vorher/Nachher: `docs/cad/ux/vorher/`, `docs/cad/ux/nachher/`. Commits: `git log main..ux/professionalisierung`.


## Nachtrag: Kontextleiste (Branch `ux/kontextaktionen`)
Das Programm erkennt jetzt, was gewählt ist, und bietet passende nächste Werkzeuge an (Details und Tabelle: `UX_Konzept.md`).
- **Skizzen** sind im 3D anklickbar (Fläche oder Linie) und nach «Skizze beenden» gewählt: Extrudieren, Flächenblech, Drehen, Dach darauf; offener Linienzug: Blechprofil, Sweep.
- **Bleche** (Flächenblech, Blechprofil, Vorlage, Freies Profil): Flansch, Umschlag, Kantenbaustein, Abwickeln; das Kanten-Werkzeug übernimmt das gewählte Blech.
- **Körper/Kante/Fläche:** Kante anklicken → Abrunden/Fasen mit dieser Kante; Fläche anklicken → Skizze auf Fläche, Blech auf Fläche.
- **Dach:** Dachbleche, Fenster/Kamin, Lukarne, Ziegel eindecken (gewähltes Dach vorbelegt). **Ebene:** Skizze auf Ebene.
- Ableitungen: Skizze auf Körperfläche → Extrusion schlägt «Vereinigen» vor; Dialoge übernehmen gewählte Skizze/Dach; Doppelklick = Bearbeiten; «Mehr …» öffnet die Befehlssuche.
- Tests: neu `kontext.mjs` (7 Szenarien), alle 45 App-Test-Dateien und `npm test` grün.
- Bekannte Grenze: Beim Anklicken einer *Kante eines Flächenblechs* wird das Blech (nicht die einzelne Kante) vorgewählt; die Kante wählt man danach im Kanten-Werkzeug.
