// Flächen (Regionen) einer Skizze wie in Fusion: alle Linien werden an ihren Schnittpunkten getrennt, aus dem entstehenden
// ebenen Netz werden alle geschlossenen Teilflächen gebildet – auch Überlappungen, Teilflächen eines durchzogenen Rechtecks
// und Flächen mit Löchern (Insel im Innern). Reine Rechnung, Einheiten beliebig (mm).
const EPS = 1e-9;
const kreuz2 = (a, b) => a[0] * b[1] - a[1] * b[0];
const flaecheVon = (p) => p.reduce((s, q, i) => s + kreuz2(q, p[(i + 1) % p.length]), 0) / 2;
export const punktInPolygon = (pt, p) => {
  let drin = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) drin = !drin;
  }
  return drin;
};
// liegt p in der Region (innerhalb der Aussenkontur, ausserhalb aller Löcher)?
export const inRegion = (r, p) => punktInPolygon(p, r.aussen) && !r.loecher.some((l) => punktInPolygon(p, l));

// Punkt im Innern einer Region (breitestes Stück einer waagrechten Schnittlinie), für Auswahl und Wiedererkennung
function innenpunkt(aussen, loecher) {
  const ringe = [aussen, ...loecher], ys = aussen.map((q) => q[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  let best = null, bw = -1;
  for (const f of [0.5, 0.4, 0.6, 0.3, 0.7, 0.2, 0.8, 0.1, 0.9]) {
    const y = y0 + (y1 - y0) * f, xs = [];
    for (const r of ringe) for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length]; if ((a[1] > y) === (b[1] > y)) continue;
      xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > bw) { bw = xs[i + 1] - xs[i]; best = [(xs[i] + xs[i + 1]) / 2, y]; }
    if (bw > (y1 - y0) * 0.05) break;
  }
  return best || aussen[0];
}

// segs: [[ [x,y], [x,y] ], …] (Linien, Bogenstücke, Kreisstücke … bereits in Strecken zerlegt) → Regionen
// snap > tol: freie Enden (kein anderes Ende in der Nähe), die bis auf snap an einer anderen Strecke liegen, werden auf diese gelegt
// (z. B. Linie endet auf einem Kreis, dessen Vieleck-Sehne etwas innen liegt)
export function regionen(segs, tol = 1e-6, snap = 0) {
  const S = segs.filter(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]) > tol).map(([a, b]) => [a.slice(), b.slice()]);
  if (snap > tol) {
    const frei = (p, i) => !S.some(([c, d], j) => j !== i && (Math.hypot(c[0] - p[0], c[1] - p[1]) <= tol * 10 || Math.hypot(d[0] - p[0], d[1] - p[1]) <= tol * 10));
    S.forEach((sg, i) => [0, 1].forEach((k) => {
      const p = sg[k]; if (!frei(p, i)) return;
      let best = null, bd = snap;
      S.forEach(([c, d], j) => {
        if (j === i) return;
        const dx = d[0] - c[0], dy = d[1] - c[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - c[0]) * dx + (p[1] - c[1]) * dy) / l2)), q = [c[0] + t * dx, c[1] + t * dy], dist = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (dist < bd) { bd = dist; best = q; }
      });
      if (best) { sg[k] = best; }
    }));
  }
  const n = S.length, teile = S.map(() => [0, 1]);
  // 1) Schnittpunkte und Berührungen (T-Stösse, Überlappungen) bestimmen
  for (let i = 0; i < n; i++) {
    const [a, b] = S[i], r = [b[0] - a[0], b[1] - a[1]], rl = Math.hypot(...r);
    for (let j = i + 1; j < n; j++) {
      const [c, d] = S[j];
      if (Math.max(a[0], b[0]) < Math.min(c[0], d[0]) - tol || Math.min(a[0], b[0]) > Math.max(c[0], d[0]) + tol || Math.max(a[1], b[1]) < Math.min(c[1], d[1]) - tol || Math.min(a[1], b[1]) > Math.max(c[1], d[1]) + tol) continue;
      const s = [d[0] - c[0], d[1] - c[1]], sl = Math.hypot(...s), den = kreuz2(r, s);
      if (Math.abs(den) > EPS * rl * sl) { // nicht parallel
        const t = kreuz2([c[0] - a[0], c[1] - a[1]], s) / den, u = kreuz2([c[0] - a[0], c[1] - a[1]], r) / den, et = tol / rl, eu = tol / sl;
        if (t >= -et && t <= 1 + et && u >= -eu && u <= 1 + eu) { teile[i].push(Math.min(1, Math.max(0, t))); teile[j].push(Math.min(1, Math.max(0, u))); }
      } else if (Math.abs(kreuz2([c[0] - a[0], c[1] - a[1]], r)) / rl <= tol) { // kollinear: Endpunkte der anderen Strecke als Teilungspunkte
        for (const q of [c, d]) { const t = ((q[0] - a[0]) * r[0] + (q[1] - a[1]) * r[1]) / (rl * rl); if (t > 0 && t < 1) teile[i].push(t); }
        for (const q of [a, b]) { const u = ((q[0] - c[0]) * s[0] + (q[1] - c[1]) * s[1]) / (sl * sl); if (u > 0 && u < 1) teile[j].push(u); }
      }
    }
  }
  // 2) Knoten (auf tol gerundet vereinigt) und Kanten
  const knoten = [], raster = new Map(), id = (p) => {
    const kx = Math.round(p[0] / (tol * 10)), ky = Math.round(p[1] / (tol * 10));
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { const l = raster.get(`${kx + dx}|${ky + dy}`); if (l) for (const k of l) if (Math.hypot(knoten[k][0] - p[0], knoten[k][1] - p[1]) <= tol * 10) return k; }
    knoten.push(p.slice()); const k = knoten.length - 1, s = `${kx}|${ky}`; (raster.get(s) || raster.set(s, []).get(s)).push(k); return k;
  };
  const kanten = new Set(), nach = [];
  S.forEach(([a, b], i) => {
    const ts = [...new Set(teile[i].map((t) => +t.toFixed(12)))].sort((x, y) => x - y);
    for (let k = 0; k + 1 < ts.length; k++) {
      const p = [a[0] + (b[0] - a[0]) * ts[k], a[1] + (b[1] - a[1]) * ts[k]], q = [a[0] + (b[0] - a[0]) * ts[k + 1], a[1] + (b[1] - a[1]) * ts[k + 1]];
      const u = id(p), v = id(q); if (u === v) continue;
      const key = u < v ? `${u}-${v}` : `${v}-${u}`; if (kanten.has(key)) continue; kanten.add(key); nach.push([u, v]);
    }
  });
  const N = knoten.length, nb = Array.from({ length: N }, () => new Set());
  for (const [u, v] of nach) { nb[u].add(v); nb[v].add(u); }
  // 3) lose Enden abtragen (offene Linien begrenzen keine Fläche)
  const grad = nb.map((s) => s.size), stapel = [];
  grad.forEach((g, v) => { if (g < 2) stapel.push(v); });
  while (stapel.length) { const v = stapel.pop(); for (const w of nb[v]) { nb[w].delete(v); grad[w] = nb[w].size; if (grad[w] === 1) stapel.push(w); } nb[v].clear(); grad[v] = 0; }
  // 4) Flächen umlaufen: an jedem Knoten die nächste Kante im Uhrzeigersinn nach der Rückkante
  const sortiert = nb.map((s, v) => [...s].sort((a, b) => Math.atan2(knoten[a][1] - knoten[v][1], knoten[a][0] - knoten[v][0]) - Math.atan2(knoten[b][1] - knoten[v][1], knoten[b][0] - knoten[v][0])));
  const besucht = new Set(), zyklen = [];
  for (let u = 0; u < N; u++) for (const v0 of sortiert[u]) {
    if (besucht.has(`${u}>${v0}`)) continue;
    const ring = []; let a = u, b = v0, schutz = 0;
    while (!besucht.has(`${a}>${b}`) && schutz++ < 1e6) {
      besucht.add(`${a}>${b}`); ring.push(a);
      const l = sortiert[b], i = l.indexOf(a), c = l[(i - 1 + l.length) % l.length]; a = b; b = c;
    }
    if (ring.length >= 3) zyklen.push(ring);
  }
  // 5) Zusammenhangskomponenten
  const komp = new Array(N).fill(-1); let kn = 0;
  for (let v = 0; v < N; v++) if (komp[v] < 0 && nb[v].size) { const st = [v]; komp[v] = kn; while (st.length) { const x = st.pop(); for (const w of nb[x]) if (komp[w] < 0) { komp[w] = kn; st.push(w); } } kn++; }
  const pts = (r) => r.map((k) => knoten[k]);
  const innere = [], aeussere = [];
  for (const z of zyklen) { const p = pts(z), A = flaecheVon(p); if (A > 1e-9) innere.push({ p, A, komp: komp[z[0]] }); else if (A < -1e-9) aeussere.push({ p, A, komp: komp[z[0]] }); }
  const regs = innere.map((f) => ({ aussen: f.p, loecher: [], komp: f.komp, A: f.A }));
  // 6) Inseln: Aussenrand einer anderen Komponente liegt in der kleinsten Fläche, die ihn enthält → Loch
  for (const o of aeussere) {
    const kandidaten = regs.filter((r) => r.komp !== o.komp && punktInPolygon(o.p[0], r.aussen) && !r.loecher.some((l) => punktInPolygon(o.p[0], l.p))).sort((x, y) => x.A - y.A);
    if (kandidaten[0]) kandidaten[0].loecher.push({ p: o.p.slice().reverse(), A: o.A });
  }
  return regs.map((r) => {
    const loecher = r.loecher.map((l) => l.p), flaeche = r.A - r.loecher.reduce((s, l) => s + Math.abs(l.A), 0);
    return { aussen: r.aussen, loecher, flaeche, innen: innenpunkt(r.aussen, loecher) };
  }).sort((a, b) => b.flaeche - a.flaeche);
}
