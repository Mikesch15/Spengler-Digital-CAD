# Verbindungsnähte (Werkzeug «Naht»)

`kern/naht.js`, Dialog/Werkzeug in `src/cad.js` (`nahtDialog`, `starteNahtWz`), Test `test/naht.test.js` und `tests/app-kern/naht.mjs`.

- **Kollisionsfrei:** `nahtFolgen` liefert je Blech `{ folge, versatz }`. Das abgesetzte Blech wird gekröpft (Punktnaht: Höhe t, Falz: 3 t), das andere Blech wird um `versatz` zurückgesetzt (negative Zugabe in der Abwicklung), so dass sich die Querschnitte nirgends durchdringen. Prüfung: `test/naht.test.js` (Querschnitts-Raster über 48 Varianten, Toleranz 0,2 mm² wegen berührender Flächen).
- **Punktnaht:** Überlappung (Standard 15 mm). Das abgesetzte Blech bekommt am Kantenbaustein eine Kröpfung um eine Blechstärke (zwei 45°-Biegungen), danach gerade Zugabe; das andere Blech endet davor (Rücksetzung). Die frühere Option «ohne Absetzung» entfällt.
- **Falznaht:** einfacher liegender Falz. Blech mit Haken: Umschlag 5 mm (nach `U±r(t/2)`), abgesetztes Blech: Kröpfung 3 t, gerader Lauf unter dem Haken und 180°-Bogen um dessen Ende (10 mm); «mittig»: je Hälfte der Summe (7,5 mm).
- **Schweiss-/Ecknaht:** nur Darstellung (Raupe als Netz, `raupenNetz`), die Bleche ändern sich nicht.
- Wirkung über `berechneKanten` (Flächenblech, hängt an einen vorhandenen Flansch an) und `profilErweiterungen` (Blechprofil, Kante A/B). Rohr/Kegel: Längsnaht «N0/N1» → Zugabe in der Abwicklung (`rundNahtZugabe`) und Überlappungsstreifen im Modell.
- Grenzen: Die Rücksetzung gilt nur beim Flächenblech; an Blechprofilen (Kante A/B) und Rohren/Kegeln ist sie nicht umgesetzt (Kollisionsfreiheit dort ungeprüft). Rohr-Falz im Modell nur als Überlappungsstreifen; Stirnkanten von Blechprofilen noch nicht wählbar. Die Falz-Haken wurden im Querschnitt geprüft, nicht im 3D-Bild.
