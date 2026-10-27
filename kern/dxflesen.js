// Spengler Digital CAD – DXF lesen (2D) → Skizzenelemente: Linien, Polylinien (mit Bögen), Kreise, Bögen, Splines, Ellipsen.
// Einheiten aus $INSUNITS (mm, cm, m, Zoll, Fuss); Blöcke (INSERT) werden aufgelöst, Texte und Schraffuren übersprungen.

const FAKTOR = { 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000 };

// Gruppencode/Wert-Paare
function paare(text) {
  const z = text.split(/\r?\n/), out = [];
  for (let i = 0; i + 1 < z.length; i += 2) out.push([+z[i].trim(), z[i + 1].trim()]);
  return out;
}
// Abschnitte in Objekte: { typ, werte: [[code, wert] …] }
function objekte(p, von, bis) {
  const out = []; let cur = null;
  for (let i = von; i < bis; i++) {
    const [c, v] = p[i];
    if (c === 0) { cur = { typ: v, werte: [] }; out.push(cur); } else if (cur) cur.werte.push([c, v]);
  }
  return out;
}
const wert = (o, c, d = 0) => { const w = o.werte.find(([k]) => k === c); return w ? +w[1] : d; };
const alle = (o, c) => o.werte.filter(([k]) => k === c).map(([, v]) => +v);

// Bogen aus zwei Punkten und Bulge (tan(¼·Öffnungswinkel), + = gegen den Uhrzeiger)
function bulgeBogen(a, b, bulge) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < 1e-12) return null;
  const theta = 4 * Math.atan(bulge), r = d / (2 * Math.sin(theta / 2));
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, h = r * Math.cos(theta / 2); // Abstand Sehnenmitte – Zentrum (vorzeichenbehaftet)
  const nx = -(b[1] - a[1]) / d, ny = (b[0] - a[0]) / d;
  const c = [mx + nx * h, my + ny * h], wa = Math.atan2(a[1] - c[1], a[0] - c[0]), wm = wa + theta / 2, R = Math.abs(r);
  return { art: "bogen", a, b, m: [c[0] + R * Math.cos(wm), c[1] + R * Math.sin(wm)] };
}
// Polylinie mit Bulges → Elemente (gerade Abschnitte zusammen als Linienzug)
function polylinie(pts, bulges, geschlossen) {
  const out = []; let zug = [pts[0]];
  const n = pts.length, kanten = geschlossen ? n : n - 1;
  const zugFertig = () => { if (zug.length > 1) out.push({ art: "linie", pts: zug }); };
  for (let i = 0; i < kanten; i++) {
    const a = pts[i], b = pts[(i + 1) % n], bu = bulges[i] || 0;
    if (Math.abs(bu) > 1e-9) { zugFertig(); const bo = bulgeBogen(a, b, bu); if (bo) out.push(bo); zug = [b]; }
    else zug.push(b);
  }
  if (geschlossen && out.length === 0 && zug.length > 3) { zug.pop(); return [{ art: "linie", pts: zug, geschlossen: true }]; } // reines Polygon
  zugFertig();
  return out;
}
// B-Spline auswerten (de Boor) → Punkte
function bspline(grad, knoten, kp, n = 64) {
  const k = grad, lo = knoten[k], hi = knoten[knoten.length - k - 1], out = [];
  for (let s = 0; s <= n; s++) {
    const t = lo + ((hi - lo) * s) / n;
    let i = k; while (i < kp.length - 1 && t >= knoten[i + 1]) i++;
    const d = []; for (let j = 0; j <= k; j++) d.push(kp[Math.max(0, Math.min(kp.length - 1, i - k + j))].slice());
    for (let r = 1; r <= k; r++) for (let j = k; j >= r; j--) {
      const a0 = knoten[i - k + j], a1 = knoten[i + 1 + j - r], al = a1 - a0 < 1e-12 ? 0 : (t - a0) / (a1 - a0);
      d[j] = [(1 - al) * d[j - 1][0] + al * d[j][0], (1 - al) * d[j - 1][1] + al * d[j][1]];
    }
    out.push(d[k]);
  }
  return out;
}

export function dxfLesen(text) {
  const p = paare(text);
  const abschnitt = (name) => { const i = p.findIndex(([c, v], k) => c === 0 && v === "SECTION" && p[k + 1]?.[0] === 2 && p[k + 1][1] === name); if (i < 0) return null; let j = i; while (j < p.length && !(p[j][0] === 0 && p[j][1] === "ENDSEC")) j++; return [i + 2, j]; };
  // Einheit
  let faktor = 1; const h = abschnitt("HEADER");
  if (h) for (let i = h[0]; i < h[1]; i++) if (p[i][0] === 9 && p[i][1] === "$INSUNITS") faktor = FAKTOR[+p[i + 1][1]] ?? 1;
  // Blöcke
  const bloecke = new Map(), b = abschnitt("BLOCKS");
  if (b) { let cur = null; for (const o of objekte(p, b[0], b[1])) { if (o.typ === "BLOCK") { cur = { name: o.werte.find(([c]) => c === 2)?.[1], basis: [wert(o, 10), wert(o, 20)], obj: [] }; bloecke.set(cur.name, cur); } else if (o.typ === "ENDBLK") cur = null; else cur?.obj.push(o); } }
  const e = abschnitt("ENTITIES"); if (!e) throw new Error("DXF ohne ENTITIES-Abschnitt");
  const elemente = [], uebersprungen = {};
  const umsetzen = (liste, T, tiefe = 0) => {
    // POLYLINE/VERTEX/SEQEND zusammenfassen
    for (let i = 0; i < liste.length; i++) {
      const o = liste[i], P = (x, y) => T([x, y]);
      switch (o.typ) {
        case "LINE": elemente.push({ art: "linie", pts: [P(wert(o, 10), wert(o, 20)), P(wert(o, 11), wert(o, 21))] }); break;
        case "LWPOLYLINE": {
          const xs = alle(o, 10), ys = alle(o, 20), pts = xs.map((x, k) => P(x, ys[k])), bul = []; let k = -1;
          for (const [c, v] of o.werte) { if (c === 10) k++; else if (c === 42) bul[k] = +v; }
          if (pts.length > 1) elemente.push(...polylinie(pts, bul, (wert(o, 70) & 1) === 1)); break;
        }
        case "POLYLINE": {
          const pts = [], bul = []; let j = i + 1;
          for (; j < liste.length && liste[j].typ === "VERTEX"; j++) { pts.push(P(wert(liste[j], 10), wert(liste[j], 20))); bul.push(wert(liste[j], 42)); }
          if (pts.length > 1) elemente.push(...polylinie(pts, bul, (wert(o, 70) & 1) === 1));
          i = j; break; // SEQEND
        }
        case "CIRCLE": { const c = P(wert(o, 10), wert(o, 20)), q = P(wert(o, 10) + wert(o, 40), wert(o, 20)); elemente.push({ art: "kreis", c, r: Math.hypot(q[0] - c[0], q[1] - c[1]) }); break; }
        case "ARC": {
          const cx = wert(o, 10), cy = wert(o, 20), r = wert(o, 40), w1 = (wert(o, 50) * Math.PI) / 180; let w2 = (wert(o, 51) * Math.PI) / 180; if (w2 <= w1) w2 += 2 * Math.PI;
          const pt = (w) => P(cx + r * Math.cos(w), cy + r * Math.sin(w));
          elemente.push({ art: "bogen", a: pt(w1), b: pt(w2), m: pt((w1 + w2) / 2) }); break;
        }
        case "ELLIPSE": {
          const cx = wert(o, 10), cy = wert(o, 20), ax = wert(o, 11), ay = wert(o, 21), q = wert(o, 40, 1), t1 = wert(o, 41, 0), t2 = wert(o, 42, 2 * Math.PI);
          const voll = Math.abs(t2 - t1 - 2 * Math.PI) < 1e-6 || Math.abs(t2 - t1) < 1e-9;
          if (voll) { const c = P(cx, cy), a = P(cx + ax, cy + ay), b2 = P(cx - ay * q, cy + ax * q); elemente.push({ art: "ellipse", c, a, r2: Math.hypot(b2[0] - c[0], b2[1] - c[1]) }); break; }
          const pts = []; let e2 = t2; if (e2 < t1) e2 += 2 * Math.PI;
          for (let s = 0; s <= 48; s++) { const t = t1 + ((e2 - t1) * s) / 48; pts.push(P(cx + ax * Math.cos(t) - ay * q * Math.sin(t), cy + ay * Math.cos(t) + ax * q * Math.sin(t))); }
          elemente.push({ art: "linie", pts }); break;
        }
        case "SPLINE": {
          const grad = wert(o, 71, 3), knoten = alle(o, 40), kx = alle(o, 10), ky = alle(o, 20), fx = alle(o, 11), fy = alle(o, 21), zu = (wert(o, 70) & 1) === 1;
          let pts;
          if (kx.length > grad && knoten.length === kx.length + grad + 1) pts = bspline(grad, knoten, kx.map((x, k) => [x, ky[k]]));
          else if (fx.length > 1) pts = fx.map((x, k) => [x, fy[k]]);
          if (pts?.length > 1) { const q = pts.map(([x, y]) => P(x, y)); if (zu && q.length > 3) { q.pop(); elemente.push({ art: "linie", pts: q, geschlossen: true }); } else elemente.push({ art: "linie", pts: q }); }
          break;
        }
        case "INSERT": {
          const bl = bloecke.get(o.werte.find(([c]) => c === 2)?.[1]); if (!bl || tiefe > 8) break;
          const ix = wert(o, 10), iy = wert(o, 20), sx = wert(o, 41, 1), sy = wert(o, 42, 1), w = (wert(o, 50) * Math.PI) / 180, c = Math.cos(w), s = Math.sin(w);
          umsetzen(bl.obj, ([x, y]) => { const u = (x - bl.basis[0]) * sx, v = (y - bl.basis[1]) * sy; return T([ix + u * c - v * s, iy + u * s + v * c]); }, tiefe + 1);
          break;
        }
        case "VERTEX": case "SEQEND": break;
        default: uebersprungen[o.typ] = (uebersprungen[o.typ] || 0) + 1;
      }
    }
  };
  umsetzen(objekte(p, e[0], e[1]), ([x, y]) => [x * faktor, y * faktor]);
  return { elemente, faktor, uebersprungen };
}
