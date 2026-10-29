# Übergabe: Spengler Digital CAD – Fusion-Add-in (Stand 29.10.2026, Version 0.4.2)

> Diese Datei ist für die Weitergabe an ein anderes KI-System (z. B. ChatGPT) gedacht. Sie ist in sich vollständig:
> Projektziel, Architektur, Datenmodelle, was funktioniert, was nur ohne Fusion geprüft ist, was fehlt, bekannte
> Unsicherheiten der Fusion-API, Testergebnisse und nächste Schritte. **Bitte keine Funktion als «fertig» behandeln, die
> hier nicht als LIVE (in Fusion geprüft) markiert ist.**

## A. Projekt in Kürze

- **Was:** Add-in für Autodesk Fusion (Python) für einen Schweizer Spenglerbetrieb: eigene Kantenvorlagen (Flansch-/
  Umschlagfolgen per «Kurzschrift» wie `90 25 U+ 7`), eigene 3D-Detailvorlagen, Rundbleche ohne Einschnitte,
  Abwicklung/DXF, Werkstattblatt, Stückliste/Etiketten, Material- und Zuschnittberechnung.
- **Vorgaben des Auftraggebers:** keine mitgelieferten Profile (Bibliothek beginnt leer), keine erfundenen Fertigungswerte,
  keine Schein-Funktionen, Benutzerdaten überleben Updates, nichts als funktionierend behaupten, was nicht in Fusion geprüft ist,
  deutsche Oberfläche, Antworten kurz.
- **Verwandte Systeme:** «Spengler-Digital-App» (Web-App, Vanilla JS, Supabase/PostgreSQL mit RLS je Firma) – aus ihr stammen die
  Zuschnittrechnung (`js/29-einlaufblech-aufnahme.js`) und die Anmeldung; «Spengler Digital CAD» (JS/Three.js/Tauri, `kern/`) – aus
  ihm stammen Biegerechnung (`kern/geometrie.js`), Kurzschrift, Zeichnungen, Stückliste, K-Faktor-Probe.
- **Quellcode:** GitHub `Mikesch15/Spengler-Digital-CAD`, Branch `claude/new-session-ux68bs`, Ordner `fusion/SpenglerDigital`.
- **Umgebung des Anwenders:** Windows, Fusion 2706.1.17. Add-in-Ordner `C:\Users\Mike\SpenglerDigital`, Benutzerdaten
  `%APPDATA%\SpenglerDigitalCAD`.

## B. Architektur

```
SpenglerDigital/
  SpenglerDigital.py          Einstieg run()/stop(); entfernt beim Start alte spengler_cad-Module aus sys.modules
  SpenglerDigital.manifest
  spengler_cad/               EIN Paket (Modulnamen wie «core» würden in Fusions gemeinsamem Python kollidieren)
    core/        units, expressions (sicheres AST), short_syntax (Kurzschrift), bend_geometry (Port kern/geometrie.js),
                 models (dicts mit schemaVersion), validation, template_engine, operation_plan (Bauplan, Kanteneignung)
    geometry/    fusion_adapter.py – EINZIGE Stelle mit Fusion-Geometrieaufrufen; edge_resolver.py (entityToken)
    details/     detail_validation (Passung, Parameterzuordnung), frames (4×4-Ausrichtung T = Ziel · Anker⁻¹)
    forming/     forming.py (Scheibe/Kragen/Kegel, stauchen/strecken, herstellbar nur mit eigenem Grenzwert)
    manufacturing/ nesting (Port js/29), material_calculator, dxf_writer (R12), drawing (Port kern/zeichnung.js),
                 workshop_sheet (HTML), parts_list (Stückliste, Etiketten)
    storage/     paths, json_store (atomar), template_repository, material_library, settings_service,
                 backup_service (ZIP + sha256), migration_service, cloud_client (Supabase REST via urllib),
                 sync_service (Abgleich), updater (Updates aus der App)
    diagnostics/ logger, fusion_capabilities, selftest (läuft IN Fusion in neuem Dokument)
    ui/          help_content, palette_backend (Logik der HTML-Palette, ohne Fusion testbar)
    commands/    Fusion-Befehle: Kanten bearbeiten, 3D-Detail erfassen/anwenden, Rundblech, Abwicklung & DXF,
                 Stückliste & Zuschnitt, Vorlagen & Einstellungen (Palette), Hilfe
  palette/       vorlagen.html/.js (Vorlageneditor, Materialien, Einstellungen, Sicherung, Konto)
  supabase/      v_cad_addin_grundlagen.sql (eingespielt), rls_probe.sql
  tests/         121 Tests (unittest), fake_supabase.py (Nachbau), fusion_stub (Attrappe), Referenzfälle aus JS
  docs/          Benutzerhandbuch (md/pdf/html), Testanleitung, Anforderungsliste, Abschlussberichte
fusion/werkzeug/release_sql.py   Updates veröffentlichen (SQL für Supabase); fusion/releases/ Dateilisten
```

Wichtige Abläufe:
- **Kanten bearbeiten:** Auswahl → Kantenbeschreibung (Kurventyp, Länge, Dicke aus Blechregel, Aussenkante = eine Nachbarfläche
  hat Breite ≈ Dicke) → Bauplan (Fehler sperren OK) → Vorschau (`executePreview`, Fusion verwirft) → je Kante: entityToken
  neu auflösen → Schritt für Schritt Flansch/Umschlag → neue Aussenkante suchen (parallel, volle Länge, Abstand 0.3·L…L+2t+5 mm,
  mehrdeutig → Abbruch) → bei Fehler alle Schritte dieser Kante löschen → Körper neu auflösen und prüfen.
- **Preview-API:** Eigenschaftsnamen von `EdgeFlangeInput`/`HemFeatureInput` werden aus Listen gesucht (z. B. `flangeAngle`,
  `angle`, `setAngle`). Fehlt eine nötige Einstellung (Winkel ≠ 90°, Richtung, Radius, Saumlänge) → Abbruch, nie ein Ersatzwert.
- **Cloud:** Tabellen `cad_daten` (+ `cad_daten_versionen` per Trigger), Bucket `cad`, `cad_addin_releases`/`cad_addin_blobs`.
  RLS: `tenant_boundary_*` (RESTRICTIVE, `my_company_id()`) + `has_permission('vorlagen', 'view'|'edit')` (bestehendes Recht der
  App). Kein DELETE (Papierkorb über `geloescht`). Abgleich: lokal zuerst; Cloud-Spalte `version` = optimistische Sperre;
  Konflikt → App-Fassung gilt, lokale bleibt als Kopie «… (Konflikt TT.MM.)».
- **Updates:** Release = Dateiliste mit sha256; geladen werden nur abweichende Dateien aus `cad_addin_blobs`; vorher Daten- und
  Programmsicherung; Pfade ausserhalb der Programmdateien abgelehnt; Neustart des Add-ins nötig.


## C. Anforderungsliste mit Status

Stand 29.10.2026 · Programmstand 0.4.2 (geprüft wurde 0.4.0 inkl. der Korrekturen in 0.4.2) · Grundlage: Projektauftrag
«SPENGLER DIGITAL CAD – MASTER-AUFTRAG», Quellcode im Repo `Spengler-Digital-CAD`, Branch `claude/new-session-ux68bs`, Testanleitung.

### Statuswerte

| Kürzel | Bedeutung |
|---|---|
| **AUTO** | umgesetzt und automatisiert getestet (ohne Fusion; reine Rechnung/Datenlogik) |
| **LIVE** | in Fusion live getestet (vom Anwender, Fusion 2706.1.17, Windows) |
| **TEIL** | teilweise umgesetzt – oder Code vorhanden, aber die Ausführung in Fusion ist NICHT live geprüft |
| **NEIN** | nicht umgesetzt |

Regel: Eine Funktion, die Fusion-API-Aufrufe braucht, steht höchstens auf **TEIL**, solange sie nicht live geprüft ist –
auch wenn ihre Entscheidungslogik mit nachgebauten Fusion-Objekten getestet ist («Logik-Test»). Ein bestandener Test mit
Attrappe oder Nachbau beweist nur, dass das Add-in richtig entscheidet, nicht dass Fusion es so ausführt.

Live geprüft wurde bisher nur (Anwender, 29.10.2026): Start und Werkzeugleiste, Fähigkeitsprüfung (alle 9 API-Funktionen
vorhanden), Selbsttest (Einheiten 25 mm = 2.5 cm, Drehkörper Ø 200.70 mm, .f3d-Export/-Import, Ausrichtung per Matrix
(0, 100, 0) mm, Benutzerparameter setzen). Dabei gefunden und behoben: Palette-URL (0.3.1), Parameter-Umbenennung beim
Import (0.3.1), alter Code im Speicher nach Update (0.3.2). Die Palette selbst, alle Kantenbefehle, Abwicklung, DXF,
Konto/Abgleich und Updates sind in Fusion noch NICHT geprüft.

### 1–3 Arbeitsweise, Bestandsaufnahme, keine Vorlagen

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Zusammenhängendes Add-in statt Test-Add-ins | AUTO | ein Add-in, 8 Befehle; Start/Stop mit Attrappe getestet; Start **LIVE** |
| Repository/Prototyp/CAD-Logik/Zuschnitt analysiert | AUTO | Abschlussbericht 0.2.0 Kap. 1 |
| Fusion-API anhand Dokumentation geprüft | TEIL | help.autodesk.com in der Sandbox gesperrt; nur Suchergebnisse (EdgeFlangeInput = «Preview»). Eigenschaftsnamen von Flansch/Saum unbekannt |
| Produktive Vorlagenbibliothek beim ersten Start leer | AUTO | test_templates (System- und Benutzerbibliothek leer, keine Profile im Code) |
| Keine Standardmasse / Testdaten nur in Fixtures | AUTO | Prototyp-Bausteine nur `tests/fixtures/…TESTDATEN.json` |

### 4 Eigene parametrische 3D-Vorlagen

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Detail in Fusion modellieren, Anschlusskante + lokales KS festlegen, Variablen markieren, speichern (geführtes Authoring) | TEIL | Befehl «3D-Detail erfassen»; Rahmen-/Prüflogik AUTO; Ausführung in Fusion nicht live |
| Vorlage auf kompatible Kante anwenden, ausrichten, Variablen setzen | TEIL | Selbsttest **LIVE**: Export/Import/Ausrichtung/Parameter; Befehl «3D-Detail anwenden» selbst nicht live |
| Vorschau und Eignungsprüfung vor dem Anwenden | TEIL | Passungsprüfung AUTO (test_validation); Vorschau in Fusion nicht live |
| Bearbeitbare Fusion-Features / gültige Blechgeometrie im Zielbauteil | NEIN | Detail wird als eigene Komponente eingesetzt, NICHT mit dem Blechkörper vereinigt; keine Feature-Neuerzeugung |
| Kopieren, umbenennen, exportieren ohne Original zu ändern | AUTO | test_templates, test_cloud (Geometrie wird mitkopiert) |
| Unterscheidung fest/variabel/Referenzen/Version | AUTO | Datenmodell detailvorlage, test_validation |
| Keine Behauptung automatischer Parametrisierung | AUTO | Hilfetexte/Handbuch sagen das ausdrücklich |

### 5 Hauptmodule / Bedienung

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Eigene Gruppe in Fusion | LIVE | Befehle in Fusion erreichbar (Hilfe → Fähigkeiten/Selbsttest benutzt); Anordnung der 3 Gruppen nicht ausdrücklich bestätigt |
| A Kanten bearbeiten: Einzel-/Mehrfachauswahl, Vorlage, Parameter, Vorschau, ungeeignete Kanten, Ergebnisprüfung | TEIL | Bauplan/Eignung AUTO (test_operation_plan), Ablauf/Rückbau als Logik-Test; in Fusion nicht live |
| B 3D-Details anwenden | TEIL | siehe Kap. 4 |
| C Vorlagen verwalten (neu, bearbeiten, duplizieren, umbenennen, löschen, Kategorien, Favoriten, Import/Export, Versionen) | AUTO | test_templates, test_palette inkl. **Browsertest der echten Palette**; Palette in Fusion nicht live bestätigt |
| D Rundblech/Umformwerkzeuge | TEIL | Beurteilung AUTO; Drehkörper **LIVE** (Selbsttest); Falze an gekrümmten Rändern NEIN (Kap. 8) |
| E Abwicklung, DXF, Zeichnungen, Material, Zuschnitt | TEIL | siehe Kap. 10–12 |
| F Einstellungen, Backup/Restore, Hilfe | AUTO | test_migrations, test_validation, test_palette; Hilfe-Dialog in Fusion **LIVE** |
| Standard-/Expertenmodus mit derselben Engine | AUTO | template_engine; Browsertest Expertenmodus |

### 6 Geometrieadapter und Kanten-Engine

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Alle Fusion-Aufrufe in einem Adapter | AUTO | `geometry/fusion_adapter.py` (+ `edge_resolver.py`); UI ohne Geometrielogik |
| Kante analysieren / Eignung | TEIL | Logik-Test (Stirnfläche ≈ Dicke → Aussenkante); in Fusion nicht live |
| Kantenreferenz zuverlässig auflösen (entityToken, kein Raten) | TEIL | Logik-Test (0 oder 2 Treffer → Abbruch); Fusion-Verhalten nicht live |
| Flansch erzeugen | TEIL | Logik-Test: Werte/Einheiten, Abbruch wenn Winkel/Richtung/Radius nicht setzbar. **Eigenschaftsnamen der Preview-API und Höhenbezug (aussen/innen/Blechmitte) unbekannt – nicht live geprüft** |
| Umschlag erzeugen | TEIL | Logik-Test beider Aufrufformen; Fusion-Verhalten nicht live; Spalt = 2 × Radius ist eine Annahme |
| Neue Kante nach jedem Schritt bestimmen (nicht nur «am weitesten entfernt») | TEIL | Logik-Test: Parallelität, volle Länge, Abstandsfenster, Mehrdeutigkeit → Abbruch. Welche der beiden Endkanten (oben/unten) für Folgeschritte richtig ist, ist NICHT bewiesen |
| Ausschnitte/Freistellungen erzeugen | NEIN | Ecken/Freistellungen macht Fusion nach Blechregel |
| Abwicklung erstellen/aktualisieren | TEIL | Logik-Test Masse; `createFlatPattern` nicht live |
| Geometrie validieren | TEIL | Körper nach dem Bauen neu aufgelöst (Fix 0.4.2), `isValid`/`isSolid`; nicht live |
| Abbrechen/Rückgängig (Validieren → Plan → Vorschau → Bestätigung → Operation → Prüfung → Rückbau) | TEIL | Logik-Test Rückbau inkl. Meldung bei unvollständigem Rückbau (Fix 0.4.2); ein Rückgängig-Schritt je Befehl ist Fusion-Verhalten, nicht live |

### 7 Standard-/Expertenmodus, Vorlageneditor

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Standardmodus: Vorlage, Felder mit Einheiten, Warnungen | TEIL | Palette AUTO; Dialog «Kanten bearbeiten» in Fusion nicht live |
| Expertenmodus: Operationen hinzufügen/ändern/löschen/umordnen, Radien, Kurzschrift | AUTO | Browsertest; test_templates |
| Abhängigkeiten/Freistellungen/Parameterbeziehungen | TEIL | Ausdrücke mit Parametern und t/ri/k AUTO; Freistellungen NEIN |
| Versionierte strukturierte Vorlagen, Benutzer- und Projektbibliothek, Systemvorlagen leer | AUTO | test_templates |

### 8 Rundbleche, gekrümmte Ränder, Werkstattumformung

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| **Durchgehende Flansche/Umschläge/Einzel-/Doppelfalze an runden/gekrümmten Blechkanten ohne Einschnitte/Lappen** | **NEIN** | Fusion-Flansch nur an geraden Kanten. Ersatz: Scheibe mit aufgebogenem Rand und Kegel als **Drehkörper (kein Fusion-Blechkörper)**; kein Umschlag/Falz an gekrümmten Rändern, kein Anwenden auf bestehende gekrümmte Blechkanten |
| Fälle Scheibe / Kragen / Kegel unterscheiden | AUTO | test_forming |
| Fertigungsabsicht Stauchen/Strecken/manuell/Empfehlung | AUTO | test_forming |
| konstruierbar / abwickelbar / herstellbar getrennt | AUTO | herstellbar nur mit eigenem Grenzwert |
| Keine Einschnitte ohne Freigabe; warnen statt heimlich ändern | AUTO | es werden nie Einschnitte erzeugt |
| Umformzonen markieren | TEIL | als Radiusbereich im Text; nicht im Modell markiert |
| Drehkörper in Fusion | LIVE | Selbsttest Ø 200.70 mm; Befehl «Rundblech» selbst nicht live |

### 9 Doppelfalzabschluss als Benutzervorlage

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Kein mitgelieferter Doppelfalzabschluss | AUTO | |
| Eigenes 3D-Modell als Vorlage, Falzende erkennen, ausrichten, Variablen, Vorschau | TEIL | über 3D-Detail-Workflow (Kap. 4); Falzende-Erkennung = gerade Zielkante wählen; nicht live |
| Kollisionen prüfen | TEIL | nur Begrenzungsrahmen-Überschneidung, kein Volumentest |
| Ergebnis und Abwicklung prüfen | NEIN | Detail wird nicht mit Blech vereinigt, daher keine Abwicklung des Gesamtteils |

### 10 Abwicklung, DXF, Fertigungszeichnungen

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Fusion-Blechabwicklung bevorzugen, Status prüfen | TEIL | `createFlatPattern`/`flatPattern` nicht live; Masse-Logik AUTO (Fix 0.4.2: Lage unabhängig) |
| Abwickelbarkeit vs. werkstattgerechte Umformbarkeit | AUTO | Rundblech-Beurteilung |
| DXF der Abwicklung (Fusion-Exporter), Erfolg nur wenn Datei existiert | TEIL | Logik-Test «Fusion meldet Erfolg ohne Datei → Fehler»; Export selbst nicht live |
| Biegelinien auf separaten konfigurierbaren Layern | TEIL | Fusion-DXF: Layer bestimmt Fusion (nicht konfigurierbar); eigener Zuschnittplan-DXF: Layer konfigurierbar, mit ezdxf geprüft |
| Einheiten/Skalierung, Dateinamen, Einzel-/Sammelexport | TEIL | Zuschnittplan-DXF 1:1 mm mit ezdxf geprüft; Fusion-DXF nicht live |
| Konturen auf ungültige/doppelte Segmente prüfen | TEIL | Prüffunktion vorhanden und getestet, wird aber NICHT auf die Fusion-DXF angewendet |
| Zeichnungen automatisch aus Bauteilen | NEIN | Fusion-Zeichnungs-API nicht genutzt; stattdessen Werkstattblatt (HTML) |
| Werkstattblatt: Masse, Material, Dicke, Kennung, Biegehinweise | AUTO | test_forming/test_parts_list (Rechnung + HTML); aus echten Bauteilen nicht live |

### 11 Zuschnittoptimierung (Port der App, js/29)

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Bestehende Logik analysiert und portiert | AUTO | 13 Referenzfälle gegen das echte App-JavaScript identisch |
| Mehrere Teile gemeinsam, Formate, Material/Dicke, Teilekennzeichnung | AUTO | test_nesting, test_parts_list |
| Rotation nur wenn erlaubt | AUTO | Einstellung |
| Verschnitt/Materialverbrauch | AUTO | |
| Plan visualisieren/exportieren (SVG, CSV, DXF) | AUTO | DXF mit ezdxf geprüft |
| Überlappungen prüfen, Rand-/Mindestabstände | AUTO | |
| **Rollenmischung (ebaRollenMischung)** | **NEIN** | |
| **Mischen verschiedener Breiten im selben Abschnitt (ebaMischeAbschnitte, «Trittbrett»)** | **NEIN** | |
| **Zu lange Stücke mit Nahtüberlappung teilen (ebaBlecheGeteilt)** | **NEIN** | zu lange Stücke werden nur gemeldet |
| **Reststücke / Restelager (js/42, Vorabzug aus Resten)** | **NEIN** | |
| **Materialbilanz (Schnittfuge, verwertbare/zu kleine Reste, js/33)** | **NEIN** | |
| **Normlängen-Plan für Stangenware (raNormPlan, js/28)** | **NEIN** | |
| **Spaltband-/Coil-Vorrang beim Materialbedarf (kern/zuschnitt.js)** | **NEIN** | gewählt wird das Format mit der kleinsten Blechfläche |
| Echte Abwicklungskonturen statt Rechtecke | NEIN | Rechtecke (umschliessendes Rechteck) |

### 12 Material- und Zuschnittberechnung

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Benutzerdefinierte Materialprofile, keine erfundenen Werte | AUTO | Bibliothek leer; K-Faktor aus Probebiegung (Port kern/materialien.js) |
| Fläche, Teile, Verbrauch, Gewicht (Schätzung), Ausnutzung, Sammelübersicht | AUTO | test_nesting, test_parts_list |
| Aus echten Fusion-Abwicklungen | TEIL | nicht live |

### 13–15 Hilfe, PDF-Anleitung, Logo

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Kontexthilfe, Tooltips, deutsche Texte | AUTO | Hilfethemen im Browsertest; Hilfe-Dialog **LIVE** |
| PDF-Anleitung (16 Kapitel), erzeugt und lesbar | AUTO | per pdftotext/Seitenbild geprüft; HTML-Fassung für Updates |
| Logo unter assets/logo, Icons daraus | AUTO | Dateien erzeugt; ob die Symbole in Fusion richtig erscheinen, wurde nicht ausdrücklich bestätigt |

### 16 Updatesicherheit und Benutzerdaten

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Benutzerdaten ausserhalb des Programmordners | AUTO / LIVE | Ordner `%APPDATA%\SpenglerDigitalCAD` beim Anwender vorhanden |
| Updates überschreiben keine Benutzerdaten | AUTO | Updater schreibt nur in erlaubte Programmpfade (Pfadprüfung getestet) |
| Backup vor Migration, schemaVersion, Migration validiert, bei Fehler unverändert | AUTO | test_migrations (inkl. Gegenprobe «Datei unverändert») |
| Manuelles Backup/Restore | AUTO | test_migrations; Fix 0.4.2: Restore setzt Abgleichstand zurück (Gegenprobe: Test scheitert am alten Code) |
| Import/Export dokumentiertes Format | AUTO | Handbuch Kap. 14 |
| Neuere Versionen nicht verändern | AUTO | Vorlagen, Materialien, Einstellungen, Abgleich (Schutz 0.4.2) |
| Löschen nur mit Bestätigung | AUTO | Papierkorb |
| Vorlage ↔ erzeugtes Bauteil getrennt versioniert | TEIL | Attribut mit Vorlagen-ID/-Version am Feature; nicht live |
| Automatische Updates per Klick | TEIL | Updater AUTO (nur geänderte Dateien, sha256, Sicherung, Rückbau, Manipulation erkannt); Test-Update 0.4.1 liegt bereit; in Fusion nicht live |

### 17–21 Struktur, Datenmodelle, Tests, Logging, Geometriekontrolle

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Ordnerstruktur (angepasst: Paket `spengler_cad/`) | AUTO | Begründung im Abschlussbericht |
| Datenmodelle A–F mit schemaVersion | AUTO | `core/models.py` |
| Einheiten eindeutig, mm ↔ cm | AUTO / LIVE | test_geometrie; Selbsttest 25 mm = 2.5 cm **LIVE** |
| Tests ohne Fusion | AUTO | 121 Tests, siehe Abschlussbericht |
| Fusion-Integrationstests | TEIL | Selbsttest im Add-in (**LIVE**) + Testanleitung; Kantenbefehle offen |
| Diagnoseprotokoll (Version, Fusion-Version, Befehl, Vorlage, Fehler) | AUTO / LIVE | Protokolldatei beim Anwender vorhanden |
| Vorschau/Bestätigung, nicht raten, keine Einschnitte, keine automatischen Löschungen | TEIL | Logik AUTO; Vorschau in Fusion nicht live |

### Zusatz (vom Anwender beauftragt)

| Anforderung | Status | Nachweis / Bemerkung |
|---|---|---|
| Vorschaubild je Vorlage, Werkstattblatt mit Bemassung, Stückliste, Etiketten, Teilenummern | AUTO (Teilenummern TEIL) | test_parts_list, Browsertest; Teilenummern-Attribute nicht live |
| Anbindung Spengler-Digital-App: Konto, Abgleich, Rechte, Konflikte, offline | TEIL | gegen Supabase-Nachbau AUTO (18 Tests), Datenbankregeln **gegen die echte Datenbank** 13/13 geprüft; Anmeldung/Abgleich aus Fusion nicht live |
| Datenbankmigration eingespielt | AUTO | Probelauf + Nachprüfung in der echten Datenbank |

## D. Prüfbericht 0.4.0 → 0.4.2

Stand 29.10.2026 · Repo `Spengler-Digital-CAD`, Branch `claude/new-session-ux68bs`, Ordner `fusion/SpenglerDigital`
Anforderungsliste mit Status: `docs/ANFORDERUNGEN_STATUS.md` · Vorgeschichte: `docs/ABSCHLUSSBERICHT_0.2.0.md`

### 1. Was geprüft wurde

Quellcode aller Module, Testanleitung, ursprünglicher Projektauftrag. Schwerpunkt wie beauftragt: Flansch, Umschlag,
Vorschau, Kantenauflösung, Rückbau bei Fehlern, Abwicklung, DXF, Sicherungen, Updates, Cloud-Synchronisierung.
Benutzerdaten wurden nicht verändert, keine Funktion wurde entfernt.

### 2. Gefundene und behobene Fehler (0.4.2)

| # | Bereich | Fehler | Behebung | Nachweis |
|---|---|---|---|---|
| 1 | Abwicklung | Masse nur aus X/Y des Begrenzungsrahmens. Liegt die Abwicklung nicht in XY, wäre die Blechdicke als Breite gemeldet worden (Stückliste, Etiketten, Zuschnitt falsch) | alle drei Ausdehnungen, kleinste = Dicke | Test scheitert am alten Code (Gegenprobe) |
| 2 | Kanten bearbeiten | Ergebnisprüfung benutzte die Körper-Referenz von VOR dem Bauen; in Fusion wird sie oft ungültig → falsche Meldung «Körper ist ungültig» möglich | Körper über entityToken neu auflösen; nicht auffindbar → Hinweis statt falscher Meldung | Logik-Test; in Fusion nicht live |
| 3 | Rückbau | Schlug das Löschen der bereits erzeugten Schritte fehl, wurde trotzdem «entfernt» gemeldet | Rückbau-Ergebnis wird ausgewertet; sonst Meldung «nicht vollständig entfernt – Strg+Z» | Test scheitert am alten Code |
| 4 | Rückbau | Fehlermeldung nannte bei «neue Kante nicht gefunden» den falschen Schritt | Meldung «Nach Schritt n (Kante für Schritt n+1 suchen)» | Test scheitert am alten Code |
| 5 | Abgleich | Mitarbeiter ohne Änderungsrecht: bei Konflikt wurde die eigene lokale Änderung **überschrieben** (Datenverlust) | lokale Fassung bleibt als lokale Kopie | Test scheitert am alten Code |
| 6 | Sicherung/Abgleich | Nach dem Wiederherstellen einer alten Sicherung hätte der nächste Abgleich die neueren Fassungen **in der App überschrieben** | Abgleichstand wird beim Wiederherstellen verworfen → Konflikt-Kopie statt Überschreiben; kein Auto-Abgleich direkt nach dem Wiederherstellen | Test scheitert am alten Code |
| 7 | Updates | Zweites «Nach Updates suchen» ohne Neustart meldete «0 Dateien installiert» | Meldung «bereits installiert – Add-in neu starten» | Test: nach Installation nichts mehr nötig |
| 8 | Start | Abgleich/Update-Prüfung beim Start mit 15 s Zeitlimit je Anfrage → Fusion-Start konnte bei schlechtem Netz lange hängen | 6 s beim Start | Code-Durchsicht |
| – | Abgleich | (Schutz, kein nachgewiesener Fehler) Datensätze aus einer neueren Add-in-Version werden nie mit älteren Fassungen überschrieben | Schutzlogik | Test |

### 3. Geprüft, ohne Fehler gefunden – aber NICHT in Fusion bestätigt

- **Flansch:** Werte und Einheiten («25 mm», «45 deg») korrekt; fehlt in Fusion die Eigenschaft für Winkel ≠ 90°, Richtung «nach
  hinten» oder Radius, wird abgebrochen statt mit falschem Wert gebaut. **Offen:** tatsächliche Eigenschaftsnamen der
  Preview-API und der Höhenbezug von Fusion (aussen, innen oder Blechmitte – die Kurzschrift misst auf Blechmitte bis zur
  virtuellen Kante; Abweichung bis ca. t/2 + Radius möglich).
- **Umschlag:** beide Aufrufformen (ohne Argumente + Kante setzen; mit Kante als Argument) getestet; Spalt = 2 × Radius ist eine
  Annahme. **Offen:** Verhalten in Fusion.
- **Vorschau:** baut in `executePreview` dieselben Features, Fusion verwirft sie selbst; `isValidResult = False` erzwingt Neubau
  beim OK. **Offen:** in Fusion nicht gesehen.
- **Kantenauflösung:** entityToken; 0 oder mehrere Treffer → Abbruch. Neue Aussenkante: parallel, volle Länge, Abstandsfenster,
  Mehrdeutigkeit → Abbruch. **Offen:** welche der beiden Endkanten (Ober-/Unterseite) Fusion für Folgeschritte braucht.
- **DXF:** Zuschnittplan-DXF mit unabhängigem Leser (ezdxf 1.4.5) geprüft: R12, 0 Fehler, 1:1 in mm. Fusion-DXF der Abwicklung:
  Erfolg nur, wenn die Datei existiert (Logik-Test). **Offen:** Export in Fusion.
- **Sicherungen:** Prüfsummen, Rückbau bei Fehler, keine Wiederherstellung ohne Bestätigung – getestet.
- **Updates:** nur geänderte Dateien, sha256, Pfade ausserhalb des Programmordners abgelehnt, Manipulation erkannt, Daten- und
  Programmsicherung, Rückbau – getestet. **Offen:** in Fusion.
- **Cloud:** Datenbankregeln in der echten Datenbank 13/13 (Probe-Transaktion, zurückgenommen); Client gegen Nachbau.
  **Offen:** Anmeldung/Abgleich aus Fusion (aus der Sandbox ist Supabase per HTTPS nicht erreichbar).

### 4. Tatsächlich ausgeführte automatische Tests (29.10.2026)

Befehl: `python3 fusion/SpenglerDigital/tests/run_all.py` → **121 Tests, 0 Fehler, 0 Ausfälle, 0 übersprungen**
(ezdxf und Node/Playwright waren vorhanden, daher liefen auch DXF-Leser- und Browsertest). Zusätzlich
`python3 fusion/test_kurzschrift.py` → bestanden; `pyflakes` ohne Befund.

| Datei | Tests | Art |
|---|---|---|
| test_cloud | 18 | Anmeldung, Abgleich zwei PCs, Konflikt, Löschen, Rechte, Firmen, Geometrie, offline, Restore, Updater – gegen **Supabase-Nachbau** |
| test_fusion_logik | 21 | **neu**: Flansch, Umschlag, neue Aussenkante, Rückbau, Abwicklungsmasse, DXF-Erfolgsprüfung, Kantenbeschreibung, Kantenauflösung, Teilenummern – mit **nachgebauten Fusion-Objekten** |
| test_templates | 14 | Vorlagen, Bibliothek leer, Versionen, Import/Export |
| test_nesting | 13 | Zuschnitt gegen 13 Referenzfälle aus dem echten App-JavaScript, DXF mit ezdxf |
| test_migrations | 10 | Migration ohne Datenverlust, Sicherung/Wiederherstellung |
| test_parts_list | 8 | Zeichnungen, Vorschau, Stückliste, Etiketten |
| test_validation | 8 | Material, Einstellungen, Detailvorlagen, Ausrichtung, Parameterzuordnung, Palette-URL |
| test_forming | 7 | Rundblech, Werkstattblatt |
| test_operation_plan | 6 | Bauplan, Kanteneignung |
| test_geometrie | 5 | Biegerechnung gegen JS-Referenz, K-Faktor, Einheiten |
| test_short_syntax | 5 | Kurzschrift |
| test_import_fusion | 4 | Syntax, Import aller Module, Start/Stop, Dialogaufbau mit **Attrappe** |
| test_palette | 2 | Palette-Backend; **echte HTML-Palette in Chromium** inkl. Anmeldung gegen Nachbau |

Gegenprobe: 6 der neuen Tests wurden gegen den Code von 0.4.0 ausgeführt und scheitern dort wie erwartet.

### 5. In Fusion live getestet (vom Anwender)

Fusion 2706.1.17, Windows: Add-in-Start, Fähigkeitsprüfung (9/9 vorhanden), Selbsttest (Einheiten, Drehkörper, .f3d
Export/Import, Ausrichtung, Benutzerparameter). Mehr nicht.

### 6. Noch offene Anforderungen (Auszug, vollständig in ANFORDERUNGEN_STATUS.md)

- **Durchgehende Flansche, Umschläge, Einzel- und Doppelfalze an gekrümmten/runden Blechkanten ohne Einschnitte/Lappen:
  NICHT umgesetzt.** Vorhanden ist nur die Beurteilung (stauchen/strecken, konstruierbar/abwickelbar/herstellbar) und ein
  Drehkörper für Scheibe mit Rand und Kegel – kein Fusion-Blechkörper, keine Falze, kein Anwenden auf vorhandene gekrümmte Kanten.
  Möglicher Weg (zu prüfen): Querschnitt-Sweep entlang der gekrümmten Kante als Volumenkörper, mit eigener Abwicklungsrechnung
  und Kennzeichnung «kein Fusion-Blech».
- **Zuschnittoptimierung – fehlende Teile der App:** Rollenmischung, Mischen verschiedener Breiten im selben Abschnitt
  («Trittbrett»), Teilen zu langer Stücke mit Nahtüberlappung, Reststücke/Restelager, Materialbilanz (Schnittfuge, Reste),
  Normlängen für Stangenware, Spaltband-/Coil-Vorrang; Verschachtelung echter Konturen statt Rechtecke.
- Eigene Ausschnitte/Freistellungen und Eckregeln (Gehrung, Saum an Saum) – nicht umgesetzt.
- 3D-Detail mit dem Blechkörper vereinigen und als bearbeitbare Features integrieren – nicht umgesetzt.
- Automatische Fusion-Zeichnungen – nicht umgesetzt (Werkstattblatt als Ersatz).
- Konturprüfung der Fusion-DXF, konfigurierbare Layer in der Fusion-DXF – nicht umgesetzt.

### 7. Erforderliche Live-Tests in Fusion (kurz, Reihenfolge)

1. Version prüfen (Hilfe → Fähigkeiten: 0.4.2 bzw. nach Update), Palette öffnet sich.
2. Konto anmelden, «Jetzt abgleichen», «Nach Updates suchen».
3. Kanten bearbeiten an einer Grundlasche: `90 25`, dann `90 H U+ u`. **Masse in Fusion nachmessen** (Höhenbezug!), Vorschau sichtbar,
   Strg+Z nimmt alles in einem Schritt zurück. Protokollzeilen `EdgeFlangeInput eigenschaften=…`, `HemFeatureInput eigenschaften=…` schicken.
4. Ungeeignete Kante (Biegekante, Volumenkörper) → gesperrt mit Grund.
5. Abwicklung & DXF (mit/ohne vorhandene Abwicklung), DXF in CAD öffnen.
6. Stückliste & Zuschnitt, Etiketten drucken.
7. 3D-Detail erfassen/anwenden, zweimal im selben Dokument.
8. Mitarbeiter-Konto, offline-Start, Sicherung wiederherstellen.
Ausführlich: `docs/Testanleitung.pdf`.

### 8. Lieferung

- ZIP `SpenglerDigitalCAD_0.4.2.zip` = Programmstand dieses Berichts und **neue Grundinstallation** (Basis-Dateiliste
  `fusion/releases/basis.json` jetzt 0.4.2). Bitte 0.4.2 von Hand installieren (statt 0.4.0).

### 9. Update-Kanal in der App (Datenbank)

- Test-Update **0.4.3** veröffentlicht (nur Versionsnummer, 2 Dateien, Prüfsummen in der Datenbank kontrolliert). Gegen das ZIP
  0.4.2 geprüft: genau diese 2 Dateien würden ersetzt.
- Test-Update 0.4.1 abgeschaltet (`aktiv = false`, nicht gelöscht).
- Wer noch 0.4.0 installiert hat: das Update auf 0.4.3 bricht mit «Update unvollständig … bitte ZIP von Hand» ab und verändert
  nichts (so getestet) – dann ZIP 0.4.2 von Hand installieren.
- Keine Benutzerdaten in der Datenbank verändert (cad_daten unverändert).

## Z. Unsicherheiten der Fusion-API (bitte bei Weiterarbeit zuerst klären)

1. Eigenschaftsnamen von `EdgeFlangeInput` (Winkel, Richtung umkehren, Biegeradius) und `HemFeatureInput` (Kante setzen, Länge,
   Spalt, Richtung) – Preview-API, in der Dokumentation nicht prüfbar gewesen (help.autodesk.com aus der Entwicklungsumgebung
   gesperrt). Das Add-in protokolliert die vorhandenen Namen: Zeilen `EdgeFlangeInput eigenschaften=[…]` und
   `HemFeatureInput eigenschaften=[…]` in `%APPDATA%\SpenglerDigitalCAD\protokoll\spengler_cad.log`.
2. Höhenbezug des Flansches in Fusion (aussen/innen/Blechmitte/virtuelle Kante) – die Kurzschrift misst Blechmitte bis virtuelle Kante.
3. Welche der beiden Endkanten eines Flansches (Ober-/Unterseite) Fusion für den nächsten Flansch erwartet.
4. `FlatPattern`: Name der Eigenschaft für den flachen Körper (`flatBody`/`body`/`bodies`), Lage im Raum, ob `createFlatPattern`
   den Arbeitsbereich wechselt.
5. Verhalten von `HemFeatureInput` mit Spalt 0.
6. Import von .f3d: Benutzerparameter werden bei Namensgleichheit umbenannt (SD_H → SD_H_1) – **LIVE bestätigt**, im Code berücksichtigt.

## Y. Hinweise für die Weiterarbeit

- Tests ausführen: `python3 fusion/SpenglerDigital/tests/run_all.py` (Python ≥ 3.9, ohne Zusatzpakete; optional ezdxf und
  Node/Playwright für DXF-Leser- und Browsertest). Erwartet: 121 Tests, 0 Fehler.
- Keine Profile/Vorlagen in den Programmcode schreiben (Test `test_keine_vorlagen_im_programmcode`).
- Fusion-Aufrufe nur in `geometry/fusion_adapter.py`; jede neue Fusion-Funktion als «nicht live geprüft» kennzeichnen.
- Datenbank: bestehende Tabellen/Policies der App nicht ersetzen; neue Tabellen nach dem Muster tenant_boundary + has_permission.
- Updates veröffentlichen: `python3 fusion/werkzeug/release_sql.py release <version> "<Hinweis>"` → SQL in Supabase ausführen →
  `… bestaetigen <version>`. Grundinstallation (ZIP) = `fusion/releases/basis.json`.
