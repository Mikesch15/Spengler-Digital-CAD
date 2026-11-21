# UX-Konzept «Spengler Digital CAD» (Branch `ux/professionalisierung`)

## Leitgedanken
1. **Die 3D-Ansicht steht im Mittelpunkt.** Nichts Dauerhaftes darf sie überdecken: Dialoge docken rechts an, Browser ist schwebend/einklappbar, Teil/Auftrag weicht dem aktiven Dialog.
2. **Navigation, die mit dem Funktionsumfang skaliert.** Zwei Zugänge zu jedem Werkzeug: (a) die gruppierte Leiste für den täglichen Gebrauch, (b) die **Befehlssuche** (Strg+K / «/») für alles andere. Die Suche liest die Leiste aus dem DOM und löst denselben Knopf aus – keine zweite Funktion, nichts, was auseinanderlaufen kann.
3. **Führen statt überladen.** Komplexe Werkzeuge laufen als Schritt-Assistent (Schritt 2 von 5 · Zurück/Weiter, OK jederzeit). Einfache Werkzeuge bleiben einseitig.
4. **Ein Dialogsystem.** Ein Dialog-Baustein (Titel, Schrittleiste, Felder, Info, Fuss mit Abbrechen / Zurück / Weiter / OK / Löschen) für alle Features; Live-Vorschau bleibt aktiv, Wahlfelder (⊕) nehmen Klicks in der Ansicht auf.
5. **Ruhig, technisch, hochwertig.** Eine Akzentfarbe (Blau), neutrale Flächen, wenige Rahmen, klare Zustände.

## Layout (Desktop ≥ 1001 px)
```
┌ Kopfleiste: Logo · Suchen · Gruppen/Menüs · (Skizze: Skizzenleiste) ────────┐
│ ┌ 3D-Ansicht (flexibel) ───────────────────────┐ ┌ rechts, 300–340 px ────┐ │
│ │ Browser (schwebend, einklappbar)  ViewCube   │ │ Teil / Auftrag         │ │
│ │ Kontextleisten: Kanten, Layer, Eingabe       │ │  – oder –              │ │
│ │ Status                                       │ │ aktiver Dialog/Assistent│ │
│ └──────────────────────────────────────────────┘ └────────────────────────┘ │
│ Zeitleiste · Rückgängig · Wiederholen                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```
- Rechte Spalte = **ein** Platz für das jeweils Wichtige: ohne aktives Werkzeug «Teil/Auftrag», mit aktivem Werkzeug der Dialog (Docking per CSS `:has()`, kein JS-Umbau).
- Tablet/Handy (≤ 1000 px): einspaltig, Dialog als Boden-Sheet (unverändert, bewährt); Befehlssuche ersetzt das Wischen durch die Leiste.

## Design-Tokens (bestehend + Erweiterung)
Vorhanden: Farben (`--bg --panel --panel-2 --line --fg --muted --accent --accent-soft --bend --view --sketch --ok --fehler`), Schriftfamilien, Hell/Dunkel (`prefers-color-scheme` + `data-theme`). Ergänzt/zu ergänzen: Abstandsskala (4/8/12/16), Radien (4/6/10), Schatten (Panel, Overlay), Schriftgrössen (12/13/14/16), Fokusring. Neue Komponenten (Befehlssuche, angedockter Dialog, Schrittleiste) nutzen ausschliesslich Tokens.

## Bedienkonzept
- **Befehlssuche:** Strg+K, «/», Knopf «Suchen»; Treffer nach Name, Tooltip, Stichwörtern; ↑↓ Enter Esc; nur verfügbare Werkzeuge (nicht deaktivierte/versteckte), eingeklappte Menüs zählen mit.
- **Assistenten:** Schritte = Felder-Gruppen (`fd.schritt`), Hinweise im ersten, Auswertung im letzten Schritt.
- **Ziehpfeile** statt Zahlenfelder, wo sinnvoll (beide Richtungen), Eingabe bleibt möglich (auch negativ).
- **Skizze:** Ansicht bleibt senkrecht; Drehung nur in der Ebene.

## Phasen
1. ✔ Bestandsaufnahme (`UX_Bestandsaufnahme.md`).
2. ✔ Konzept (dieses Dokument).
3. ✔ Grundlagen: angedockter Dialog, Schrittleiste, Befehlssuche, Tokens (`--sp-*`, `--r-*`, `--fs-*`, `--sh-*`, `--focus`, `--warn`).
4. ✔ Verstellbare Panelbreite + «Arbeitsbereich zurücksetzen» (Tabellen im Teil-Panel lassen sich verbreitern), Warnmeldungen in der Statuszeile hervorgehoben, Werkzeugleiste mit Rand-Hinweis auf schmalen Displays. Offen: Icons vereinheitlichen, Meldungen als Toast statt nur Statuszeile.
5. ✔ Esc bricht den Dialog ab, Enter = nächster Schritt bzw. OK. Offen: Tab-Reihenfolge prüfen, leere Zustände.
6. Laufend: Tests nach jedem Schritt (`npm test`, `tests/app-kern/*.mjs`).
