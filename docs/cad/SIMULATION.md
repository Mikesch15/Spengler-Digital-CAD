# Simulation (Tragfähigkeit von Blechen)

Reiter **Simulation**. Lineare Schalen-FEM auf der Blech-Mittelfläche – **Richtwert, kein statischer Nachweis**.

## Aufbau
- `kern/fem/schale.js` Dreieckselement: Scheibe (CST) + Platte (DKT, Batoz) + kleiner Bohrfreiheitsgrad; Spannungen, geometrische Steifigkeit.
- `kern/fem/loeser.js` Skyline-Cholesky mit RCM-Sortierung, `system()` zerlegt einmal, `solve()` für beliebig viele Lastfälle (Superposition).
- `kern/fem/netz.js` Delaunay-Netz für Flächen, Streifen für Flansche/Profile, Knoten über Lage verschweisst.
- `kern/fem/blechmodell.js` Quellen → Modell: Profile (Mittellinie × Länge), Flächenblech (Platte + Flansche je Kantenbaustein). Biegezone über der Platte ist zum Flanschfuss zusammengezogen.
- `kern/fem/studie.js` Auswahl (Fläche/Kante/Punkt), Lager, Lasten, Lastfälle, Kombinationen, Auswertung, Höchstlast.
- `kern/fem/beulen.js` lineare Beulrechnung (Teilraum-Iteration auf −K⁻¹Kg).
- `kern/fem/normen.js` Schnee (SIA 261 vereinfacht), Wind (q_p·c_p), Person 1 kN/100×100, GZT/GZG-Kombinationen. `kern/fem/werkstoff.js` E, Rp0,2 je Material (Einstellungen überschreibbar, Felder `emod`, `rp`).
- `kern/fem/bericht.js` Berichtsseite. `src/simulation.js` Fenster, Auswahl per Klick, Marken, Ergebnisfarben.

## Ergebnisse
- Höchstlast = angesetzte Last × min(Rp0,2/γM ÷ σ_v,max, Durchbiegungsgrenze ÷ u_max, λ_Beulen) – linear, Faktor gilt nur im elastischen Bereich.
- Spannungsspitzen an Punktlagern und Einzelkräften sind Singularitäten → Fläche/Kante wählen.
- Getestet gegen Zugstab, Kragarm (PL³/3EI), Platte unter Druck (0.00406·q·a⁴/D), Plattenbeulen (k=4), Gleichgewicht am gefalteten Blech: `test/fem.test.js`, App: `tests/app-kern/simulation.mjs`.
- Grenzen: ebene/zylindrische Mittelflächen, keine Kontakte, kein Plastizieren, keine Quetschfalten/Ecklaschen im Modell, Eckverbindungen der Flansche vereinfacht.
