# Spengler Digital CAD – Prototyp 0.1

Erster Prototyp aus Phase 1: Profil-Editor, Spengler-Kern, 3D-Ansicht, Abkantliste,
Lagerformat-Vorschlag, Etikett und DXF-Abwicklung. Läuft im Browser.

## Aufbau

```
kern/            Spengler-Kern, ohne Abhängigkeiten (wird später ins PC-Programm übernommen)
  geometrie.js   Profilrechnung, Zuschnitt, Abkantfolge, Blechkontur
  profile.js     11 Vorlagen + freies Profil
  materialien.js Materialien, Tafeln, Coil, Spaltbänder
  dxf.js         DXF-Export der Abwicklung
src/cad.js       Oberfläche
src/cad.html     Seitenvorlage
build.mjs        baut index.html und dist/index.html (eine Datei)
web/             Manifest und Icons für die Web-Version (Handy)
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
- **main:** zusätzlich ein GitHub-Release `v0.1.<Laufnummer>` mit `latest.json`.
  Installierte Programme prüfen beim Start dieses Release und bieten das Update an.

Die Version setzt der Workflow selbst (Major.Minor aus `package.json`, Patch = Laufnummer).
Für einen Sprung auf 0.2 nur `version` in `package.json` ändern.

### Einmalig: Signaturschlüssel als Secrets hinterlegen

Updates müssen signiert sein. Unter *Settings → Secrets and variables → Actions* anlegen:

- `TAURI_SIGNING_PRIVATE_KEY` – Inhalt der privaten Schlüsseldatei
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` – Passwort des Schlüssels (leer lassen, wenn keins)

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
- Zugaben und K-Faktor sind Startwerte, pro Material kalibrieren.

## Nächste Schritte

- OpenCascade auf dem Windows-PC einrichten (native Bibliothek), STEP-Export
- Echtes Speichern von Projekten und Dateien im PC-Programm (Speichern-Dialog statt Download-Ordner)
- Abkantliste im Eingabeformat von Jorns und Schröder (Modelle offen)
