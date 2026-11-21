// Spengler Digital CAD – Kern: «Spengler-Brücke» – aus den Dachflächen entstehen die Anschlussbleche
// Traufblech (waagrechte Aussenkanten), Ortgangblech (geneigte Aussenkanten), Firstblech, Gratblech, Kehlblech (gemeinsame Kanten zweier Flächen)
// Liefert Längen/Neigungen je Blech (für Profilvorlagen kern/profile.js) und schematische Flächen für die 3D-Darstellung.
const sub = (a, b) => a.map((x, i) => x - b[i]), add = (a, b) => a.map((x, i) => x + b[i]), mul = (a, k) => a.map((x) => x * k), dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], len = (a) => Math.hypot(...a), unit = (a) => mul(a, 1 / (len(a) || 1));
export const BLECHARTEN = { traufe: "Traufblech", ortgang: "Ortgangblech", first: "Firstblech", grat: "Gratblech", kehle: "Kehlblech" };

// Gemeinsame und freie Kanten aller Flächenstücke
function kantenListe(flaechen) {
  const E = [];
  flaechen.forEach((f, i) => (f.stuecke || [f.punkte]).forEach((s) => { const m = s.reduce((a, p) => add(a, mul(p, 1 / s.length)), [0, 0, 0]); s.forEach((a, j) => E.push({ i, a, b: s[(j + 1) % s.length], mitte: m })); }));
  return E;
}
// Überlappung der Strecke e mit f (parallel, auf derselben Geraden): [s0, s1] entlang e in mm oder null
function ueberlapp(e, f) {
  const v = sub(e.b, e.a), L = len(v); if (L < 1) return null; const d = mul(v, 1 / L);
  const lage = (p) => { const w = sub(p, e.a), s = dot(w, d); return [len(sub(w, mul(d, s))), s]; };
  const [dc, sc] = lage(f.a), [dd, sd] = lage(f.b); if (dc > 1 || dd > 1) return null;
  const s0 = Math.max(0, Math.min(sc, sd)), s1 = Math.min(L, Math.max(sc, sd)); return s1 - s0 > 1 ? [s0, s1] : null;
}
const punktBei = (e, s) => add(e.a, mul(unit(sub(e.b, e.a)), s));
// Winkel eines Schenkels in der Querschnittsebene (⟂ zur Linie): Neigung der Fläche gegen die Waagrechte, gemessen quer zur Linie
function querWinkel(n, d, mitteVonLinie) {
  let e = unit(cross(n, d)); if (dot(e, mitteVonLinie) < 0) e = mul(e, -1);
  return { e, grad: (Math.asin(Math.min(1, Math.abs(e[2]))) * 180) / Math.PI };
}
// Strecken zusammenfassen: gleiche Art, auf einer Geraden, sich berührend
function verschmelze(segs) {
  let aenderung = true;
  while (aenderung) {
    aenderung = false;
    outer: for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
      const a = segs[i], b = segs[j]; if (a.art !== b.art) continue;
      const v = sub(a.bis, a.von), L = len(v); if (L < 1) continue; const d = mul(v, 1 / L);
      const lage = (p) => { const w = sub(p, a.von), s = dot(w, d); return [len(sub(w, mul(d, s))), s]; };
      const [d1, s1] = lage(b.von), [d2, s2] = lage(b.bis); if (d1 > 1 || d2 > 1) continue;
      const lo = Math.min(0, s1, s2), hi = Math.max(L, s1, s2); if (hi - lo > L + len(sub(b.bis, b.von)) + 2) continue; // Lücke
      const von = add(a.von, mul(d, lo)), bis = add(a.von, mul(d, hi));
      segs[i] = { ...a, von, bis, laenge: hi - lo, flaechen: [...new Set([...a.flaechen, ...b.flaechen])], seiten: [...a.seiten, ...b.seiten] }; segs.splice(j, 1); aenderung = true; break outer;
    }
  }
  return segs;
}

export function dachSegmente(flaechen) {
  const E = kantenListe(flaechen), segs = [];
  E.forEach((e, ei) => {
    const L = len(sub(e.b, e.a)); if (L < 1) return;
    const bedeckt = []; // [s0, s1, andere Kante]
    E.forEach((f, fi) => { if (f.i === e.i || fi === ei) return; const o = ueberlapp(e, f); if (o) bedeckt.push([o[0], o[1], f]); });
    // gemeinsame Teile: nur einmal (Fläche mit dem kleineren Index)
    for (const [s0, s1, f] of bedeckt) {
      if (f.i < e.i) continue;
      const p0 = punktBei(e, s0), p1 = punktBei(e, s1), d = unit(sub(p1, p0)), n1 = flaechen[e.i].normale, n2 = flaechen[f.i].normale;
      const s = dot(sub(f.mitte, p0), n1); if (Math.abs(s) < 1e-3) continue; // gleiche Ebene
      const art = s < 0 ? (Math.abs(p0[2] - p1[2]) < 1e-3 ? "first" : "grat") : "kehle";
      const a1 = querWinkel(n1, d, sub(e.mitte, p0)), a2 = querWinkel(n2, d, sub(f.mitte, p0));
      segs.push({ art, von: p0, bis: p1, laenge: len(sub(p1, p0)), flaechen: [e.i, f.i], neigung: (a1.grad + a2.grad) / 2, seiten: [{ i: e.i, e: a1.e }, { i: f.i, e: a2.e }] });
    }
    // freie Teile = Aussenkante
    const iv = bedeckt.map(([a, b]) => [a, b]).sort((x, y) => x[0] - y[0]); let z = 0; const frei = [];
    for (const [a, b] of iv) { if (a > z + 1) frei.push([z, a]); z = Math.max(z, b); } if (z < L - 1) frei.push([z, L]);
    for (const [s0, s1] of frei) {
      const p0 = punktBei(e, s0), p1 = punktBei(e, s1), d = unit(sub(p1, p0)), waag = Math.abs(p0[2] - p1[2]) < 1, q = querWinkel(flaechen[e.i].normale, d, sub(e.mitte, p0));
      segs.push({ art: waag ? "traufe" : "ortgang", von: p0, bis: p1, laenge: len(sub(p1, p0)), flaechen: [e.i], neigung: flaechen[e.i].neigung, seiten: [{ i: e.i, e: q.e }] });
    }
  });
  const gl = verschmelze(segs.filter((s) => s.laenge > 1)).filter((s) => s.laenge >= 150); // Abschnitte unter 150 mm (Verschnitt an Anschnitten) entfallen
  // gemittelte Neigung nach dem Verschmelzen: Werte der Teile (gleich bei einer Linie)
  return gl.map((s) => ({ ...s, von: s.von.map((x) => +x.toFixed(1)), bis: s.bis.map((x) => +x.toFixed(1)), laenge: +s.laenge.toFixed(1), neigung: +s.neigung.toFixed(2) }));
}

// Gleiche Bleche (Art, Länge, Neigung) zu einem Eintrag mit Stückzahl
export function dachBleche(flaechen, { abstand = 0, arten = {}, params = {} } = {}) {
  const segs = dachSegmente(flaechen).filter((s) => arten[s.art] !== false), teile = new Map(), formen = [];
  for (const s of segs) {
    const L = Math.round(s.laenge / 10) * 10, key = `${s.art}|${L}|${Math.round(s.neigung * 2) / 2}`, t = teile.get(key) || { art: s.art, name: BLECHARTEN[s.art], laenge: L, neigung: Math.round(s.neigung * 2) / 2, stueck: 0 };
    t.stueck++; teile.set(key, t);
    // schematische Flächen (auf die Dachfläche gelegt)
    const d = unit(sub(s.bis, s.von)), p = params[s.art === "grat" ? "first" : s.art] || {}, breite = s.art === "traufe" || s.art === "ortgang" ? +p.dach || 100 : +p.schenkel || 150;
    for (const { i, e } of s.seiten.slice(0, s.art === "traufe" || s.art === "ortgang" ? 1 : 2)) {
      const n = flaechen[i].normale, h = mul(n, abstand), a = add(s.von, h), b = add(s.bis, h);
      formen.push({ art: s.art, punkte: [a, b, add(b, mul(e, breite)), add(a, mul(e, breite))], normale: n });
      if (s.art === "traufe" || s.art === "ortgang") { // Stirn: senkrecht nach unten, auf der Aussenseite
        const st = +p.stirn || 50, aus = unit([-e[0], -e[1], 0]);
        formen.push({ art: s.art, punkte: [a, b, [b[0], b[1], b[2] - st], [a[0], a[1], a[2] - st]], normale: aus });
      }
    }
  }
  return { segmente: segs, teile: [...teile.values()].sort((a, b) => Object.keys(BLECHARTEN).indexOf(a.art) - Object.keys(BLECHARTEN).indexOf(b.art) || b.laenge - a.laenge), formen };
}
