// Spengler Digital CAD – Kern: Dachaufbau als einzelne Körper (Sparren, Dämmung, Unterdach, Konter-/Dachlattung, Deckung) + Mengenlisten
// Rechnet je Dachfläche in einem lokalen System: s = entlang der Traufe, t = entlang der Fallinie (nach oben), n = Normale (nach aussen).
// Phase 2: Sparren laufen parallel zur Fallinie und werden am Flächenrand geschnitten (Grat-/Kehlgehrungen folgen in Phase 3).
const sub = (a, b) => a.map((x, i) => x - b[i]), dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };

// Lokales System einer ebenen Fläche (Punkte [u, v, h], Normale nach aussen)
export function flaechenSystem(punkte, normale) {
  const n = norm(normale);
  let up = [0, 0, 1].map((x, i) => x - n[2] * n[i]);
  if (Math.hypot(...up) < 1e-6) up = [0, 1, 0]; // fast flach: Fallinie wird v
  up = norm(up);
  const q = norm(cross(up, n)), o = punkte[0];
  const poly = punkte.map((p) => { const d = sub(p, o); return [dot(d, q), dot(d, up)]; });
  const punkt = (s, t, nn) => o.map((x, i) => x + q[i] * s + up[i] * t + n[i] * nn);
  return { n, q, up, o, poly, punkt };
}
// Schnitt einer konvexen Fläche mit der Geraden «Koordinate k = c» (k = 0: s fest, Intervall in t; k = 1: t fest, Intervall in s)
export function intervall(poly, k, c) {
  const w = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = a[k] - c, db = b[k] - c;
    if (da === 0) w.push(a[1 - k]);
    if (da * db < 0) w.push(a[1 - k] + (b[1 - k] - a[1 - k]) * da / (da - db));
  }
  return w.length < 2 ? null : [Math.min(...w), Math.max(...w)];
}
const spanne = (poly, k) => [Math.min(...poly.map((p) => p[k])), Math.max(...poly.map((p) => p[k]))];
const flaecheEbene = (poly) => poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + (p[0] * q[1] - q[0] * p[1]); }, 0) / 2;

// Rahmen einer Fläche: lokales System, konvexe Stücke in (s, t) und Ausdehnung (für Elemente wie Fenster und Kamin)
export function flaechenRahmen(fl) {
  const S = flaechenSystem(fl.punkte, fl.normale), stuecke = (fl.stuecke || [fl.punkte]).map((st) => st.map((p) => { const d = sub(p, S.o); return [dot(d, S.q), dot(d, S.up)]; })), P = stuecke.flat();
  const [s0, s1] = spanne(P, 0), [t0, t1] = spanne(P, 1); return { S, stuecke, s0, s1, t0, t1 };
}
// Aufbau je Fläche: Liste von Körpern { art, ecken: 8 Punkte [u, v, h] (Index = s0/s1 · t0/t1 · n0/n1), laenge, b, h }
export function flaechenKoerper(fl, sc, aufbau, deckung, opt = {}) {
  const S = flaechenSystem(fl.punkte, fl.normale), stuecke = (fl.stuecke || [fl.punkte]).map((st) => st.map((p) => { const d = sub(p, S.o); return [dot(d, S.q), dot(d, S.up)]; }));
  const P = stuecke.flat(), [s0, s1] = spanne(P, 0), [t0, t1] = spanne(P, 1);
  // Schnitt der Geraden mit allen Stücken: zusammenhängende Abschnitte (benachbarte Stücke verschmelzen)
  const ausschn = opt.ausschnitte || [], abziehen = (l, a, b) => l.flatMap(([x, y]) => (b <= x || a >= y ? [[x, y]] : [...(a > x ? [[x, a]] : []), ...(b < y ? [[b, y]] : [])]));
  const polyAbs = (k, c) => { const l = stuecke.map((st) => intervall(st, k, c)).filter((x) => x && x[1] - x[0] > 1).sort((a, b) => a[0] - b[0]), o = []; for (const x of l) { const z = o[o.length - 1]; if (z && x[0] <= z[1] + 2) z[1] = Math.max(z[1], x[1]); else o.push([x[0], x[1]]); } return o; };
  const abschnitte = (k, c, hw = 0) => {
    let o = polyAbs(k, c);
    for (const a of ausschn) {
      if (a.poly) { // Öffnung als Vieleck (z. B. Lukarne mit Kehlen): Schnitt der Gerade mit dem Vieleck, Streifenbreite mitgenommen
        const iv = [c - hw, c, c + hw].map((x) => intervall(a.poly, k, x)).filter(Boolean); if (!iv.length) continue;
        const lo = Math.min(...iv.map((x) => x[0])) - (k === 0 ? a.wechsel || 0 : 0), hi = Math.max(...iv.map((x) => x[1])) + (k === 0 ? a.wechsel || 0 : 0); o = abziehen(o, lo, hi); continue;
      }
      if (k === 0 && c + hw > a.s0 && c - hw < a.s1) o = abziehen(o, a.t0 - (a.wechsel || 0), a.t1 + (a.wechsel || 0)); else if (k === 1 && c + hw > a.t0 && c - hw < a.t1) o = abziehen(o, a.s0, a.s1);
    }
    return o.filter((x) => x[1] - x[0] > 1);
  };
  const L = Object.fromEntries(sc.liste.map((x) => [x.id, x])), out = [];
  const box = (art, a, b, c, d, nv, nb, extra = {}) => {
    const e = []; for (const nn of [nv, nb]) for (const t of [c, d]) for (const s of [a, b]) e.push(S.punkt(s, t, nn));
    out.push({ art, ecken: e, ...extra });
  };
  const flaeche = stuecke.reduce((a, st) => a + Math.abs(flaecheEbene(st)), 0) / 1e6;
  // Sparren (parallel zur Fallinie), Achsabstand e, erster und letzter bündig mit dem Rand
  const sp = L.sparren, bw = aufbau.sparrenB, e = aufbau.achsabstand, pos = [];
  if (sp && bw > 0 && e > 0) {
    for (let s = s0 + bw / 2; s <= s1 - bw / 2 + 1e-6; s += e) pos.push(s);
    if (s1 - bw / 2 - pos[pos.length - 1] > bw * 1.5) pos.push(s1 - bw / 2);
    for (const s of pos) for (const iv of abschnitte(0, s, bw / 2)) if (iv[1] - iv[0] >= 100) box("sparren", s - bw / 2, s + bw / 2, iv[0], iv[1], sp.von, sp.bis, { laenge: iv[1] - iv[0], b: bw, h: aufbau.sparrenH, s });
  }
  // Dämmung: zwischen den Sparren (Felder) oder als Platte auf den Sparren
  const dm = L.daemmung;
  if (dm && aufbau.daemmung === "zwischen" && pos.length > 1) {
    for (let i = 0; i < pos.length - 1; i++) {
      const a = pos[i] + bw / 2, b = pos[i + 1] - bw / 2; if (b - a < 1) continue;
      for (const iv of abschnitte(0, (a + b) / 2, (b - a) / 2)) box("daemmung", a, b, iv[0], iv[1], dm.von, dm.bis, { flaeche: (b - a) * (iv[1] - iv[0]) / 1e6 });
    }
  } else if (dm) for (const st of stuecke) { const [a, b] = spanne(st, 0), [c, d] = spanne(st, 1); box("daemmung", a, b, c, d, dm.von, dm.bis, { platte: true, flaeche: Math.abs(flaecheEbene(st)) / 1e6 }); }
  // Unterdach und Deckung als Platten
  const ziegel = !!opt.deckungUnsichtbar; // Deckung als Platte nur für die Mengen, wenn die Eindeckung die Ziegel einzeln zeichnet
  for (const id of ["unterdach", "deckung"]) if (L[id] && L[id].bis > L[id].von) for (const st of stuecke) { const [a, b] = spanne(st, 0), [c, d] = spanne(st, 1); box(id, a, b, c, d, L[id].von, L[id].bis, { platte: true, flaeche: Math.abs(flaecheEbene(st)) / 1e6, unsichtbar: id === "deckung" && ziegel }); }
  // Wechsel (Auswechslungen) oberhalb und unterhalb jeder Öffnung zwischen den nächsten durchlaufenden Sparren
  if (sp && pos.length) for (const a of ausschn) {
    const links = pos.filter((q) => q + bw / 2 <= a.s0), rechts = pos.filter((q) => q - bw / 2 >= a.s1), sa = links.length ? links.at(-1) + bw / 2 : s0, sb = rechts.length ? rechts[0] - bw / 2 : s1;
    for (const [ta, tb] of [[a.t0 - bw, a.t0], [a.t1, a.t1 + bw]]) if (sb - sa > 1 && tb <= t1 + 1 && ta >= t0 - 1) box("wechsel", sa, sb, ta, tb, sp.von, sp.bis, { laenge: sb - sa, b: bw, h: aufbau.sparrenH, name: a.name });
  }
  // Konterlattung über den Sparren
  const ko = L.konter;
  if (ko && pos.length) for (const s of pos) for (const iv of abschnitte(0, s, aufbau.konterB / 2)) box("konter", s - aufbau.konterB / 2, s + aufbau.konterB / 2, iv[0], iv[1], ko.von, ko.bis, { laenge: iv[1] - iv[0], b: aufbau.konterB, h: aufbau.konterH });
  // Dachlattung: horizontal, Lattweite ab Traufe
  const la = L.lattung, lw = deckung.lattweite, lb = deckung.lattenB;
  if (la && lw > 0) {
    const lt = [], erste = t0 + lb / 2;
    for (let t = erste; t <= t1 - lb / 2 + 1e-6; t += lw) lt.push(t);
    if (!lt.length || t1 - lb / 2 - lt[lt.length - 1] > lw * 0.4) lt.push(t1 - lb / 2); // Firstlatte
    for (const t of lt) for (const iv of abschnitte(1, t, lb / 2)) box("lattung", iv[0], iv[1], t - lb / 2, t + lb / 2, la.von, la.bis, { laenge: iv[1] - iv[0], b: lb, h: deckung.lattenH });
  }
  return { kante: fl.kante, name: fl.name, flaeche, koerper: out };
}

// Mengen über alle Flächen: Holzliste (Querschnitt, Länge, Stück), Latten (laufende Meter), Flächen, Ziegel
export function dachMengen(flaechen, deckung, linien = [], abzug = 0) {
  const holz = new Map(), lm = { konter: new Map(), lattung: new Map() }, wechsel = new Map();
  let daemm = 0, unterdach = 0, deck = 0;
  for (const f of flaechen) {
    for (const k of f.koerper) {
      if (k.art === "sparren") { const l = Math.round(k.laenge / 10) * 10, key = `${k.b}/${k.h}|${l}`; const h = holz.get(key) || { querschnitt: `${k.b}/${k.h}`, laenge: l, stueck: 0 }; h.stueck++; holz.set(key, h); }
      else if (k.art === "wechsel") { const l = Math.round(k.laenge / 10) * 10, key = `${k.b}/${k.h}|${l}`, h = wechsel.get(key) || { querschnitt: `${k.b}/${k.h}`, laenge: l, stueck: 0 }; h.stueck++; wechsel.set(key, h); }
      else if (k.art === "konter" || k.art === "lattung") { const key = `${k.b}/${k.h}`, h = lm[k.art].get(key) || { querschnitt: key, meter: 0, stueck: 0 }; h.meter += k.laenge / 1000; h.stueck++; lm[k.art].set(key, h); }
      else if (k.art === "daemmung") daemm += k.flaeche;
      else if (k.art === "unterdach") unterdach += k.flaeche;
      else if (k.art === "deckung") deck += k.flaeche;
    }
  }
  const r2 = (x) => Math.round(x * 100) / 100; daemm = Math.max(0, daemm - abzug); unterdach = Math.max(0, unterdach - abzug); deck = Math.max(0, deck - abzug);
  const gk = new Map(); // Grat- und Kehlsparren: Länge der Linie, auf 10 mm gerundet
  for (const l of linien) if (l.art === "grat" || l.art === "kehle") { const len = Math.round(l.laenge / 10) * 10, key = l.art + "|" + len, h = gk.get(key) || { art: l.art === "grat" ? "Gratsparren" : "Kehlsparren", laenge: len, stueck: 0 }; h.stueck++; gk.set(key, h); }
  return {
    wechsel: [...wechsel.values()].sort((a, b) => a.laenge - b.laenge), abzug: r2(abzug), gratKehl: [...gk.values()].sort((a, b) => a.laenge - b.laenge), sparren: [...holz.values()].sort((a, b) => a.laenge - b.laenge), konter: [...lm.konter.values()].map((x) => ({ ...x, meter: r2(x.meter) })), lattung: [...lm.lattung.values()].map((x) => ({ ...x, meter: r2(x.meter) })),
    daemmung: r2(daemm), unterdach: r2(unterdach), deckflaeche: r2(deck),
    ziegel: Math.ceil(deck * (deckung.stueckProM2 || 0)), gewichtKg: Math.round(deck * (deckung.gewichtProM2 || 0)),
  };
}
