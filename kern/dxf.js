// Spengler Digital CAD – Kern: DXF-Export (R12, mm)
// Abwicklung mit Biegelinien und darüber der Querschnitt. Öffnet in BricsCAD, AutoCAD, Fusion.
import { polylinie, grenzen } from "./geometrie.js";

// Zeichnet ein Teil ab (x0, y0) in out und gibt die belegte Höhe zurück
function teil(out, res, laenge, titel, x0 = 0, y0 = 0) {
  const f = (v) => v.toFixed(4);
  const linie = (lay, x1, y1, x2, y2, farbe) => {
    out.push("0", "LINE", "8", lay);
    if (farbe != null) out.push("62", String(farbe));
    out.push("10", f(x1 + x0), "20", f(y1 + y0), "30", "0", "11", f(x2 + x0), "21", f(y2 + y0), "31", "0");
  };
  const text = (lay, x, y, h, s, farbe) => {
    out.push("0", "TEXT", "8", lay);
    if (farbe != null) out.push("62", String(farbe));
    out.push("10", f(x + x0), "20", f(y + y0), "30", "0", "40", h.toFixed(2), "1", ascii(s));
  };
  const W = res.zuschnitt, H = laenge;
  [[0, 0, W, 0], [W, 0, W, H], [W, H, 0, H], [0, H, 0, 0]].forEach(([a, b, c, d]) => linie("ZUSCHNITT", a, b, c, d, 7));
  for (const b of res.biegungen) {
    linie("BIEGELINIEN", b.pos, 0, b.pos, H, 1);
    text("TEXT", b.pos + 1.5, H + 4, 4, `B${b.nr} ${Math.abs(b.winkel)} ${b.richtung}`, 1);
  }
  text("TEXT", 0, -10, 6, `${titel}  Zuschnitt ${W.toFixed(1)} x ${H.toFixed(0)} mm  (Kante A links)`);
  const pts = polylinie(res.pfad);
  const g = grenzen(pts);
  const ox = -g.x0, oy = H + 40 - g.y0;
  for (let i = 0; i < pts.length - 1; i++) linie("PROFIL", pts[i][0] + ox, pts[i][1] + oy, pts[i + 1][0] + ox, pts[i + 1][1] + oy, 5);
  return H + 40 + (g.y1 - g.y0);
}

export function abwicklungDxf(res, laenge, titel) {
  const out = ["0", "SECTION", "2", "ENTITIES"];
  teil(out, res, laenge, titel);
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}

// Flächenblech: Umriss mit Ausklinkungen und Biegelinien (längste Kante waagrecht); gibt die Höhe zurück
function flaeche(out, abw, titel, x0 = 0, y0 = 0) {
  const f = (v) => v.toFixed(4), R = (p) => abw.dreh(p), U = abw.umriss.map(R), g = grenzen(U), dx = x0 - g.x0, dy = y0 - g.y0;
  const linie = (lay, a, b, farbe) => out.push("0", "LINE", "8", lay, "62", String(farbe), "10", f(a[0] + dx), "20", f(a[1] + dy), "30", "0", "11", f(b[0] + dx), "21", f(b[1] + dy), "31", "0");
  U.forEach((p, i) => linie("ZUSCHNITT", p, U[(i + 1) % U.length], 7));
  for (const l of abw.linien) { const q = l.punkte.map(R); for (let i = 1; i < q.length; i++) linie("BIEGELINIEN", q[i - 1], q[i], 1); }
  out.push("0", "TEXT", "8", "TEXT", "10", f(x0), "20", f(y0 - 10), "30", "0", "40", "6.00", "1", ascii(`${titel}  Zuschnitt ${abw.breite.toFixed(1)} x ${abw.laenge.toFixed(1)} mm`));
  return g.y1 - g.y0;
}
export function flaecheDxf(abw, titel) {
  const out = ["0", "SECTION", "2", "ENTITIES"];
  flaeche(out, abw, titel);
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}

// Alle Teile eines Auftrags in einer Datei, übereinander mit Abstand: teile = [{ res, laenge, titel }] oder [{ abw, titel }]
export function abwicklungenDxf(teile, abstand = 80) {
  const out = ["0", "SECTION", "2", "ENTITIES"];
  let y = 0;
  for (const t of teile) y += (t.abw ? flaeche(out, t.abw, t.titel, 0, y) : teil(out, t.res, t.laenge, t.titel, 0, y)) + abstand;
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}

function ascii(s) {
  return s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/[^\x20-\x7e]/g, "?");
}

// Rundblech (Zylinder/Kegel): Zuschnitt mit echten DXF-Bögen; Layer ZUSCHNITT, NAHT (Überlappung anreissen), TEXT
export function rundblechDxf(abw, titel) {
  const f = (v) => v.toFixed(4), out = ["0", "SECTION", "2", "ENTITIES"];
  for (const e of abw.elemente) {
    const farbe = e.lage === "NAHT" ? "1" : "7";
    if (e.typ === "polylinie") { out.push("0", "POLYLINE", "8", e.lage, "62", farbe, "66", "1", "10", "0", "20", "0", "30", "0"); for (const p of e.punkte) out.push("0", "VERTEX", "8", e.lage, "10", f(p[0]), "20", f(p[1]), "30", "0"); out.push("0", "SEQEND", "8", e.lage); }
    else if (e.typ === "linie") out.push("0", "LINE", "8", e.lage, "62", farbe, "10", f(e.a[0]), "20", f(e.a[1]), "30", "0", "11", f(e.b[0]), "21", f(e.b[1]), "31", "0");
    else out.push("0", "ARC", "8", e.lage, "62", farbe, "10", f(e.c[0]), "20", f(e.c[1]), "30", "0", "40", f(e.r), "50", f(e.w0), "51", f(e.w1));
  }
  const m = abw.masse, info = abw.art === "rohr" ? `Zuschnitt ${m.zuschnitt[0].toFixed(1)} x ${m.zuschnitt[1].toFixed(1)} mm, kurz ${m.kurz.toFixed(1)} / lang ${m.lang.toFixed(1)} mm, Neigung ${m.neigung} Grad` : abw.art === "zylinder" ? `Zuschnitt ${m.zuschnitt[0].toFixed(1)} x ${m.zuschnitt[1].toFixed(1)} mm` : `R ${m.R.toFixed(2)} / r ${m.r.toFixed(2)} mm, Winkel ${m.phi.toFixed(3)} Grad`;
  out.push("0", "TEXT", "8", "TEXT", "10", "0", "20", f(-20), "30", "0", "40", "6.00", "1", ascii(`${titel}  ${info}`));
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}
