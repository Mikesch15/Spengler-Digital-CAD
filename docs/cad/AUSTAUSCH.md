# Austauschformat App → CAD (Phase 1)
`kern/austausch.js`, Schema `sdcad.massaufnahme` Version 1. Test: `test/austausch.test.js` (Referenz `test/daten/app-freies-profil-111.json`, echte App-Aufnahme).
- Umschlag: `quelle.id` (= `measurements.id`), `projekt.id` (= `projects.id`; Auftragsnr. nur Anzeige), `art`, `material{code,staerke_mm}`, `einheiten` (mm, grad, m2), `messwerte` = Originalstand der App (nie verändert), `anhaenge`.
- `pruefe()` liefert `fehler`/`warnungen`/`cad` (normierte Parameter, getrennt von den Messwerten). Fehlerhafte Aufnahmen lassen sich nicht übernehmen.
- Art ohne Generator wird importiert, aber markiert («noch kein Generator»). Aktuell Generator-fähig: `freies_profil`.
- Übergabe: Datei › Projekte › Projekt wählen › «Massaufnahmen aus der App laden» (liest `measurements` per RLS) › «Ins Modell übernehmen» → `doc.massaufnahmen[]` (Original bleibt im .sdcad).
- Offen: Anhänge (Fotos/Skizzen) nur als Verweis-Struktur, Tabelle/Storage der App noch nicht angebunden; Zahlen-Text der App (`staerke_mm` als String) wird beim Import zur Zahl; Material-Code «3» ist noch nicht auf CAD-Material abgebildet.

## Phase 2: Generator «Freies Profil»
`kern/generator/freiesProfil.js` (Test `test/generator.test.js`): Umschlag → Profil-Features (ein Feature je verschiedene Länge, Stück = Anzahl). Abwicklung/Werkstattblatt kommen aus dem bestehenden Profil-Feature (exakter Kern).
- Knopf «Bauteil erzeugen» in der Importliste; Feature trägt `herkunft` (Messaufnahme-/Projekt-ID, Schema-Version, eingefrorene Original-Schenkel). `abweichungen(f)` meldet CAD-Änderungen gegenüber der Messung (noch keine Anzeige in der Oberfläche).
- Winkel der App (= Biegung VOR dem Schenkel) → CAD-Zeilen (Biegung NACH dem Schenkel); ±180° = Umschlag. Der Winkel am 1. Schenkel (Startdrehung) wird wie beim bisherigen Senden ignoriert (Warnung).
- Material: Zuordnung nur über die Blechstärke; fehlt sie in den Einstellungen, wird ein Standardmaterial genommen und gewarnt.
- Profil-Dialog zeigt die Box «Aus Massaufnahme N» (wie gemessen / im CAD geändert + Liste) und «Auf Messwerte zurücksetzen» (auf die eingefrorenen Originalwerte). App-Test: `tests/app-kern/massimport.mjs` (Screenshots mit `SHOT=<ordner>`).
- Offen: erneutes Laden geänderter Messwerte aus der App («Aus Messung aktualisieren»), Werkstattblatt-Vorlage mit Messaufnahme-ID.
