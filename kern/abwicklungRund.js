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

// Rundblech (Zylinder- oder Kegelstumpfmantel, auch Segment) – Zuschnittkontur aus exakten Bögen und Linien.
// d1/d2 = Mitteldurchmesser unten/oben (Mittelfläche des Blechs), h = senkrechte Höhe, winkel = Umfangswinkel (360 = ganz),
// zugabe = Überlappung/Falzzugabe an der Naht (Streifen parallel zur Nahtkante, eine Seite), t/k aus dem Material.
// Elemente: { typ: "linie", a, b, lage } | { typ: "bogen", c, r, w0, w1, lage } (Winkel in Grad, gegen den Uhrzeiger von w0 nach w1)
// lage: "ZUSCHNITT" (Schnittkontur) oder "NAHT" (Nahtlinie innerhalb der Zugabe, zum Anreissen).
export function rundblechAbwicklung({ art = "kegel", d1, d2, h, t, k, winkel = 360, zugabe = 0 }) {
  const el = [], z = Math.max(0, +zugabe || 0);
  if (art === "zylinder" || Math.abs(d1 - d2) < 1e-9) {
    const a = zylinderAbwicklung({ rm: d1 / 2, t, k, winkel, hoehe: h }), B = a.breite;
    el.push({ typ: "linie", a: [0, 0], b: [B, 0], lage: "ZUSCHNITT" }, { typ: "linie", a: [B, 0], b: [B, h], lage: "ZUSCHNITT" }, { typ: "linie", a: [B, h], b: [0, h], lage: "ZUSCHNITT" });
    if (z > 0) el.push({ typ: "linie", a: [0, h], b: [-z, h], lage: "ZUSCHNITT" }, { typ: "linie", a: [-z, h], b: [-z, 0], lage: "ZUSCHNITT" }, { typ: "linie", a: [-z, 0], b: [0, 0], lage: "ZUSCHNITT" }, { typ: "linie", a: [0, 0], b: [0, h], lage: "NAHT" });
    else el.push({ typ: "linie", a: [0, h], b: [0, 0], lage: "ZUSCHNITT" });
    return { art: "zylinder", elemente: el, masse: { breite: B, hoehe: h, zugabe: z, zuschnitt: [B + z, h], faserDurchmesser: 2 * a.faserRadius }, exakt: true };
  }
  const a = kegelAbwicklung({ r1: d1 / 2, r2: d2 / 2, h, t, k, winkel }), ra = Math.max(a.R1, a.R2), ri = Math.min(a.R1, a.R2);
  const w0 = 90 - a.phi / 2, w1 = 90 + a.phi / 2, P = (r, w) => [r * Math.cos((w * Math.PI) / 180), r * Math.sin((w * Math.PI) / 180)];
  el.push({ typ: "bogen", c: [0, 0], r: ra, w0, w1, lage: "ZUSCHNITT" }, { typ: "linie", a: P(ra, w1), b: P(ri, w1), lage: "ZUSCHNITT" });
  if (ri > 1e-9) el.push({ typ: "bogen", c: [0, 0], r: ri, w0, w1, lage: "ZUSCHNITT" });
  if (z > 0) { // Zugabestreifen an der Kante bei w0, nach aussen (im Uhrzeigersinn)
    const n = [Math.cos(((w0 - 90) * Math.PI) / 180), Math.sin(((w0 - 90) * Math.PI) / 180)], A = P(ri, w0), Bp = P(ra, w0), off = (p) => [p[0] + n[0] * z, p[1] + n[1] * z];
    el.push({ typ: "linie", a: A, b: off(A), lage: "ZUSCHNITT" }, { typ: "linie", a: off(A), b: off(Bp), lage: "ZUSCHNITT" }, { typ: "linie", a: off(Bp), b: Bp, lage: "ZUSCHNITT" }, { typ: "linie", a: A, b: Bp, lage: "NAHT" });
  } else el.push({ typ: "linie", a: P(ri, w0), b: P(ra, w0), lage: "ZUSCHNITT" });
  const pts = el.flatMap((e) => e.typ === "linie" ? [e.a, e.b] : Array.from({ length: 33 }, (_, i) => P(e.r, e.w0 + ((e.w1 - e.w0) * i) / 32)));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { art: "kegel", elemente: el, masse: { R: ra, r: ri, phi: a.phi, sehne: a.sehne, mantellinie: a.mantellinie, zugabe: z, zuschnitt: [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)] }, exakt: true };
}

// SVG-Vorschau der Abwicklung (Bögen als echte SVG-Bögen)
export function rundblechSvg(abw, { breite = 276, rand = 8 } = {}) {
  const pts = abw.elemente.flatMap((e) => e.typ === "linie" ? [e.a, e.b] : Array.from({ length: 33 }, (_, i) => { const w = ((e.w0 + ((e.w1 - e.w0) * i) / 32) * Math.PI) / 180; return [e.c[0] + e.r * Math.cos(w), e.c[1] + e.r * Math.sin(w)]; }));
  const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const s = (breite - 2 * rand) / Math.max(x1 - x0, 1e-9), H = (y1 - y0) * s + 2 * rand, X = (x) => rand + (x - x0) * s, Y = (y) => H - rand - (y - y0) * s;
  const pfad = (e) => {
    if (e.typ === "linie") return `M${X(e.a[0]).toFixed(2)} ${Y(e.a[1]).toFixed(2)}L${X(e.b[0]).toFixed(2)} ${Y(e.b[1]).toFixed(2)}`;
    const p = (w) => [e.c[0] + e.r * Math.cos((w * Math.PI) / 180), e.c[1] + e.r * Math.sin((w * Math.PI) / 180)], a = p(e.w0), b = p(e.w1);
    return `M${X(a[0]).toFixed(2)} ${Y(a[1]).toFixed(2)}A${(e.r * s).toFixed(2)} ${(e.r * s).toFixed(2)} 0 ${e.w1 - e.w0 > 180 ? 1 : 0} 0 ${X(b[0]).toFixed(2)} ${Y(b[1]).toFixed(2)}`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breite} ${H.toFixed(1)}" width="${breite}" height="${H.toFixed(1)}">` +
    abw.elemente.map((e) => `<path d="${pfad(e)}" fill="none" stroke="${e.lage === "NAHT" ? "#c0392b" : "currentColor"}" stroke-width="${e.lage === "NAHT" ? 0.8 : 1.2}"${e.lage === "NAHT" ? ' stroke-dasharray="4 3"' : ""}/>`).join("") + "</svg>";
}
