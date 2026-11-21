# UX-Professionalisierung – Zwischenbericht

Branch: `ux/professionalisierung` (kein Release; `main` unverändert). Stand: siehe `git log` des Branches.

## Umgesetzt
- **Layout:** Dialoge rechts angedockt (Desktop), Teil/Auftrag weicht; rechte Spalte verstellbar (260–720 px, gespeichert, Doppelklick = Standard).
- **Navigation:** Befehlssuche (Strg+K, «/», «Suchen»), liest die Leiste aus dem DOM und startet denselben Knopf; «Arbeitsbereich zurücksetzen» als Zusatzbefehl.
- **Dialogsystem:** Schritt-Assistent (Schrittleiste, Zurück/Weiter, OK jederzeit) für Dach, Gebäude, Lukarne, Dachfenster/Kamin, Dachbleche, Vorlage, Blechprofil, Rundblech; Esc = Abbrechen, Enter = nächster Schritt bzw. OK.
- **Designsystem:** Tokens für Abstände, Radien, Schriftgrössen, Schatten, Fokus, Warnfarbe; Radien/Schatten der Bestands-CSS auf Tokens umgestellt.
- **Hell/Dunkel:** Werkzeugleiste, Ansichtsknöpfe, Meldungen und 3D-Hintergrund jetzt im Dunkelmodus konsistent.
- **Rückmeldung:** Statuszeile als lesbare Pille mit `aria-live`, Warnungen rot hervorgehoben.
- **Responsive:** Werkzeugleiste mit Randhinweis bei Wischbedarf; Befehlssuche als Vollzugang auf Tablet/Handy.

## Bewusst unverändert
CAD-Kern, OCCT/Worker/WASM, Datenformate, Projektdateien, Cloud/Projekte, Tastenkürzel, Maus-/Touch-/Stiftsteuerung, Plan-Modul, Tauri/Android-Hülle, Build-Skripte.

## Offen
Icons vereinheitlichen (Strichstärken sind per CSS einheitlich, Motive nicht), Toast-System für Meldungen, Tab-Reihenfolge, restliche CSS-Altblöcke (Farben direkt statt Tokens), Plan-Editor und Einstellungen visuell angleichen, Prüfung Tauri-/Android-Build und Stifteingabe auf echter Hardware.

## Tests
`npm test` (Kern) und 17 Playwright-App-Tests (`tests/app-kern/`), darunter neu `befehlssuche.mjs` (Suche, angedockter Dialog, Esc/Enter, Warnhervorhebung). Vorher-/Nachher-Screenshots: `docs/cad/ux/vorher`, `docs/cad/ux/nachher`.
