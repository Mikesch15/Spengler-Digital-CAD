// Spengler Digital CAD – Kern: Querschnitt als SVG-Zeichnung (Werkstatt, Druck)
// Blechmitte mit Schenkelmassen, Biegungen B1… und Kante A (grüner Punkt).
import { polylinie, grenzen } from "./geometrie.js";

const z = (v) => +v.toFixed(1);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// res = Ergebnis von berechne(); breite/hoehe in px. Schrift fest in px, Profil wird eingepasst.
export function profilSvg(res, { breite = 300, hoehe = 220, rand = 34, schrift = 12, dicke = 0 } = {}) {
  const pts = polylinie(res.pfad, 3);
  if (pts.length < 2) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breite} ${hoehe}"></svg>`;
  const g = grenzen(pts);
  const w = Math.max(g.x1 - g.x0, 1), h = Math.max(g.y1 - g.y0, 1);
  const s = Math.min((breite - 2 * rand) / w, (hoehe - 2 * rand) / h);
  const ox = (breite - w * s) / 2 - g.x0 * s, oy = (hoehe + h * s) / 2 + g.y0 * s;
  const P = ([x, y]) => [ox + x * s, oy - y * s]; // y nach oben → SVG nach unten
  const mitte = P([(g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2]);

  const teile = [];
  const linie = pts.map(P).map(([x, y], i) => `${i ? "L" : "M"}${z(x)} ${z(y)}`).join("");
  teile.push(`<path d="${linie}" fill="none" stroke="currentColor" stroke-width="${Math.max(2, dicke * s)}" stroke-linejoin="round" stroke-linecap="round"/>`);

  // Beschriftungen: Ankerpunkt + Richtung; überlappende werden weiter nach aussen geschoben
  const marken = [];
  const marke = (p, [dx, dy], text, klasse, abstand) => marken.push({ p, dx, dy, text: String(text), klasse, abstand });
  for (const b of res.beschriftungen) { // Schenkelmass auf der von der Profilmitte abgewandten Seite
    const p = P([b.x, b.y]);
    let nx = Math.sin(b.richtung), ny = Math.cos(b.richtung); // Normale in SVG-Koordinaten
    if ((p[0] - mitte[0]) * nx + (p[1] - mitte[1]) * ny < 0) { nx = -nx; ny = -ny; }
    marke(p, [nx, ny], +b.mass.toFixed(1), "mass", schrift * 0.6 + 4);
  }
  const vonMitte = (p) => { const dx = p[0] - mitte[0], dy = p[1] - mitte[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  let nr = 0;
  for (const el of res.pfad) { // Biegung: Nummer aussen an der Biegung
    if (el.typ !== "bogen") continue;
    const pm = P(el.pm), c = P(el.zentrum), dx = pm[0] - c[0], dy = pm[1] - c[1], l = Math.hypot(dx, dy);
    marke(pm, l > 0.5 ? [dx / l, dy / l] : vonMitte(pm), "B" + ++nr, "biegung", schrift * 0.6 + 6);
  }
  const a = P(pts[0]);
  teile.push(`<circle cx="${z(a[0])}" cy="${z(a[1])}" r="${schrift * 0.4}" class="kante-a"/>`);
  marke(a, vonMitte(a), "A", "kante-a-text", schrift * 0.6 + 4);
  const e = P(pts.at(-1)); // Kante B: Ende des Profils
  teile.push(`<circle cx="${z(e[0])}" cy="${z(e[1])}" r="${schrift * 0.3}" class="kante-b"/>`);
  marke(e, vonMitte(e), "B", "kante-b-text", schrift * 0.6 + 4);

  const belegt = [];
  const ueberlappt = (k) => belegt.some((o) => Math.abs(o.x - k.x) < (o.b + k.b) / 2 + 2 && Math.abs(o.y - k.y) < schrift + 1);
  for (const m of marken) {
    const kb = m.text.length * schrift * 0.62;
    let k;
    for (let i = 0; i < 6; i++) {
      const d = m.abstand + i * schrift * 0.8;
      const x = Math.min(Math.max(m.p[0] + m.dx * d, kb / 2 + 2), breite - kb / 2 - 2);
      const y = Math.min(Math.max(m.p[1] + m.dy * d, schrift / 2 + 2), hoehe - schrift / 2 - 2);
      k = { x, y, b: kb };
      if (!ueberlappt(k)) break;
    }
    belegt.push(k);
    teile.push(`<text x="${z(k.x)}" y="${z(k.y)}" class="${m.klasse}">${esc(m.text)}</text>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}" font-size="${schrift}" text-anchor="middle" dominant-baseline="middle">
<style>.mass{font-family:"JetBrains Mono",Consolas,monospace;fill:currentColor}.biegung{font-family:"JetBrains Mono",Consolas,monospace;font-weight:600;fill:#c4352b}.kante-a{fill:#2e9b4f}.kante-a-text{fill:#2e9b4f;font-weight:600}.kante-b{fill:#8a969e}.kante-b-text{fill:#8a969e;font-weight:600}</style>
${teile.join("\n")}
</svg>`;
}

// Abwicklung als SVG: Blechstreifen (Zuschnitt) mit Biegelinien und Anschlagmass ab Kante A
export function abwicklungSvg(res, { breite = 300, schrift = 11 } = {}) {
  const rand = 18, streifen = 22;
  const s = (breite - 2 * rand) / Math.max(res.zuschnitt, 1);
  const X = (v) => z(rand + v * s), y0 = schrift * 2 + 10;
  const teile = [`<rect x="${X(0)}" y="${y0}" width="${z(res.zuschnitt * s)}" height="${streifen}" class="streifen"/>`];
  const belegt = [];
  for (const b of res.biegungen) {
    if (b.art === "Rundung") teile.push(`<rect x="${X(b.von)}" y="${y0}" width="${z((b.bis - b.von) * s)}" height="${streifen}" class="rundung"/>`);
    else teile.push(`<line x1="${X(b.pos)}" y1="${y0 - 3}" x2="${X(b.pos)}" y2="${y0 + streifen + 3}" class="biegelinie"/>`);
    // Nummer oben, Mass unten; bei engen Biegungen Mass eine Zeile tiefer
    const x = +X(b.pos), zeile = belegt.filter((o) => Math.abs(o - x) < schrift * 3.2).length % 2;
    belegt.push(x);
    teile.push(`<text x="${x}" y="${y0 - 6 - zeile * (schrift + 2)}" class="biegung">B${b.nr}</text>`);
    teile.push(`<text x="${x}" y="${y0 + streifen + schrift + 2 + zeile * (schrift + 2)}" class="mass">${b.art === "Rundung" ? `${b.von.toFixed(0)}–${b.bis.toFixed(0)}` : b.pos.toFixed(1)}</text>`);
  }
  teile.push(`<circle cx="${X(0)}" cy="${y0 + streifen / 2}" r="${schrift * 0.4}" class="kante-a"/>`);
  const ym = z(y0 + streifen / 2 + schrift * 0.35); // Kantenbuchstaben seitlich neben dem Streifen
  teile.push(`<text x="${z(rand / 2 - 1)}" y="${ym}" class="kante-a-text">A</text>`, `<text x="${z(breite - rand / 2 + 1)}" y="${ym}" class="kante-b-text">B</text>`);
  const h = y0 + streifen + (schrift + 2) * 2 + 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breite} ${h}" width="${breite}" height="${h}" font-size="${schrift}" text-anchor="middle">
<style>.streifen{fill:none;stroke:currentColor;stroke-width:1.5}.rundung{fill:#c4352b;opacity:.15}.biegelinie{stroke:#c4352b;stroke-width:1.5;stroke-dasharray:4 2}.mass{font-family:"JetBrains Mono",Consolas,monospace;fill:currentColor}.biegung{font-family:"JetBrains Mono",Consolas,monospace;font-weight:600;fill:#c4352b}.kante-a{fill:#2e9b4f}.kante-a-text{fill:#2e9b4f;font-weight:600}.kante-b-text{fill:#8a969e;font-weight:600}</style>
${teile.join("\n")}
</svg>`;
}

// Spenglerdetail als Schnittzeichnung: Holz schraffiert, Bleche mit Dicke, Masse mit Hilfslinien und Pfeilen.
// d = baueDetail(); konturen = Teile als Punktlisten (teilKontur). massstab: mm → px fest (z. B. für Druck 1:1/1:2)
let svgNr = 0; // eindeutige IDs für Muster/Pfeile, wenn mehrere Zeichnungen auf einer Seite stehen
export function detailSvg(d, konturen, { breite = 420, hoehe = 320, rand = 30, schrift = 11, titel = "", massstab = null, nummern = true } = {}) {
  const g = d.grenzen, w = Math.max(g.x1 - g.x0, 1), h = Math.max(g.y1 - g.y0, 1), id = "dz" + ++svgNr;
  const kopf = titel ? schrift * 2 : 0;
  const s = massstab ?? Math.min((breite - 2 * rand) / w, (hoehe - 2 * rand - kopf) / h);
  const ox = (breite - w * s) / 2 - g.x0 * s, oy = kopf + (hoehe - kopf + h * s) / 2 + g.y0 * s;
  const P = ([x, y]) => [ox + x * s, oy - y * s];
  const pfad = (pts, zu = true) => pts.map(P).map(([x, y], i) => `${i ? "L" : "M"}${z(x)} ${z(y)}`).join("") + (zu ? "Z" : "");
  const out = [];
  if (titel) out.push(`<text x="${breite / 2}" y="${schrift * 1.3}" class="titel">${esc(titel)}</text>`);
  for (const hz of d.holz) out.push(`<path d="${pfad(hz.pts)}" class="${hz.art === "led" ? "led" : "holz"}"${hz.art === "led" ? "" : ` fill="url(#${id}s)"`}/>`);
  konturen.forEach((k) => out.push(`<path d="${pfad(k)}" class="blech"/>`));
  // Masse: Masslinie parallel zu a→b im Abstand ab, Hilfslinien, Pfeile, Text in der Mitte
  for (const m of d.masse) {
    const dx = m.b[0] - m.a[0], dy = m.b[1] - m.a[1], L = Math.hypot(dx, dy); if (L < 1e-6) continue;
    const n = [-dy / L, dx / L], v = (p, k) => [p[0] + n[0] * k, p[1] + n[1] * k];
    const A = P(v(m.a, m.ab)), B = P(v(m.b, m.ab)), A0 = P(v(m.a, Math.sign(m.ab) * 2 / s)), B0 = P(v(m.b, Math.sign(m.ab) * 2 / s)), ue = P(v(m.a, m.ab + Math.sign(m.ab) * 3 / s));
    const ueb = P(v(m.b, m.ab + Math.sign(m.ab) * 3 / s));
    out.push(`<path d="M${z(A0[0])} ${z(A0[1])}L${z(ue[0])} ${z(ue[1])}M${z(B0[0])} ${z(B0[1])}L${z(ueb[0])} ${z(ueb[1])}" class="hilfslinie"/>`);
    out.push(`<line x1="${z(A[0])}" y1="${z(A[1])}" x2="${z(B[0])}" y2="${z(B[1])}" class="masslinie" marker-start="url(#${id}p)" marker-end="url(#${id}p)"/>`);
    let wi = (Math.atan2(B[1] - A[1], B[0] - A[0]) * 180) / Math.PI; if (wi > 90) wi -= 180; if (wi <= -90) wi += 180;
    const t = P(v([(m.a[0] + m.b[0]) / 2, (m.a[1] + m.b[1]) / 2], m.ab + Math.sign(m.ab || 1) * (schrift * 0.7) / s));
    out.push(`<text x="${z(t[0])}" y="${z(t[1])}" transform="rotate(${z(wi)} ${z(t[0])} ${z(t[1])})" class="masstext">${esc(m.text ?? (+L.toFixed(1)))}</text>`);
  }
  if (nummern) d.teile.forEach((tl, i) => { // Positionsnummer am Anfang (Kante A) jedes Blechteils
    const a = P([tl.x, tl.y]);
    out.push(`<circle cx="${z(a[0])}" cy="${z(a[1])}" r="${schrift * 0.75}" class="pos"/><text x="${z(a[0])}" y="${z(a[1])}" class="postext">${i + 1}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${breite} ${hoehe}" width="${breite}" height="${hoehe}" font-size="${schrift}" text-anchor="middle" dominant-baseline="middle">
<defs><pattern id="${id}s" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="currentColor" stroke-width=".6"/></pattern>
<marker id="${id}p" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 2L10 5L0 8z" fill="currentColor"/></marker></defs>
<style>.holz{stroke:currentColor;stroke-width:.7}.led{fill:currentColor}.blech{fill:currentColor;stroke:currentColor;stroke-width:.5;stroke-linejoin:round}.hilfslinie{stroke:currentColor;stroke-width:.4;fill:none}.masslinie{stroke:currentColor;stroke-width:.5}.masstext{font-family:Arial,Helvetica,sans-serif;fill:currentColor}.titel{font-family:Arial,Helvetica,sans-serif;font-size:${schrift * 1.4}px;fill:currentColor}.pos{fill:none;stroke:#c4352b;stroke-width:.8}.postext{font-family:Arial,sans-serif;font-size:${schrift * 0.85}px;fill:#c4352b;font-weight:600}</style>
${out.join("\n")}
</svg>`;
}
