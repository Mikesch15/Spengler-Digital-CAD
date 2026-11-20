# Phase D – Spengler-CAD (laufender Bericht)

## D1 – Rund-/Kegelblech mit exakter Abwicklung (erledigt, 20.11.2026)

Neues Werkzeug **Blech ▾ → Rund-/Kegelblech** für Zylinder- und Kegelmäntel (Rohr, Kaminhut, Trichter, Rinnenstutzen), auch als Segment.
- **Eingaben:** Ø unten/oben auf der Blechmitte (0 = Spitze), Höhe, Umfangswinkel, Zugabe an der Naht, Material, Grundebene, Stückzahl.
- **Abwicklung (`kern/abwicklungRund.js`, rein, getestet):**
  - Gerechnet wird auf der **K-Faser** des Materials. Beim Kegel verschiebt sich die Faser senkrecht zur Mantellinie, daraus folgt rk = r + (k − ½)·t·cos α.
  - Kontur aus exakten Bögen und Linien. Die Nahtzugabe ist ein Streifen parallel zur Nahtkante; die Nahtlinie liegt auf einem eigenen Layer.
- **Werkstatt:**
  - Zuschnitt-Rechteck, R/r, Öffnungswinkel, Sehne, Mantellinie bzw. Abwicklungsbreite und Ø der K-Faser, Gewicht
  - SVG-Vorschau mit echten Bögen
  - **DXF mit echten ARC-Bögen**, Layer ZUSCHNITT / NAHT / TEXT
  - Masse kopieren
- **3D:**
  - Netz: Drehkörper aus dem Meridian-Querschnitt (Dicke senkrecht zur Mantellinie).
  - Kern ein: exakter Drehkörper aus demselben Querschnitt, gleiche Lage und Drehrichtung. Er ist in «STEP exakt» und «Eigenschaften» enthalten.

**Tests**
- **`test/abwicklungRund.test.js` (10):**
  - Zylinderbreite = π·(d − t + 2kt).
  - Kegel: Bogenlängen = Umfänge der K-Faser, R − r = Mantellinie.
  - Spitzkegel-Segment, φ = Winkel·sin α.
  - Kontur geschlossen, auch mit Zugabe.
  - DXF: 2 ARC, Layer NAHT, wieder einlesbar.
  - SVG mit Bögen.
- **`tests/app-kern/rundblech.mjs` (10), mit Kern aus und ein:**
  - Werkzeug und Dialog-Info (R 360,5 / r 180,2 / 199,69°).
  - Volumen = t · Mantelfläche (Pappus): Netz auf 1 %, exakt auf 0,2 % (Anzeigenetz).
  - Lage auf der XZ-Grundfläche, Achse Y.
  - DXF aus der Werkstatt, keine Seitenfehler.

**D1b:** Rundbleche stehen jetzt in **Stückliste, CSV und Materialbedarf** (Materialverbrauch = Rechteck um die Abwicklung, so in der Notiz vermerkt). App-Test 12/12.

**Noch nicht:**
- Rundbleche sind nicht im gedruckten Werkstattblatt und nicht in «Alle als DXF»; die Einzel-DXF in der Werkstatt gibt es.
- Schräg abgeschnittene Rohre (Rohr an Dachneigung) und Übergänge rund ↔ eckig fehlen noch; das wäre der nächste Schritt in Phase D.

## D2 – Rohr mit schrägem Anschnitt (Dachdurchführung) (erledigt, 20.11.2026)
- Rund-/Kegelblech, Form Zylinder: neues Feld **«Anschnitt unten (Dachneigung)»**. Die Höhe ist dann die kürzeste Mantellinie.
- **Abwicklung:** Die Unterkante ist die exakte Funktion L(θ) = h + rk·tan α·(1 − cos θ) auf der K-Faser, Naht bei der kürzesten Seite. Ausgabe als Polylinie in 1°-Schritten: **eine Näherung der exakten Kurve, als solche ausgewiesen**. Werkstatt: Länge kurz/lang, Breite, Gewicht (Fläche integriert).
- **3D:** ohne Kern Netz mit Netz-CSG-Schnitt, mit Kern Drehkörper mit Halbraum-Schnitt. Schnittebene durch den Ursprung der Grundebene.
- **Kegel mit Anschnitt** wird abgewiesen («nur beim Zylinder»), da noch nicht exakt umgesetzt.
- **Tests:**
  - Kern (+4): lang = h + 2·rk·tan α, Kurve = L(θ), DXF-Polylinie lesbar, Kegel abgewiesen
  - App (+6): Volumen = t·2π·rm·(h + rm·tan α) – exakt auf 0,003 %, Netz auf 0,1 %. Oberkante und tiefster Punkt geprüft, mit Kern aus und ein.
