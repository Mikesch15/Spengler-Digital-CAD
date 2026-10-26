// Spengler Digital CAD – Kern: DXF-Export (R12, mm)
// Abwicklung mit Biegelinien und darüber der Querschnitt. Öffnet in BricsCAD, AutoCAD, Fusion.
import { polylinie, grenzen } from "./geometrie.js";

export function abwicklungDxf(res, laenge, titel) {
  const out = ["0", "SECTION", "2", "ENTITIES"];
  const f = (v) => v.toFixed(4);
  const linie = (lay, x1, y1, x2, y2, farbe) => {
    out.push("0", "LINE", "8", lay);
    if (farbe != null) out.push("62", String(farbe));
    out.push("10", f(x1), "20", f(y1), "30", "0", "11", f(x2), "21", f(y2), "31", "0");
  };
  const text = (lay, x, y, h, s, farbe) => {
    out.push("0", "TEXT", "8", lay);
    if (farbe != null) out.push("62", String(farbe));
    out.push("10", f(x), "20", f(y), "30", "0", "40", h.toFixed(2), "1", ascii(s));
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
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}

function ascii(s) {
  return s.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/[^\x20-\x7e]/g, "?");
}
