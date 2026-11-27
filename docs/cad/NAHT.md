# Verbindungsnähte (Werkzeug «Naht»)

`kern/naht.js`, Dialog/Werkzeug in `src/cad.js` (`nahtDialog`, `starteNahtWz`), Test `test/naht.test.js` und `tests/app-kern/naht.mjs`.

- **Kollisionsfrei:** `nahtFolgen` liefert je Blech `{ folge, versatz }`. Das abgesetzte Blech wird gekröpft (Punktnaht: Höhe t, Falz: 3 t), das andere Blech wird um `versatz` zurückgesetzt (negative Zugabe in der Abwicklung), so dass sich die Querschnitte nirgends durchdringen. Prüfung: `test/naht.test.js` (Querschnitts-Raster über 48 Varianten, Toleranz 0,2 mm² wegen berührender Flächen).
- **Punktnaht:** Überlappung (Standard 15 mm). Das abgesetzte Blech bekommt am Kantenbaustein eine Kröpfung um eine Blechstärke (zwei 45°-Biegungen), danach gerade Zugabe; das andere Blech endet davor (Rücksetzung). Die frühere Option «ohne Absetzung» entfällt.
- **Falznaht:** einfacher liegender Falz. «Falzbreite» (10 mm) ist die **gesamte** Breite: vom Fuss der Absetzung bis zum äusseren Hakenende des abgesetzten Blechs (inkl. Kröpfung und Biegung). Der Haken des nicht abgesetzten Blechs liegt mit dem Rücken an der Absetzung (kleinster kollisionsfreier Abstand, `falzMasse`, Raster-Prüfung), sein Hakenmass ergibt sich daraus (`falzA` entfällt). «Mittig»: die Falzmitte liegt genau über der früheren Blechkante, der ganze Falz ist um die halbe Breite verschoben (abgesetztes Blech um die halbe Breite zurückgesetzt, anderes Blech entsprechend verlängert).
- **Schweiss-/Ecknaht:** nur Darstellung (Raupe als Netz, `raupenNetz`), die Bleche ändern sich nicht.
- Wirkung über `berechneKanten` (Flächenblech, hängt an einen vorhandenen Flansch an) und `profilErweiterungen` (Blechprofil, Kante A/B). Rohr/Kegel: Längsnaht «N0/N1» → Zugabe in der Abwicklung (`rundNahtZugabe`) und Überlappungsstreifen im Modell.
- Grenzen: Die Rücksetzung gilt nur beim Flächenblech; an Blechprofilen (Kante A/B) und Rohren/Kegeln ist sie nicht umgesetzt (Kollisionsfreiheit dort ungeprüft). Rohr-Falz im Modell nur als Überlappungsstreifen; Stirnkanten von Blechprofilen noch nicht wählbar. Die Falz-Haken wurden im Querschnitt geprüft, nicht im 3D-Bild.

## Ablauf des Werkzeugs (seit 27.11.2026)
Vier Schritte: Blech A anklicken (Ansicht oder Browser) → Kante an Blech A → Blech B → Kante an Blech B. In den Kantenschritten sind nur die Kanten des gewählten Blechs wählbar (blau, die schon gewählte Kante A orange). Danach öffnet sich das Naht-Fenster. Länge der Naht: ganze Kante oder Teilstück (von/bis ab Anfang Kante A, für Blech B als Anteil in Gegenrichtung).
