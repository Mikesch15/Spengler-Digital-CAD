# Verbindungsnähte (Werkzeug «Naht»)

`kern/naht.js`, Dialog/Werkzeug in `src/cad.js` (`nahtDialog`, `starteNahtWz`), Test `test/naht.test.js` und `tests/app-kern/naht.mjs`.

- **Punktnaht:** Überlappung (Standard 15 mm). Das abgesetzte Blech bekommt am Kantenbaustein eine Kröpfung um genau eine Blechstärke (zwei 45°-Biegungen), danach gerade Zugabe. Ohne Absetzung: gerade Verlängerung («0°-Biegung», keine Biegelinie).
- **Falznaht:** einfacher liegender Falz. Nicht abgesetztes Blech: Umschlag 5 mm, abgesetztes Blech: Kröpfung + Umschlag 10 mm; «mittig»: je Hälfte der Summe (7,5 mm).
- **Schweiss-/Ecknaht:** nur Darstellung (Raupe als Netz, `raupenNetz`), die Bleche ändern sich nicht.
- Wirkung über `berechneKanten` (Flächenblech, hängt an einen vorhandenen Flansch an) und `profilErweiterungen` (Blechprofil, Kante A/B). Rohr/Kegel: Längsnaht «N0/N1» → Zugabe in der Abwicklung (`rundNahtZugabe`) und Überlappungsstreifen im Modell.
- Grenzen: Falz-Haken im 3D nur als Umschläge dargestellt (keine Kollisionsprüfung zwischen den Haken); Rohr-Falz im Modell nur als Überlappungsstreifen; Stirnkanten von Blechprofilen noch nicht wählbar.
