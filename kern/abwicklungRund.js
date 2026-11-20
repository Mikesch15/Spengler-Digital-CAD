// Spengler Digital CAD – Abwicklung runder Bleche (rein, ohne Abhängigkeiten)
// Zylinder- und Kegelmantel (auch Segmente) sind exakt abwickelbar. Gerechnet wird auf der K-Faser:
//   Radius der Faser rk = r_innen + k·t  (r_innen = Mittelradius − t/2)
// Kegel: Mantellinie s, Abstand der Faser zur Spitze L = rk / sin(α), α = halber Öffnungswinkel; Sektorwinkel φ = θ · sin(α).

const RAD = Math.PI / 180;

// Zylindersegment: rm = Mittelradius, winkel in Grad, hoehe; → Rechteck breite × hoehe
export function zylinderAbwicklung({ rm, t, k, winkel = 360, hoehe }) {
  if (!(rm > t / 2 && t > 0 && hoehe > 0 && winkel > 0 && winkel <= 360)) throw new Error("Zylinder: Radius, Dicke, Höhe und Winkel prüfen");
  const rk = rm - t / 2 + k * t;
  return { art: "rechteck", breite: rk * winkel * RAD, hoehe, flaeche: rk * winkel * RAD * hoehe, faserRadius: rk, exakt: true };
}

// Kegelstumpf-Segment (Radien der Mittelfläche r1 unten, r2 oben, senkrechte Höhe h, Umfangswinkel in Grad)
// → Kreisringsektor mit Aussen-/Innenradius R1/R2 und Öffnungswinkel phi (Grad)
export function kegelAbwicklung({ r1, r2, h, t, k, winkel = 360 }) {
  if (!(h > 0 && t > 0 && r1 >= 0 && r2 >= 0 && r1 !== r2 && winkel > 0 && winkel <= 360)) throw new Error("Kegel: r1 ≠ r2, Höhe, Dicke und Winkel prüfen");
  const s = Math.hypot(r1 - r2, h), sinA = Math.abs(r1 - r2) / s;
  // K-Faser liegt um (k − ½)·t von der Mittelfläche, senkrecht zur Mantellinie → Radien ändern sich um (k − ½)·t·cos(α)
  const d = (k - 0.5) * t * (h / s), rk1 = r1 + d, rk2 = r2 + d;
  const R1 = rk1 / sinA, R2 = rk2 / sinA, phi = winkel * sinA;
  const flaeche = (phi * RAD / 2) * Math.abs(R1 * R1 - R2 * R2);
  return { art: "kreisringsektor", R1, R2, phi, mantellinie: s, flaeche, sehne: 2 * Math.max(R1, R2) * Math.sin((phi * RAD) / 2), exakt: true };
}

// Ist eine Fläche abwickelbar? Für Flächen, deren Gauss-Krümmung überall 0 ist (Ebene, Zylinder, Kegel, Tangentenflächen).
// Nimmt Stichproben der Gauss-Krümmung (vom Kern geliefert) und meldet ehrlich «nicht exakt abwickelbar».
export function abwickelbarkeit(stichprobenGauss, toleranz = 1e-6) {
  const max = Math.max(...stichprobenGauss.map(Math.abs));
  return { abwickelbar: max <= toleranz, maxGauss: max, hinweis: max <= toleranz ? "exakt abwickelbar" : "doppelt gekrümmt – keine exakte Abwicklung möglich (nur Näherung)" };
}
