# Spengler Digital CAD 0.2

Blechprofile für die Spenglerei: Profil eingeben, Zuschnitt und Abkantliste ablesen,
Werkstattblatt drucken. Läuft als Windows-Programm, im Browser und auf dem Handy – ohne Internet.

## Funktionen

- **Profile erstellen:** 12 Spengler-Vorlagen, freies Profil als Tabelle (Schenkel/Winkel),
  Skizze mit Linienzug → Blechprofil, Extrusion für Volumenkörper
- **Werkstatt:** Zuschnitt, Querschnitt und Abwicklung mit Massen, Abkantliste mit Anschlag ab Kante A und B,
  Lagerformat-Vorschlag (Spaltband/Coil/Tafel), Etikett, DXF-Abwicklung
- **Auftrag:** Stückzahlen, Stückliste mit m², kg und Laufmetern je Material, Materialbedarf
  (Spaltband/Coil in Laufmetern, Anzahl Tafeln), CSV für Excel, alle Abwicklungen in einer DXF-Datei
- **Drucken:** Stückliste, Werkstattblatt (A4) je Teil, Etiketten (A4-Bogen 3 × 8)
- **Einstellungen:** Materialien kalibrieren (K-Faktor aus Probebiegung), eigene Materialien,
  Lagerformate, eigene Vorlagen, Vorgaben für neue Teile, Fangraster, Druckinhalt und Kopfzeile,
  Etikettenbogen, hell/dunkel, Update-Prüfung; alles als Datei auf ein anderes Gerät übertragen
- **Bearbeiten:** Rückgängig/Wiederholen, Duplizieren, Löschen (Entf), Teile umbenennen, Notiz pro Teil
- **Skizzieren (wie Fusion):** Linie, Rechteck (2 Punkte, Mittelpunkt, 3 Punkte), Kreis (Mittelpunkt, 2, 3 Punkte),
  Bogen (3 Punkte, Mittelpunkt), Polygon, Langloch, Punkt; Abrunden (= Biegeradius beim Blech), Versatz, Spiegeln,
  Stutzen, Dehnen, Trennen, Verschieben/Kopieren/Drehen, Muster (rechteckig, kreisförmig), Projizieren, Hilfslinien;
  berührende Linien/Bögen bilden Linienzüge und Profile
- **Abhängigkeiten und Masse (wie Fusion):** Horizontal/Vertikal, Koinzident, Tangential, Gleich, Parallel,
  Senkrecht, Fixieren, Mittelpunkt, Konzentrisch, Kollinear, Symmetrisch; treibende Masse (Länge, Abstand,
  Winkel, Radius, Durchmesser); automatische Abhängigkeiten beim Zeichnen; Freiheitsgrade-Anzeige,
  bestimmte Geometrie dunkel; Ziehen hält alle Abhängigkeiten ein (eigener Gleichungslöser)
- **Konstruieren (wie Fusion):** Konstruktionsebenen versetzt, unter Winkel, Mittelebene, durch zwei Kanten,
  durch drei Punkte, tangential, entlang Pfad; Bezüge und Skizzierebene (auch Körperflächen) in der 3D-Ansicht anklicken
- **Modellieren wie Fusion:** Extrudieren und Drehen mit Vereinigen/Ausschneiden/Schneiden; Parameter mit Formeln
  in allen Massen; Messen und Schnittanalyse; Konstruktionsachsen und -punkte; Zeitleiste mit Rückrollmarke,
  Unterdrücken und Verschieben; Spline und Ellipse in der Skizze; Sweep und Übergang; Abrunden/Fasen, Schale,
  Körpermuster, Spiegeln, Verschieben/Kopieren; Komponenten (Baugruppen) im Browser; Planblatt A3/A4 mit Ansichten
- **Austausch:** STEP-Export als echter B-Rep-Körper (ebene Flächen, gemeinsame Kanten), STL-Export,
  STEP-/STL-Import (STEP über OpenCascade als WebAssembly, wird erst beim ersten Import geladen)
- **Darstellung:** Materialfarben der Spenglerei (Titanzink, Kupfer, Patina, Alu, Chromstahl …), Holz, Beton;
  Schnittanalyse mit gefüllter, schraffierter Schnittfläche
- **Flächenblech mit Kantenbausteinen:** nur die Grundfläche skizzieren, Kante anklicken und Baustein zuweisen
  (Doppelstehfalz mit automatischem Gegenstück, Traufe, Ortgang, Wasserfalz, Saum …); Zuschnitt mit
  Eckausklinkung, Biegelinien, Abkantliste, DXF; Bausteine in den Einstellungen selbst erfassen und anpassen
- **Blechprofil aus Skizze:** Blech mittig, links oder rechts der Linie, Kante A an Anfang oder Ende
- **PC-Programm:** Speichern/Öffnen mit Windows-Dialog, zuletzt geöffnete Projekte, `.sdcad` per Doppelklick,
  automatische Updates
- Kurzanleitung und Tastenkürzel im Programm unter **Hilfe** (F1)

## Aufbau

```
kern/            Spengler-Kern, ohne Abhängigkeiten (wird später ins PC-Programm übernommen)
  geometrie.js   Profilrechnung, Zuschnitt, Abkantfolge, Blechkontur
  profile.js     12 Vorlagen + freies Profil
  materialien.js Materialien, Lagerformate, K-Faktor aus Probebiegung
  dxf.js         DXF-Export der Abwicklung
  zeichnung.js   Querschnitt als SVG (Werkstatt, Druck)
  auftrag.js     Stückliste, CSV
  zuschnitt.js   Materialbedarf (Spaltband, Coil, Tafeln)
  skizze.js      Skizzengeometrie (Bögen, Abrunden, Versatz, Spiegeln, Schnitte, Verbinden)
  ebenen.js      Konstruktionsebenen (versetzt, Winkel, Mitte, Kanten, Punkte, tangential, Pfad)
  ausdruck.js    Formelrechner und Parameter
  loeser.js      Gleichungslöser (Levenberg–Marquardt, Freiheitsgrade)
  bedingungen.js Abhängigkeiten und Masse als Gleichungen
  flaechenblech.js Flächenblech: Kantenbausteine, Zugaben, Zuschnitt mit Ausklinkung, Biegelinien
  details.js     Abkantfolge in Kurzschrift (Grundlage der Kantenbausteine)
  skizzenloeser.js Skizze ↔ Löser (Bezüge, Ziehen, Prüfen auf Widerspruch/überzählig)
src/cad.js       Oberfläche
src/cad.html     Seitenvorlage
build.mjs        baut index.html und dist/ (eine Datei inkl. three.js und Schriften)
web/             Manifest, Icons, Service Worker für die Web-Version (Handy, offline)
src-tauri/       Windows-Programm (Tauri 2) mit Update-Funktion
test/            Tests gegen die Werte des Fusion-Add-ins
```

## Lokal starten (Windows)

`index.html` per Doppelklick öffnen – läuft ohne Internet, alles ist eingebettet.

Entwickeln:

1. Node.js installieren (nodejs.org, LTS), im Ordner `npm install`.
2. Nach Änderungen in `src/` oder `kern/`: `npm run build` (baut `index.html` und `dist/`).
3. Tests: `npm test`

## Auf dem Handy testen

Jeder Push veröffentlicht die Web-Version über GitHub Pages (`.github/workflows/web.yml`):

- **main:** https://mikesch15.github.io/Spengler-Digital-CAD/
- **andere Branches:** https://mikesch15.github.io/Spengler-Digital-CAD/vorschau/<branch>/
  (Schrägstriche im Branchnamen werden zu `-`)

Die Adresse steht auch in der Zusammenfassung des Workflow-Laufs. Im Browser-Menü
„Zum Startbildschirm hinzufügen“ legt das Programm als App-Symbol ab.

Einmalig einrichten: nach dem ersten Lauf unter *Settings → Pages* bei *Source*
„Deploy from a branch“ wählen, Branch `gh-pages`, Ordner `/ (root)`.

## Windows-Programm (Tauri)

Jeder Push baut über GitHub Actions (`.github/workflows/windows-build.yml`) ein
Installationsprogramm `Spengler Digital CAD_<Version>_x64-setup.exe`:

- **Branches und Pull Requests:** Installer liegt als Artefakt am Workflow-Lauf.
- **main:** zusätzlich ein GitHub-Release `v0.2.<Laufnummer>` mit `latest.json`.
  Installierte Programme prüfen beim Start dieses Release und bieten das Update an.

Die Version setzt der Workflow selbst (Major.Minor aus `package.json`, Patch = Laufnummer).
Für einen Sprung auf 0.3 nur `version` in `package.json` ändern.

### Einmalig: Signaturschlüssel als Secrets hinterlegen

Updates müssen signiert sein. Unter *Settings → Secrets and variables → Actions* anlegen:

- `TAURI_SIGNING_PRIVATE_KEY` – Inhalt der privaten Schlüsseldatei
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` – nur nötig, wenn der Schlüssel ein Passwort hat

Der passende öffentliche Schlüssel steht in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`).
Geht der private Schlüssel verloren, neues Paar erzeugen (`npx tauri signer generate -w spengler.key`),
`pubkey` ersetzen und das Programm einmal von Hand neu installieren.

### Lokal bauen (Windows)

Voraussetzungen: Node.js LTS, Rust (rustup.rs), WebView2 (bei Windows 10/11 vorhanden).

```
npm install
npm run tauri dev     # Programm mit Entwicklungsansicht starten
npm run tauri build   # Installer nach src-tauri/target/release/bundle/nsis/
```

## Konventionen

- Alle Masse in mm auf der Blechmitte, Anschlag ab Kante A (grüner Punkt).
- Richtung „oben/unten“ mit Kante A links.
- Innenradius und K-Faktor sind Startwerte, pro Material kalibrieren (Einstellungen → Probebiegung).
- Einstellungen gelten pro Gerät; Projekte speichern die verwendeten Materialwerte mit.

## Nächste Schritte

- OpenCascade auf dem Windows-PC einrichten (native Bibliothek), STEP-Export
- Abkantliste im Eingabeformat von Jorns und Schröder (Modelle offen)
- Abkantfolge mit Kollisionsprüfung (Werkzeug/Oberwange)
