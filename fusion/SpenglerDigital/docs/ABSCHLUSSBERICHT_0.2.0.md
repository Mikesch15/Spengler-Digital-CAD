# Abschlussbericht – Spengler Digital CAD, Fusion-Add-in 0.2.0

Stand 29.10.2026 · Branch `claude/new-session-ux68bs` (Repo Spengler-Digital-CAD, aufgebaut auf `claude/tauri-windows-github-action-ltlved`)

## 1. Ist-Zustand vor der Arbeit (Bestandsaufnahme)

| Quelle | Befund |
|---|---|
| Repo `Spengler-Digital-CAD`, `main` | nur `README.md` (Initial commit) |
| Branch `claude/tauri-windows-github-action-ltlved` | eigentliche CAD-App (JS/Three.js/Tauri, `kern/` mit Tests) und Fusion-Prototyp `fusion/SpenglerDigital` (Stand e8eea76) |
| Hochgeladenes ZIP | Prototyp 0.1.2, eine Version ÄLTER als der Branch (Saum-Aufruf mit Argumenten statt ohne) |
| Prototyp 0.1 | ein Befehl «Kantenbaustein», 16 fest eingebaute Bausteine (Ortgang, Doppelstehfalz …), Aussenkante = «am weitesten entfernte parallele Kante», Probing der Preview-API, Protokoll im Add-in-Ordner |
| Zuschnitt der App | `Spengler-Digital-V1/js/29-einlaufblech-aufnahme.js` (Packrechnung), `js/33-zuschnitt.js` (Darstellung/Bilanz), `js/42-reste.js` (Restelager) |
| CAD-Kern | `kern/geometrie.js` (Biegerechnung), `kern/details.js` (Kurzschrift), `kern/zuschnitt.js` (einfache Tafelbelegung), `kern/materialien.js` |
| Fusion-API-Doku | `help.autodesk.com` aus der Sandbox **nicht erreichbar** (DNS gesperrt). Bestätigt per Websuche nur: EdgeFlangeInput ist «Preview», createEdgeFlangeInput(edges, height). Alle übrigen Aufrufe stammen aus bekannter, stabiler API (Revolve, Sketch, ExportManager, ImportManager, Attributes, Palettes, findEntityByToken) – nicht live verifiziert. |
| Fusion | in der Sandbox nicht verfügbar → kein einziger Fusion-Live-Test möglich |

## 2. Erstellte/geänderte Dateien

Alles unter `fusion/SpenglerDigital/` (ersetzt den Prototyp, gleiche Add-in-ID):

- `SpenglerDigital.py`, `SpenglerDigital.manifest` (0.2.0), `README.md` (Installation)
- `spengler_cad/core/` units, expressions, short_syntax, bend_geometry, models, validation, template_engine, operation_plan
- `spengler_cad/storage/` paths, json_store, template_repository, material_library, settings_service, backup_service, migration_service
- `spengler_cad/manufacturing/` nesting (Port der App), material_calculator, dxf_writer, workshop_sheet
- `spengler_cad/forming/forming.py`, `spengler_cad/details/` detail_validation, frames
- `spengler_cad/geometry/` fusion_adapter, edge_resolver
- `spengler_cad/diagnostics/` logger, fusion_capabilities, selftest
- `spengler_cad/ui/` help_content, palette_backend; `palette/vorlagen.html`, `palette/vorlagen.js`
- `spengler_cad/commands/` base, command_registry, edge_apply_command, detail_generator_command, forming_command, export_command, settings_command
- `assets/logo/` Original-Logo + 256/64/32 px, `assets/icons/` 16/32 px (+@2x) – aus dem gelieferten Bild skaliert, nicht verändert
- `docs/Benutzerhandbuch.md` + `.pdf` (7 Seiten, geprüft lesbar), `docs/handbuch_pdf.py`, dieser Bericht
- `tests/` 9 Testdateien, `fixtures/` (Referenzfälle aus JS + Erzeugerskripte, Prototyp-Bausteine als TESTDATEN), `fusion_stub/` (Attrappe), `fusion/LIVE_TESTS.md`
- entfernt: `kurzschrift.py` (mit eingebauten Bausteinen), `LIESMICH.md`; geändert: `fusion/test_kurzschrift.py` (nutzt neuen Kern)

Abweichung von der Ziel-Ordnerstruktur: ein Paket `spengler_cad/` statt Ordnern `core/`, `settings/` … direkt im Add-in – Fusion lädt alle Add-ins in EINEN Python-Prozess, Modulnamen wie `core` oder `settings` würden mit anderen Add-ins kollidieren. `settings/` heisst `storage/`. Kleine Module wurden zusammengelegt (z. B. flange/hem/cut builder → fusion_adapter; stretch/shrink → forming), damit keine leeren Hüllen entstehen.

## 3. Wiederverwendete bestehende Funktionen

| Bestehend | Übernommen als |
|---|---|
| `kern/geometrie.js` berechne/polylinie/kontur | `core/bend_geometry.py` (1:1-Port, gegen JS-Referenz getestet) |
| Kurzschrift aus Prototyp/`kern/details.js` | `core/short_syntax.py` (+ Parameter/Ausdrücke), Prototyp-API `schritte()` kompatibel |
| `js/29` ebaStreifenJeAbschnitt, ebaRestBreite, ebaVerteile, ebaPackeInStreifen, ebaPackeMehrereAbschnitte, ebaFormatZeilen/ebaFormatPlan | `manufacturing/nesting.py` (Logik 1:1, gegen Ausgaben des echten JS getestet) |
| `kern/dxf.js` (R12, Layer ZUSCHNITT/BIEGELINIEN/TEXT, Umlaute) | `manufacturing/dxf_writer.py` |
| Prototyp: Probing der Preview-API, Saum-Varianten (beide Stände) | `geometry/fusion_adapter.py` |

**Nicht übernommen:** Rollenmischung (ebaRollenMischung), Mischung verschiedener Breiten (ebaMischeAbschnitte), Teilen zu langer Stücke (ebaBlecheGeteilt), Restelager (js/42), Materialbilanz-Darstellung (js/33). Fest eingebaute Materialien/Lagerformate aus `kern/materialien.js` bewusst NICHT übernommen (keine vorgegebenen Fertigungswerte).

## 4. Tatsächlich ausgeführte automatische Tests

`python3 tests/run_all.py` → **70 Tests, 0 Fehler, 0 Ausfälle, 0 übersprungen**; dazu `python3 fusion/test_kurzschrift.py` → bestanden; `pyflakes` ohne Befund.

| Datei | Inhalt |
|---|---|
| test_short_syntax | Prototyp-kompatibel, Fehler, Parameter/Ausdrücke, Rückumwandlung, alte Bausteine als Testdaten |
| test_geometrie | 5 Referenzfälle aus `kern/geometrie.js` (Zuschnitt, Biegepositionen, Endpunkt, Kontur), Fehlerfall, Einheiten |
| test_templates | leere System-/Benutzerbibliothek, keine Profile im Programmcode, Engine, ungültige Vorlagen (7 Fälle), Expertenmodus, Speichern/Version/Kopie/Umbenennen/Favorit/Kategorie, Löschen nur mit Bestätigung + Papierkorb, neuere Version unberührt, Export/Import, Projektbibliothek |
| test_operation_plan | gültiger Plan, 5 ungeeignete Kanten, Dicken-/Längenbereich, ohne Material/Kante, ohne K-Faktor, zu kurzer Schenkel |
| test_migrations | Migration ohne Datenverlust (alle Felder inkl. eigener), Fehler → keine Datei verändert, kritisch → Bestätigung, mehrstufig (Test-Migration 1→2), neuere Daten unberührt, defekte Datei bleibt, Sicherung/Wiederherstellung inkl. .f3d, Prüfsummen, Aufräumen, Datenordner nie im Add-in |
| test_nesting | 6 Packfälle + 2 Mehrfachabschnitt-Fälle + 5 Querfälle gegen echtes App-JS, Mauerabdeckungsfall 13'060 mm, Formatwahl, zu breit/zu lang, Rand/Fuge ohne Kollision, Kollisionserkennung, Drehen, SVG/CSV/DXF, Materialberechnung, DXF-Konturprüfung |
| test_forming | Scheibe/Kragen/Kegel, herstellbar nur mit eigenem Grenzwert, keine Einschnitte, Drehprofil, Werkstattblatt |
| test_validation | Materialprofile, Einstellungen, Detailvorlagen, Passung, Ausrichtungsmatrix |
| test_import_fusion | Syntax aller Dateien, Import aller 40+ Module, Start/Stop und Aufbau aller 7 Dialoge mit Fusion-ATTRAPPE |
| test_palette | Backend-Ablauf; **echte HTML-Palette in Chromium** (Playwright) gegen das Python-Backend: Material, Vorlage per Kurzschrift, Prüfen, Speichern, Expertenmodus (Tabelle, Umordnen), Version 2, Duplizieren, Löschen, ungültig abgelehnt, Einstellungen, Sicherung, Papierkorb, Hilfe. Fand und behob einen echten CSS-Fehler (Palette wäre im Expertenmodus leer gewesen). |

## 5. In Fusion getestete Funktionen

**Keine.** Fusion ist in der Entwicklungsumgebung nicht verfügbar.

## 6. Nicht ausführbare Tests

Alles, was Fusion braucht: Kantenauswahl, Flansch/Umschlag, Aussenkantenbestimmung, Rückbau bei Fehler, Vorschau, 3D-Detail-Export/-Import/Ausrichtung/Parameter, Drehkörper, Abwicklung, DXF der Abwicklung, Palette in Fusion, Werkzeugleiste. → gebündelt in `tests/fusion/LIVE_TESTS.md`; der eingebaute **Selbsttest** (Hilfe) prüft Einheiten, Drehkörper und den kompletten 3D-Detail-Weg automatisch in einem neuen Dokument.

## 7. Status der Funktionen

| Funktion | Status |
|---|---|
| Leere Bibliotheken, Vorlageneditor, Standard-/Expertenmodus (Palette) | automatisch getestet inkl. Browser; Fusion-Palettenbrücke nicht geprüft |
| Speicher, Versionen, Papierkorb, Import/Export, Sicherung, Migration | automatisch getestet |
| Bauplan, Kanteneignung, Werte-/Bereichsprüfung | automatisch getestet (mit Kantenbeschreibungen) |
| Kanten bearbeiten (Flansch/Umschlag in Fusion) | implementiert, **nicht in Fusion geprüft**; Preview-API-Namen gesucht |
| 3D-Detail erfassen/anwenden | implementiert, **nicht in Fusion geprüft**; Rechnung (Ausrichtung, Passung) getestet |
| Rundblech: Beurteilung | getestet; Drehkörper **nicht in Fusion geprüft** |
| Durchgehender Falz an runden Rändern als Fusion-Blech | **nicht implementiert** (Fusion-Flansch nur an geraden Kanten) – Ersatz: Drehkörper + Beurteilung |
| Abwicklung, DXF der Abwicklung | implementiert über Fusion, **nicht geprüft** |
| Fertigungszeichnung | Fusion-Zeichnung **nicht** implementiert (keine verlässliche API); Werkstattblatt (HTML) getestet |
| Zuschnittoptimierung, Material | getestet (Port der App + Erweiterungen) |
| Eigene Freistellungen/Ausschnitte | **nicht implementiert** (Fusion-Blechregel macht Ecken) |

## 8. Festgestellte bzw. zu erwartende Fusion-API-Grenzen

- Blech-API (EdgeFlange, Hem) ist «Preview»; Eigenschaftsnamen unbekannt → Probing, Abbruch statt falscher Werte.
- Flansche nur an geraden Kanten.
- Keine Fusion-Transaktion per API; Rückbau durch Löschen der erzeugten Features, Fusion fasst den Befehl als einen Rückgängig-Schritt.
- Zeichnungen per API nicht zuverlässig erzeugbar.
- Importierte Benutzerparameter: Verhalten (Umbenennung bei Namenskonflikt) unbekannt → wird gemeldet.

## 9. Lieferung

- Installationspaket: `SpenglerDigitalCAD_0.2.0.zip` (nicht im Repo, `fusion/*.zip` ist ignoriert; als Datei geliefert)
- PDF: `fusion/SpenglerDigital/docs/Benutzerhandbuch.pdf`
- Installation/Start/Sicherung: `README.md` und Handbuch Kapitel 1, 14, 15

## 10. Nächste Live-Tests (kurz)

Siehe `tests/fusion/LIVE_TESTS.md` – Blöcke A–E, ca. 20 Minuten; danach Protokoll `…/SpenglerDigitalCAD/protokoll/spengler_cad.log` schicken.

## Nachtrag 0.2.1 – K-Faktor aus Probebiegung

Port von `kFaktorAusProbe` (kern/materialien.js) als `core/bend_geometry.k_faktor_aus_probe`; Palette → Materialprofil: Zuschnitt, a, b →
«K-Faktor berechnen» → «In K-Faktor übernehmen» (nur bei 0.1–0.6). Tests: Rückrechnung wie test/kern.test.js (k = 0.33/0.4/0.45),
Fehlerfälle, Backend, Browserablauf. 71 Tests bestanden. In Fusion nicht geprüft (reine Palette/Rechnung, keine Fusion-Geometrie).

## Nachtrag 0.3.0 – Vorschau, Werkstattblatt, Stückliste, Etiketten, Testanleitung

- Vorlagen-Vorschau (Palette, Liste + Editor, live): Querschnitt mit Standardwerten; `manufacturing/drawing.py` = Port von
  profilSvg/abwicklungSvg (kern/zeichnung.js); Biegerechnung liefert jetzt auch die Schenkelbeschriftungen (gegen JS-Referenz geprüft).
- Werkstattblatt: Querschnitt mit Massen, Abwicklung der Kante mit Biegelinien, Teilenummer, Objekt/Auftrag.
- Befehl «Stückliste & Zuschnitt» (vorher «Material & Zuschnitt»): Teilenummern als Körper-Attribut (nächste freie Nummer im Dokument),
  Stückliste CSV/HTML (Port kern/auftrag.js; echte Abwicklungsfläche bevorzugt), Etiketten-HTML im A4-Bogenformat (Einstellungen,
  Prüfung «passt auf A4» wie im CAD-Programm).
- `docs/Testanleitung.md/.pdf`: Live-Test zum Abhaken (Blöcke 0–11), ersetzt die kurze Liste.
- Tests: 79 automatische Tests bestanden (neu: test_parts_list, erweiterter Palette-/Browsertest). In Fusion nicht geprüft:
  Teilenummern-Attribute, Befehl «Stückliste & Zuschnitt», Werkstattblatt aus echten Bauteilen.

## Nachtrag 0.3.1 – Korrekturen aus dem ersten Live-Test (29.10.2026, Fusion 2706.1.17)

Ergebnis Live-Test Schritte 1–3: Start ✓, alle 9 API-Fähigkeiten ✓, Selbsttest ✓ (Einheiten, Drehkörper Ø 200.70 mm,
3D-Detail Export/Import/Ausrichtung (0, 100, 0) mm). Damit erstmals IN FUSION bestätigt: Drehkörper, .f3d-Export/-Import,
Ausrichtung per Matrix, Benutzerparameter setzen, Attribute, Fähigkeitsprüfung, Werkzeugleiste.

Korrigiert:
- Palette öffnete nicht («ERR_INVALID_URL», file:///C:/%5CUsers…): HTML-Pfad wird jetzt als file:-URI übergeben.
- 3D-Detail: Fusion benennt importierte Benutzerparameter bei Namensgleichheit um (SD_H → SD_H_1). Bisher wäre der VORHANDENE
  Parameter verändert worden (falsches Detail). Jetzt werden nur die beim Import neu entstandenen Parameter gesetzt
  (`parameter_zuordnen`), Umbenennungen werden gemeldet, Mehrdeutiges bleibt offen statt geraten.

## Nachtrag 0.3.2 – Update wurde nicht geladen

Zweiter Live-Test: Selbsttest und Palette zeigten noch den Stand 0.3.0. Ursache: Fusion hält geladene Python-Module über
Stoppen/Ausführen im Speicher. `run()` entfernt jetzt alle `spengler_cad`-Module vor dem Laden; Fähigkeiten-Dialog und Selbsttest
zeigen Versionsnummer und Ladeordner (Kontrolle, ob die richtigen Dateien geladen sind).
