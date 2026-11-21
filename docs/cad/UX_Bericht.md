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

## Weitere Umsetzung (dritte Etappe)
- **Meldungen:** `src/meldungen.js` – Warnungen/Fehler erscheinen zusätzlich als schliessbare Meldung (`role="alert"`, max. 3, 7 s), damit sie nicht in der Statuszeile untergehen.
- **Tastatur:** Sprunglink «Zur 3D-Ansicht» als erster Tab-Stopp; DOM-Reihenfolge Leiste → Browser → Ansicht → Dialog → Teil/Auftrag → Zeitleiste ist zugleich die Tab-Reihenfolge.
- **Icons:** geprüft – 93 Werkzeug-Icons, alle `viewBox 24`, keine Inline-Strichstärken; Skizzen-Werkzeuge sind bewusst Linienicons, Körper-/Blechwerkzeuge mit Flächenton (`.f`). Einheitlichkeit kommt zentral aus dem CSS.
- **Eingaben/Plan/Einstellungen:** niedrig spezifischer Grundstil für Auswahl-/Textfelder (Plan-Editor-Auswahlfelder waren ungestylt), Einstellungs-Register brechen um statt abgeschnitten zu werden, `--on-accent` statt festem Weiss.
- **CI:** Auf dem Branch laufen «Web-Version» und «Windows-Installer» (Tauri) – beide erfolgreich (Run-Nr. 197–200); veröffentlicht wird nur auf `main`. Android baut nur auf `main`.

## Offen
- Stift/Touch auf echter Hardware (Tablet) und Android-Build nicht in dieser Umgebung prüfbar.
- Restliche Farben/Abstände im Alt-CSS (~400 Zeilen) sind noch nicht auf Tokens umgestellt; Plan-Editor-Layout (zweizeilige Werkzeugleiste) bleibt funktional unverändert.
- Entscheidung des Besitzers: Branch nach `main` mergen (löst Windows-Release aus).

## Tests
`npm test` (Kern) und 17 Playwright-App-Tests (`tests/app-kern/`), darunter neu `befehlssuche.mjs` (Suche, angedockter Dialog, Esc/Enter, Warnhervorhebung). Vorher-/Nachher-Screenshots: `docs/cad/ux/vorher`, `docs/cad/ux/nachher`.
