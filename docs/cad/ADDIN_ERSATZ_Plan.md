# Plan: Spengler Digital CAD ersetzt Fusion und das Fusion-Add-in

Stand 20.11.2026. Grundlage: Repo `spengler-fusion-addin` (Version 0.4.7, nur gelesen), `ANFORDERUNGEN_STATUS.md`, Palette `vorlagen.html`, `cloud_client.py`, `v_cad_addin_grundlagen.sql`.

## Was das Add-in ist (Ist)
- **Bedienung:** Fusion-Register «SPENGLER» mit den Gruppen *Kanten & Details*, *Fertigung*, *Verwaltung*; eine HTML-Palette mit den Registern **Kantenvorlagen · 3D-Details · Materialien · Einstellungen · Sicherung · Konto · Tests**. Farben: Akzent `#1d4f7a`, Rand `#c8ced6`, Grau `#5b6672`, Hintergrund `#f7f8fa`.
- **Daten (nie mitgeliefert, nur Benutzerbibliothek):**
  - **Kantenvorlage:** Name, Kategorie, Favorit, Version, Parameter (Name, Bezeichnung, Einheit, Standard, Min, Max, variabel) und Operationen (Art, Winkel, Länge, Radius, Bezug); Standardmodus mit Formularfeldern, Expertenmodus mit Operationstabelle und Kurzschrift.
  - **3D-Detailvorlage:** Fusion-Körper (.f3d) mit Anschlusskante und lokalem Koordinatensystem.
  - **Materialprofil:** Dicke, Ri, K-Faktor (aus Probebiegung), Dichte, Tafeln, Rollen.
- **Funktionen:** Kanten bearbeiten (mehrere Kanten, Vorschau, Eignungsprüfung), 3D-Detail erfassen/anwenden, Rundblech-Beurteilung (Scheibe/Kragen/Kegel, konstruierbar–abwickelbar–herstellbar), Abwicklung und DXF, Werkstattblatt, Stückliste, Etiketten, Zuschnittoptimierung (Port von `js/29` der App), Material- und Gewichtsrechnung, Sicherung/Wiederherstellung, Papierkorb, Versionen je Vorlage, Selbsttest, Hilfe/Handbuch (PDF).
- **Cloud:** Anmeldung mit dem Konto der Spengler-Digital-App (Supabase, Vorname.Nachname oder E-Mail), Tabelle `cad_daten` (Typen `kantenvorlage`, `detailvorlage`, `materialprofil`; mehrere Firmen getrennt per RLS; Rechte über `has_permission('vorlagen', …)`), Versionstabelle, Bucket `cad` für Dateien, Releases für Programm-Updates.

## Was unser CAD schon hat (Abdeckung)
| Add-in | Unser CAD heute |
|---|---|
| Kantenvorlagen | **Kantenbausteine** (Kurzschrift, Editor mit Live-Querschnitt, Gruppen). Ohne Parameter, ohne Kategorien/Favoriten/Versionen, **16 Standardbausteine fest eingebaut** |
| 3D-Details | nicht vorhanden (Fusion-Körper). Gleichwertig: exakte Körper im Kern als STEP + Parameter |
| Materialien | vorhanden (Dicke, Ri, K, Dichte, Lager, Kalibrierung aus Probe). Standardmaterialien fest eingebaut |
| Rundblech | Rund-/Kegelblech mit exakter Abwicklung, Rohr mit Anschnitt. Beurteilung Scheibe/Kragen/«herstellbar» fehlt |
| Abwicklung, DXF, Werkstattblatt, Stückliste, Etiketten, Zuschnittplan | vorhanden (Zuschnitt mit Lagerformaten; Nesting mit echten Konturen fehlt auch im Add-in) |
| Sicherung/Wiederherstellung, Papierkorb, Versionen | Projekt-Undo und Dateispeicherung; keine Sicherungen/Papierkorb/Versionen je Vorlage |
| Konto, Firmen-Abgleich, Rechte, Updates | nur PC-Update über GitHub; **kein Konto, keine Cloud** |
| Selbsttest, Hilfe/Handbuch | Kurzanleitung, kein Selbsttest |

## Vorgehen (Phasen, jede hinter dem Bestand abgesichert, nach main)
1. **Datenkern gemeinsam mit dem Add-in:** Datenmodelle (Kantenvorlage mit Parametern/Operationen/Kategorie/Favorit/Version, Materialprofil, Einstellungen) als JS-Module in `kern/vorlagen/` mit denselben JSON-Feldern wie `core/models.py`. Importer/Exporter der Add-in-Dateien. Kurzschrift-Kompatibilität gegen `short_syntax.py` testen.
2. **Konto und Abgleich:** Anmeldung (Supabase REST/Auth, nur `fetch`), Sitzung lokal, Abgleich von `cad_daten` mit Konfliktregeln und Versionen wie `sync_service.py`, Offline-Betrieb. Entwicklung gegen einen **Nachbau** des Servers (das Add-in macht es genauso), echter Test nur durch dich.
3. **Projekt-Synchronisation:** neue Tabelle `cad_projekte` (SQL zum Ausführen in Supabase), Projekt = JSON des Dokuments, Version/Konflikt wie bei den Vorlagen, Liste «Meine/Firmenprojekte», Öffnen/Speichern in der Cloud, Verbindung zu Aufträgen der Spengler-Digital-App (Objekt/Nr.).
4. **Oberfläche nach dem Add-in:** Register **SPENGLER** mit den Gruppen *Kanten & Details*, *Fertigung*, *Verwaltung* und die Palette (Kantenvorlagen · 3D-Details · Materialien · Einstellungen · Sicherung · Konto · Tests) in denselben Farben, Texten und Abläufen. Werkzeuge wie Skizze/Körper bleiben im Modell-Bereich.
5. **Funktionen des Add-ins nachziehen:** Parameter-Vorlagen mit Vorschau und Eignungsprüfung, Rundblech-Beurteilung, Sicherungen/Papierkorb, Selbsttest, Handbuch.
6. **Fusion ersetzen:** 3D-Detailvorlagen als exakte Körper (STEP) im eigenen Kern statt .f3d; Abwicklung aus dem eigenen Kern (bereits exakt) statt Fusion-Blech.

## Entscheidungen, die ich von dir brauche
1. Standardbausteine/-materialien: wie im Add-in **nicht mitliefern** (nur Cloud-/Benutzerbibliothek) oder **als Startbestand behalten**?
2. Projekte in der Cloud: neue Tabelle `cad_projekte` (du führst das SQL in Supabase aus) – einverstanden?
3. Die App-Repo `Spengler---Digital-V1` (Login `js/03-login.js`, Zuschnitt `js/29`) lesend anhängen – einverstanden?

## Grenzen
- Von der Sandbox aus ist die Supabase-Adresse **nicht erreichbar**: Anmeldung und Abgleich kann ich nur gegen einen Nachbau testen; echt testest du.
- Das Add-in ist selbst nur teilweise in Fusion geprüft; was dort «TEIL/NEIN» ist, übernehme ich nicht als fertig.

## Stand 20.11.2026 (Fortschritt)
- **Phase 1 fertig:** `kern/vorlagen/` (Modelle, Kurzschrift mit Parametern, Wandler Baustein⇄Kantenvorlage, Material⇄Materialprofil), `test/vorlagen.test.js`.
- **Phase 2 Kern fertig:** `kern/cloud/client.js` (Anmeldung Name/E-Mail, Refresh, Recht `vorlagen edit`, `cad_daten`), `kern/cloud/abgleich.js` (Verfahren wie Add-in: optimistische Sperre, Konfliktkopie, nie endgültig löschen, nur-lokal ohne Recht). Getestet nur gegen Server-Nachbau (`test/cloud.test.js`); echter Supabase-Test steht aus (Sandbox erreicht den Server nicht).
- **Phase 3 Kern fertig:** `docs/cad/cad_projekte.sql` (vom Besitzer in Supabase auszuführen), Client für Cloud-Projekte, `cad_teile` (CAD→App) und `cad_profil_auftraege` (App→CAD, Projekt = Auftragsnummer).
- **Noch offen:** Oberfläche (Konto, Abgleich, Projektliste, SPENGLER-Register im Add-in-Design), Add-in-Funktionen (Parameter-Vorlagen mit Vorschau, Sicherung/Papierkorb, Selbsttest, Rundblech-Beurteilung), 3D-Detailvorlagen als exakte Körper/STEP.
- Nutzerentscheide: Standardbausteine/-materialien bleiben Startbestand; Cloud-Projekte über `cad_projekte`; App-Repo nur lesend.

## Entscheid 20.11.2026: kein eigenes SPENGLER-Register
Das gesamte CAD ersetzt das Add-in; ein Nachbau der Fusion-Leiste «SPENGLER» ist nicht nötig. Die Funktionen leben in den bestehenden Bereichen (Einstellungen › Konto & Cloud, Bausteine, Werkstatt). Phase 4 entfällt; offen bleiben nur Add-in-Funktionen ohne CAD-Gegenstück (Parameter-Vorlagen, Sicherung/Papierkorb, Selbsttest, Rundblech-Beurteilung, 3D-Detailvorlagen als exakte Körper).

## Stand 20.11.2026 (Add-in-Funktionen im CAD)
- Fertig: Kantenbausteine mit Parametern/Ausdrücken/Eignungsprüfung (`kern/vorlagen/parameter.js`), Sicherungen + Papierkorb (`kern/sicherung.js`), Rundblech beurteilen (`kern/umformung.js`, Dialog «Rundblech beurteilen», Umformgrenzen im Material), Selbsttest (`kern/selbsttest.js`, Einstellungen › Programm).
- Offen: Parameterwerte je Kante im Flächenblech-Dialog (heute gelten die Standardwerte), 3D-Detailvorlagen als exakte Körper (setzt STEP-Import als exakter Körper voraus), Handbuch/Hilfe zu den neuen Funktionen, echter Test gegen Supabase.

## Stand 20.11.2026 (3D-Detailvorlagen, STEP-Import)
- `kern/vorlagen/detail3d.js`: Vorlage aus STEP (Format «detailvorlage» des Add-ins, Körper in `source.step`/`source.mesh`), Lage an einer Kante (Ursprung am Kantenanfang, X entlang der Kante, Z zur Sichtseite, Versatz, Drehung), Eignungsprüfung (Kantenlänge, Blechdicke).
- App: Register «Details 3D», Feature «3D-Detail» (Netz und exakt über `stepImport` + `matrix`), STEP-Import mit exaktem Kern als exakter Körper; Abgleich mit der Cloud (`detailvorlage`), Löschen und Papierkorb.
- Löschungen in der App gehen jetzt beim nächsten Abgleich an die Cloud (soft: `geloescht`); der Startbestand ist ausgenommen.
- Abweichung vom Add-in: keine .f3d (Fusion-Archive) – die Vorlagen sind STEP. Bestehende .f3d müssen einmal aus Fusion als STEP exportiert werden.
- Offen: Spiegeln der Vorlage, Anker mit mehreren Kanten/Parametern im Körper (Parametrik), Abgleich grosser Vorlagen (>1.5 MB bleiben lokal).
