// Spengler Digital CAD – Kern: Details aus dem Dach – Schnitt durch den Dachaufbau (Sparren, Dämmung, Unterdach, Latten, Deckung) mit Anschlussblech, massstäblich als SVG
// Schnittebene senkrecht zur Linie: Traufe, Ortgang, First/Grat, Kehle. x nach rechts, y nach oben (mm), Schichten aus kern/dach/vorlagen.js (Referenz: Oberkante Sparren).
import { beschneide } from "./form.js";
const FARBEN = { sparren: "#d8b98a", daemmung: "#f3e48f", unterdach: "#b39a78", konter: "#c9a06a", lattung: "#bb8f5a", deckung: "#e3a994" };
const z = (v) => +v.toFixed(2), rad = (g) => (g * Math.PI) / 180;
export const DETAILARTEN = { traufe: "Traufe", ortgang: "Ortgang", first: "First", grat: "Grat", kehle: "Kehle" };

// Polygon an der senkrechten Linie x = c (behalte x ≤ c bzw. x ≥ c)
const klippX = (poly, c, kleiner) => beschneide(poly, kleiner ? [c, -1, 0] : [-c, 1, 0]);

// Aufbau: Liste von { id, name, polygon } und Blechzug (Linienzug) für die Art; Rückgabe in mm
export function dachSchnitt({ art, neigung = 35, schichten, aufbau, wandstaerke = 300, ueberstand = 400, ansichtsLaenge = 450, blech = {} }) {
  const n = rad(Math.min(Math.max(neigung, 3), 80)), c = Math.cos(n), s = Math.sin(n), L = ansichtsLaenge, liste = schichten.liste, top = schichten.oben;
  const U = liste.find((l) => l.id === "unterdach"), sparren = liste.find((l) => l.id === "sparren"), H = aufbau.sparrenH;
  const polys = [], zuege = [], texte = [];
  const band = (l, O, d, nrm, t0, t1) => [0, 1].flatMap((i) => i ? [[...O.map((v, k) => v + nrm[k] * l.bis + d[k] * t1)], [...O.map((v, k) => v + nrm[k] * l.bis + d[k] * t0)]] : [[...O.map((v, k) => v + nrm[k] * l.von + d[k] * t0)], [...O.map((v, k) => v + nrm[k] * l.von + d[k] * t1)]]);
  const punkt = (O, d, nrm, off, t) => O.map((v, k) => v + nrm[k] * off + d[k] * t);
  if (art === "traufe") { // Traufe rechts, Dach steigt nach links; Wand links der Aussenflucht x = 0
    const d = [-c, s], nrm = [s, c], T0 = [nrm[0] * H, nrm[1] * H];
    for (const l of liste) { const p = klippX(band(l, T0, d, nrm, -3000, L), ueberstand, true); if (p.length >= 3) polys.push({ id: l.id, name: l.name, pts: p }); }
    polys.push({ id: "wand", name: "Mauerwerk", pts: [[-wandstaerke, -450], [0, -450], [0, 0], [-wandstaerke, 0]] });
    const off = U ? U.bis : 0, tk = (T0[0] + nrm[0] * off - ueberstand) / c, knie = punkt(T0, d, nrm, off, tk), dach = +blech.dach || 120, st = +blech.stirn || 50;
    zuege.push({ name: "Traufblech", pts: [[knie[0] - c * dach, knie[1] + s * dach], knie, [knie[0], knie[1] - st]] });
    texte.push(`Überstand ${ueberstand}`);
  } else if (art === "ortgang") { // Schnitt quer zur Ortgangkante: Schichten waagrecht (Dicke in Normalenrichtung), Kante bei x = 0, Dach nach links
    for (const l of liste) {
      const x0 = l.id === "daemmung" && aufbau.daemmung === "zwischen" ? -L : -L, x1 = l.id === "sparren" ? ueberstand : ueberstand;
      const a = l.id === "daemmung" && aufbau.daemmung === "zwischen" ? -aufbau.sparrenB : x1, b = l.id === "daemmung" && aufbau.daemmung === "zwischen" ? -L : x0;
      polys.push({ id: l.id, name: l.name, pts: l.id === "daemmung" && aufbau.daemmung === "zwischen" ? [[b, l.von + H], [a, l.von + H], [a, l.bis + H], [b, l.bis + H]] : [[x0, l.von + H], [x1, l.von + H], [x1, l.bis + H], [x0, l.bis + H]] });
    }
    const y = top + H + 1, dach = +blech.dach || 100, st = +blech.stirn || 80, au = +blech.aufkantung || 0;
    zuege.push({ name: "Ortgangblech", pts: [...(au ? [[-dach, y + au]] : []), [-dach, y], [ueberstand, y], [ueberstand, y - st]] });
    texte.push(`Überstand ${ueberstand}`);
  } else { // First / Grat (zwei Seiten nach unten) und Kehle (zwei Seiten nach oben): Mitte bei x = 0
    const kehle = art === "kehle";
    for (const sg of [-1, 1]) {
      const d = kehle ? [sg * c, s] : [sg * c, -s], nrm = kehle ? [-sg * s, c] : [sg * s, c], O = [0, 0];
      for (const l of liste) { const p = klippX(band(l, O, d, nrm, -L, L), 0, sg < 0); if (p.length >= 3) polys.push({ id: l.id, name: l.name, pts: p }); }
    }
    const off = kehle ? (U ? U.bis : 0) : top, sch = +blech.schenkel || 150, y0 = off / c; // Scheitel / Tiefpunkt des Blechs auf Höhe der Auflagefläche
    zuege.push({ name: DETAILARTEN[art] + "blech", pts: [-1, 0, 1].map((sg) => sg === 0 ? [0, y0] : [sg * c * sch, y0 + (kehle ? 1 : -1) * s * sch]) });
  }
  // Masse: jede Schicht einzeln (Dicke senkrecht zur Dachfläche) + Gesamtdicke, ausserhalb der Zeichnung
  const kette = liste.filter((l) => !(l.id === "daemmung" && aufbau.daemmung === "zwischen") && l.bis > l.von).sort((a, b) => a.von - b.von), masse = [];
  if (kette.length) {
    let P, dir, Tm = L + 70;
    if (art === "traufe") { const d = [-c, s], nrm = [s, c], T0 = [nrm[0] * H, nrm[1] * H]; P = (o, k = 0) => [T0[0] + nrm[0] * o + d[0] * (Tm + k), T0[1] + nrm[1] * o + d[1] * (Tm + k)]; dir = d; }
    else if (art === "ortgang") { P = (o, k = 0) => [-(Tm + k), o + H]; dir = [-1, 0]; }
    else { const kehle = art === "kehle", d = kehle ? [c, s] : [c, -s], nrm = kehle ? [-s, c] : [s, c]; P = (o, k = 0) => [nrm[0] * o + d[0] * (Tm + k), nrm[1] * o + d[1] * (Tm + k)]; dir = d; }
    for (const l of kette) masse.push({ a: P(l.von), b: P(l.bis), text: `${+(l.bis - l.von).toFixed(1)}`, tick: dir, textPos: (() => { const m = P((l.von + l.bis) / 2); return [m[0] + dir[0] * 70, m[1] + dir[1] * 70]; })() });
    const v0 = Math.min(...kette.map((l) => l.von)), v1 = Math.max(...kette.map((l) => l.bis));
    masse.push({ a: P(v0, 150), b: P(v1, 150), text: `Σ ${+(v1 - v0).toFixed(1)}`, tick: dir, textPos: (() => { const m = P((v0 + v1) / 2, 150); return [m[0] + dir[0] * 90, m[1] + dir[1] * 90]; })(), gesamt: true });
  }
  return { polys, zuege, texte, masse, art, neigung, legende: [...liste].reverse().map((l) => ({ id: l.id, name: l.name })), titel: `${DETAILARTEN[art]} ${Math.round(neigung)}°` };
}

// SVG in Papier-mm: M = Massstab 1:M, Legende rechts
export function dachSchnittSvg(sch, { M = 5, rand = 5, schrift = 2.3, blechDicke = 0.7 } = {}) {
  const k = 1 / M, pts = [...sch.polys.flatMap((p) => p.pts), ...sch.zuege.flatMap((t) => t.pts), ...(sch.masse || []).flatMap((m) => [m.a, m.b, m.textPos])], x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const legB = 66, dB = (x1 - x0) * k, dH = (y1 - y0) * k, kopf = schrift * 3.2, b = rand * 2 + dB + 6 + legB, h = Math.max(rand * 2 + dH + kopf, rand * 2 + kopf + (sch.legende.length + 1) * schrift * 1.7);
  const P = ([x, y]) => [z(rand + (x - x0) * k), z(rand + kopf + (y1 - y) * k)], pf = (q, zu = true) => q.map(P).map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") + (zu ? "Z" : "");
  const out = [`<text x="${rand}" y="${rand + schrift}" class="titel" text-anchor="start">${sch.titel} · 1:${M}</text>`];
  for (const p of sch.polys) out.push(`<path d="${pf(p.pts)}" fill="${FARBEN[p.id] || "#cfd5da"}" class="schicht"/>`);
  for (const t of sch.zuege) out.push(`<path d="${pf(t.pts, false)}" class="blech" stroke-width="${z(Math.max(0.4, blechDicke * k * 1.5))}"/>`);
  for (const m of sch.masse || []) { // Massketten: Linie mit Strichen an den Enden und Wert
    const [a, b] = [P(m.a), P(m.b)], t = m.tick, nx = -t[1], ny = t[0], tk = 2.2; void nx; void ny;
    out.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="mass"/>`);
    for (const e of [m.a, m.b]) { const q = P(e), r = P([e[0] + t[0] * 40, e[1] + t[1] * 40]), u = P([e[0] - t[0] * 40, e[1] - t[1] * 40]); void tk; out.push(`<line x1="${u[0]}" y1="${u[1]}" x2="${r[0]}" y2="${r[1]}" class="mass"/>`); void q; }
    const q = P(m.textPos); out.push(`<text x="${q[0]}" y="${z(q[1] + schrift * 0.3)}" class="masszahl" text-anchor="middle">${m.text}</text>`);
  }
  const lx = rand + dB + 6; let ly = rand + kopf + schrift;
  for (const l of sch.legende) { out.push(`<rect x="${z(lx)}" y="${z(ly - schrift * 0.8)}" width="${z(schrift)}" height="${z(schrift * 0.8)}" fill="${FARBEN[l.id] || "#cfd5da"}" class="schicht"/>`, `<text x="${z(lx + schrift * 1.4)}" y="${z(ly)}" class="legende" text-anchor="start">${l.name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>`); ly += schrift * 1.7; }
  for (const t of sch.texte) { out.push(`<text x="${z(lx)}" y="${z(ly + schrift * 0.4)}" class="legende" text-anchor="start">${t}</text>`); ly += schrift * 1.7; }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${z(b)} ${z(h)}" width="${z(b)}" height="${z(h)}" font-size="${schrift}" font-family="sans-serif"><style>.schicht{stroke:#222;stroke-width:.15}.blech{fill:none;stroke:#b8732d;stroke-linejoin:round;stroke-linecap:round}.titel{font-weight:700;fill:#1f2a33}.legende{fill:#1f2a33;font-size:${schrift * 0.85}px}.mass{stroke:#1f5fbf;stroke-width:.2}.masszahl{fill:#1f5fbf;font-size:${schrift * 0.9}px}</style>${out.join("")}</svg>`;
  return { svg, b: z(b), h: z(h), name: sch.titel };
}
