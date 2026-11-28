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
- «Aus App aktualisieren» im Profil-Dialog holt die aktuelle Aufnahme (`appMassaufnahme`), ordnet über die Länge zu (`aktualisiereAusMessung`), fragt bei im CAD geänderten Massen vor dem Überschreiben. Die Blechstärke/Material wird dabei NICHT neu zugeordnet.
- Werkstattblatt: Kopf zeigt «Messung Nr. N (geändert)», bei Abweichung eine Zeile «Gegenüber der Messung geändert».

## Phase 3: «Einlaufblech gerade»
`kern/generator/einlaufblechGerade.js` (Verteiler `kern/generator/index.js`, Test `test/einlaufblech.test.js`, Referenz `test/daten/app-einlaufblech-98.json`).
- Profil: Umschlag unten (−180°) · Mass A · Biegung −(180° − Winkel) · Restbreite · Umschlag oben (+180°); Vorzeichen so, dass die Umschläge wie in der App-Schnittzeichnung (js/11) liegen (geprüft per Screenshot-Vergleich und Pfadrechnung).
- Ein Bauteil je Stücklänge (+ Gehrungsseite), Stück = Anzahl. Länge = `pieces[].laenge` (inkl. Überlappung/Endzugabe der App).
- Die App speichert die Umschläge nicht (Firmeneinstellung): Umschlag gesamt = Abwicklung − Mass A − Restbreite, je zur Hälfte oben/unten angenommen (Warnung).
- CAD-Zuschnitt (mit Biegezugaben) weicht leicht von der App-«Abwicklung» ab (Referenz: 200.3 vs 200 mm), die App summiert nur Schenkel.
- Nicht umgesetzt: Gehrungsschnitte an den Stückenden (Teile bekommen Notiz), Winkel der Eckstücke, Montage von links/rechts (enges Mass A), GAVA-Haltebleche, Stossüberlappung als Geometrie.
- Alle Teile eines Imports liegen am gleichen Ursprung übereinander (wie beim freien Profil) – Anordnung steht noch aus.
