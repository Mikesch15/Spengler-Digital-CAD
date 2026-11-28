# Austauschformat App → CAD (Phase 1)
`kern/austausch.js`, Schema `sdcad.massaufnahme` Version 1. Test: `test/austausch.test.js` (Referenz `test/daten/app-freies-profil-111.json`, echte App-Aufnahme).
- Umschlag: `quelle.id` (= `measurements.id`), `projekt.id` (= `projects.id`; Auftragsnr. nur Anzeige), `art`, `material{code,staerke_mm}`, `einheiten` (mm, grad, m2), `messwerte` = Originalstand der App (nie verändert), `anhaenge`.
- `pruefe()` liefert `fehler`/`warnungen`/`cad` (normierte Parameter, getrennt von den Messwerten). Fehlerhafte Aufnahmen lassen sich nicht übernehmen.
- Art ohne Generator wird importiert, aber markiert («noch kein Generator»). Aktuell Generator-fähig: `freies_profil`.
- Übergabe: Datei › Projekte › Projekt wählen › «Massaufnahmen aus der App laden» (liest `measurements` per RLS) › «Ins Modell übernehmen» → `doc.massaufnahmen[]` (Original bleibt im .sdcad).
- Offen: Anhänge (Fotos/Skizzen) nur als Verweis-Struktur, Tabelle/Storage der App noch nicht angebunden; Zahlen-Text der App (`staerke_mm` als String) wird beim Import zur Zahl; Material-Code «3» ist noch nicht auf CAD-Material abgebildet.
