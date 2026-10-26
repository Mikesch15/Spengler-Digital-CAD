// Spengler Digital CAD – Kern: Geometrie- und Abwicklungsrechnung
// Reines JavaScript ohne Abhängigkeiten. Läuft im Browser, in Node und später im PC-Programm.
//
// Ein Profil ist eine Folge von Operationen:
//   { typ: "schenkel", L }                         Schenkel, Länge mm
//   { typ: "biegung", winkel, ri, modus }          winkel in Grad (+ = links/oben, - = rechts/unten)
//        ri    Innenradius mm (null = Materialstandard)
//        modus "sharp"   Schenkelmasse bis zur virtuellen Kante
//              "hem"     180-Grad-Umschlag, Mass bis Aussenkante
//              "tangent" Rundung (Rinne, Wulst), gerade Längen bis Tangentenpunkt
// Gemessen wird auf der Blechmitte.

export class ProfilFehler extends Error {}

const rad = (g) => (g * Math.PI) / 180;

function rueckversatz(op, t, riStd) {
  const ri = op.ri ?? riStd;
  const rm = ri + t / 2;
  if (op.modus === "tangent") return 0;
  if (op.modus === "hem" || Math.abs(op.winkel) >= 175) return rm + t / 2;
  return rm * Math.tan(rad(Math.abs(op.winkel)) / 2);
}

export function berechne(startWinkel, ops, t, riStd, k) {
  if (!(t > 0)) throw new ProfilFehler("Blechdicke muss grösser als 0 sein");
  const gerade = new Map();
  ops.forEach((op, i) => {
    if (op.typ !== "schenkel") return;
    let sb = 0;
    if (ops[i - 1]?.typ === "biegung") sb += rueckversatz(ops[i - 1], t, riStd);
    if (ops[i + 1]?.typ === "biegung") sb += rueckversatz(ops[i + 1], t, riStd);
    const s = op.L - sb;
    if (s < -1e-6) {
      const nr = ops.slice(0, i + 1).filter((o) => o.typ === "schenkel").length;
      throw new ProfilFehler(`Schenkel ${nr} (${op.L} mm) ist zu kurz für die Biegeradien`);
    }
    gerade.set(i, Math.max(s, 0));
  });

  let x = 0, y = 0, th = rad(startWinkel);
  const pfad = [], biegungen = [], schenkel = [], beschriftungen = [];
  let pos = 0;
  ops.forEach((op, i) => {
    if (op.typ === "schenkel") {
      const s = gerade.get(i);
      schenkel.push(op.L);
      if (s > 1e-6) {
        const x2 = x + s * Math.cos(th), y2 = y + s * Math.sin(th);
        pfad.push({ typ: "linie", p1: [x, y], p2: [x2, y2] });
        beschriftungen.push({ x: (x + x2) / 2, y: (y + y2) / 2, richtung: th, mass: op.L, nr: schenkel.length });
        x = x2; y = y2;
      }
      pos += s;
    } else if (op.typ === "biegung") {
      const ri = op.ri ?? riStd;
      const a = rad(op.winkel);
      const rm = ri + t / 2;
      const sg = a > 0 ? 1 : -1;
      const cx = x - sg * rm * Math.sin(th), cy = y + sg * rm * Math.cos(th);
      const a0 = Math.atan2(y - cy, x - cx);
      const rot = (w) => [cx + rm * Math.cos(a0 + w), cy + rm * Math.sin(a0 + w)];
      const p2 = rot(a);
      pfad.push({ typ: "bogen", p1: [x, y], pm: rot(a / 2), p2, zentrum: [cx, cy], rm, start: a0, winkel: op.winkel });
      const bogenLaenge = (ri + k * t) * Math.abs(a);
      biegungen.push({
        nr: biegungen.length + 1,
        pos: pos + bogenLaenge / 2,
        von: pos,
        bis: pos + bogenLaenge,
        winkel: op.winkel,
        ri,
        art: { sharp: "Abkanten", hem: "Umschlag", tangent: "Rundung" }[op.modus],
        richtung: op.winkel > 0 ? "oben" : "unten",
      });
      pos += bogenLaenge;
      [x, y] = p2;
      th += a;
    } else {
      throw new ProfilFehler(`Unbekannte Operation ${JSON.stringify(op)}`);
    }
  });

  return {
    pfad,
    zuschnitt: pos,
    summeSchenkel: schenkel.reduce((s, v) => s + v, 0),
    biegungen,
    schenkel,
    beschriftungen,
    hatRundung: biegungen.some((b) => b.art === "Rundung"),
  };
}

// Pfad als Punktliste (Bögen fein unterteilt)
export function polylinie(pfad, schrittGrad = 4) {
  const pts = [];
  const add = (p) => {
    const l = pts[pts.length - 1];
    if (!l || Math.hypot(l[0] - p[0], l[1] - p[1]) > 1e-6) pts.push(p);
  };
  for (const el of pfad) {
    if (el.typ === "linie") { add(el.p1); add(el.p2); continue; }
    const n = Math.max(4, Math.ceil(Math.abs(el.winkel) / schrittGrad));
    const a = rad(el.winkel);
    for (let i = 0; i <= n; i++) {
      const w = el.start + (a * i) / n;
      add([el.zentrum[0] + el.rm * Math.cos(w), el.zentrum[1] + el.rm * Math.sin(w)]);
    }
  }
  return pts;
}

export function grenzen(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

// Geschlossene Blechkontur (Querschnitt mit Dicke) für 3D und Export.
// Exakt: Linien parallel versetzt, Bögen mit Radius rm ± t/2.
export function kontur(pfad, t, schrittGrad = 4) {
  const h = t / 2;
  const seite = (vz) => {
    const pts = [];
    const add = (p) => {
      const l = pts[pts.length - 1];
      if (!l || Math.hypot(l[0] - p[0], l[1] - p[1]) > 1e-6) pts.push(p);
    };
    for (const el of pfad) {
      if (el.typ === "linie") {
        const dx = el.p2[0] - el.p1[0], dy = el.p2[1] - el.p1[1], L = Math.hypot(dx, dy);
        const nx = (-dy / L) * h * vz, ny = (dx / L) * h * vz; // links = +
        add([el.p1[0] + nx, el.p1[1] + ny]);
        add([el.p2[0] + nx, el.p2[1] + ny]);
      } else {
        // Linke Seite liegt bei Linksbiegung innen (rm - h), bei Rechtsbiegung aussen
        const links = el.winkel > 0;
        const r = el.rm + (vz > 0 === links ? -h : h);
        const n = Math.max(4, Math.ceil(Math.abs(el.winkel) / schrittGrad));
        const a = rad(el.winkel);
        for (let i = 0; i <= n; i++) {
          const w = el.start + (a * i) / n;
          add([el.zentrum[0] + r * Math.cos(w), el.zentrum[1] + r * Math.sin(w)]);
        }
      }
    }
    return pts;
  };
  const links = seite(1), rechts = seite(-1);
  return links.concat(rechts.reverse());
}
