// Spengler Digital CAD – Planblatt (wie Zeichnung in Fusion): Ansichten des Modells, Details, Bemassung, Text, Schriftfeld
import * as THREE from "three";
import { Brush, Evaluator, INTERSECTION } from "three-bvh-csg";
import { rechneAnsicht, RICHTUNGEN } from "./ansicht.js";

export const FORMATE = { A3: { b: 420, h: 297 }, A4: { b: 297, h: 210 } };
export const PLAN_MASSSTAEBE = [1, 2, 5, 10, 20, 25, 50, 100];
const z = (v) => +(+v).toFixed(2);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ctx: { renderer, meshes(), signatur(), doc(), einst(), detailSvg(fid, M) → { svg, b, h } | null, status(t), herunterladen(), drucken(html) }
// ---------------------------------------------------------- Schnitt: Körper an der Ebene d·p = lage abschneiden (Blick von +d), Schnittflächen
const csg = new Evaluator(); csg.attributes = ["position", "normal"]; csg.useGroups = false;
const nurPos = (g) => { const n = g.index ? g.toNonIndexed() : g.clone(); for (const k of Object.keys(n.attributes)) if (k !== "position" && k !== "normal") n.deleteAttribute(k); if (!n.attributes.normal) n.computeVertexNormals(); return n; };
function geschnitten(meshes, d, lage) {
  const box = new THREE.Box3(); meshes.forEach((m) => box.expandByObject(m));
  const L = (box.getSize(new THREE.Vector3()).length() || 1000) * 4, c = box.getCenter(new THREE.Vector3());
  // Halbraum d·p <= lage als grosser Quader
  const u = new THREE.Vector3(...(Math.abs(d.y) < 0.9 ? [0, 1, 0] : [1, 0, 0])).cross(d).normalize(), v = d.clone().cross(u);
  const mitte = c.clone().addScaledVector(d, lage - c.dot(d) - L / 2);
  const quader = new Brush(new THREE.BoxGeometry(L, L, L).applyMatrix4(new THREE.Matrix4().makeBasis(u, v, d).setPosition(mitte))); quader.updateMatrixWorld();
  const out = [];
  for (const m of meshes) {
    const g = nurPos(m.geometry).applyMatrix4(m.matrixWorld), b = new Brush(g); b.updateMatrixWorld();
    try { const r = csg.evaluate(b, quader, INTERSECTION).geometry; if (r.attributes.position?.count) out.push(new THREE.Mesh(r)); } catch {}
  }
  out.forEach((m) => m.updateMatrixWorld(true));
  return out;
}
// Schnittflächen: Dreiecke ∩ Ebene → Strecken → geschlossene Linienzüge (je Körper)
function schnittFlaechen(meshes, d, lage) {
  const zuege = [];
  for (const m of meshes) {
    const p = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry).attributes.position, seg = [], W = (i) => new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
    for (let i = 0; i + 2 < p.count; i += 3) {
      const P = [W(i), W(i + 1), W(i + 2)], s = P.map((q) => q.dot(d) - lage), pts = [];
      for (let k = 0; k < 3; k++) { const a = s[k], b = s[(k + 1) % 3]; if ((a < 0 && b > 0) || (a > 0 && b < 0)) pts.push(P[k].clone().lerp(P[(k + 1) % 3], a / (a - b))); else if (Math.abs(a) < 1e-9 && Math.abs(b) > 1e-9) pts.push(P[k].clone()); }
      if (pts.length === 2 && pts[0].distanceToSquared(pts[1]) > 1e-10) seg.push(pts);
    }
    // verketten
    const key = (q) => `${Math.round(q.x * 100)},${Math.round(q.y * 100)},${Math.round(q.z * 100)}`, an = new Map();
    seg.forEach((sg, i) => { for (const e of [0, 1]) { const k = key(sg[e]); if (!an.has(k)) an.set(k, []); an.get(k).push(i); } });
    const benutzt = new Set();
    for (let i = 0; i < seg.length; i++) {
      if (benutzt.has(i)) continue; benutzt.add(i);
      const zug = [seg[i][0], seg[i][1]];
      for (let n = 0; n < seg.length; n++) {
        const k = key(zug.at(-1)), j = (an.get(k) || []).find((x) => !benutzt.has(x)); if (j == null) break;
        benutzt.add(j); const s2 = seg[j]; zug.push(key(s2[0]) === k ? s2[1] : s2[0]);
      }
      if (zug.length > 2) zuege.push(zug);
    }
  }
  return zuege;
}
// Strecke auf Kreis (cx, cy, r) beschneiden → Teil innen oder null
function imKreis([x1, y1, x2, y2], cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1, fx = x1 - cx, fy = y1 - cy, a = dx * dx + dy * dy, b = 2 * (fx * dx + fy * dy), c = fx * fx + fy * fy - r * r;
  if (a < 1e-12) return c <= 0 ? [x1, y1, x2, y2] : null;
  const D = b * b - 4 * a * c; if (D <= 0) return null;
  const t1 = Math.max(0, (-b - Math.sqrt(D)) / (2 * a)), t2 = Math.min(1, (-b + Math.sqrt(D)) / (2 * a)); if (t2 <= t1) return null;
  return [x1 + dx * t1, y1 + dy * t1, x1 + dx * t2, y1 + dy * t2];
}

export function planModul(ctx) {
  const cache = new Map();
  const ansicht = (a) => {
    if (a.lupe) return lupenAnsicht(a);
    const key = `${a.art}|${a.massstab}|${a.verdeckt !== false}|${a.schnitt ? a.schnitt.lage : ""}|${ctx.signatur()}`;
    if (!cache.has(key)) {
      if (cache.size > 40) cache.clear();
      let r;
      if (a.schnitt) { // Schnittansicht: nur was hinter der Ebene liegt, Schnittflächen schraffiert
        const d = new THREE.Vector3(...(RICHTUNGEN[a.art] || RICHTUNGEN.vorne).d).normalize(), alle = ctx.meshes();
        const teile = geschnitten(alle, d, +a.schnitt.lage || 0);
        r = teile.length ? rechneAnsicht(ctx.renderer, teile, a.art, 1 / a.massstab, { verdeckte: a.verdeckt !== false }) : null;
        if (r) r.flaechen = schnittFlaechen(alle, d, +a.schnitt.lage || 0).map((zug) => zug.map((w) => r.abbild(w.toArray())));
        teile.forEach((m) => m.geometry.dispose());
      } else r = rechneAnsicht(ctx.renderer, ctx.meshes(), a.art, 1 / a.massstab, { verdeckte: a.verdeckt !== false });
      cache.set(key, r);
    }
    return cache.get(key);
  };
  // Detailansicht (Lupe): Ausschnitt einer anderen Ansicht vergrössert, auf den Kreis beschnitten
  function lupenAnsicht(a) {
    const q = plan?.ansichten.find((x) => x.id === a.lupe.quelle) || (plaene().flatMap((p) => p.ansichten).find((x) => x.id === a.lupe.quelle)), r0 = q && !q.lupe && ansicht(q); if (!r0) return null;
    const { cx, cy } = a.lupe, R = +a.lupe.r || 10, k = +a.lupe.faktor || 2, B = 2 * R * k;
    const tf = (x, y) => [(x - cx) * k + R * k, (y - cy) * k + R * k], tseg = ([x1, y1, x2, y2]) => [...tf(x1, y1), ...tf(x2, y2)];
    const clip = (liste) => liste.map((sg) => imKreis(sg, cx, cy, R)).filter(Boolean).map(tseg);
    return { breite: B, hoehe: B, sichtbar: clip(r0.sichtbar), verdeckt: clip(r0.verdeckt), flaechen: (r0.flaechen || []).map((z) => z.map(([x, y]) => tf(x, y))), rund: R * k,
      punkte: r0.punkte.filter((p) => Math.hypot(p.x - cx, p.y - cy) <= R).map((p) => { const [x, y] = tf(p.x, p.y); return { ...p, x, y }; }),
      abbild: (w) => { const [x, y] = r0.abbild(w); return tf(x, y); }, massstab: q.massstab / k, quelle: q };
  }
  const massstabVon = (a) => (a.lupe ? (ansicht(a)?.massstab ?? a.massstab) : a.massstab);
  const neuId = () => "p" + Math.random().toString(36).slice(2, 8);

  // ---------------------------------------------------------- Blatt als SVG (mm)
  function blattSvg(plan, { auswahl = null, nr = 1, von = 1, bildschirm = false } = {}) {
    const F = FORMATE[plan.format] || FORMATE.A3, doc = ctx.doc(), einst = ctx.einst();
    const out = [], rl = 20, ro = 10, rr = 10, ru = 10, sfB = 180, sfH = 32;
    out.push(`<rect x="${rl}" y="${ro}" width="${F.b - rl - rr}" height="${F.h - ro - ru}" class="rahmen"/>`);
    const M = plan.ansichten[0]?.massstab;
    // Ansichten
    for (const a of plan.ansichten) {
      const r = ansicht(a);
      if (!r) { out.push(`<text x="${a.x}" y="${a.y}" class="t3">(${a.lupe ? "Ausgangsansicht fehlt" : a.schnitt ? "Schnittebene trifft keinen Körper" : "kein Körper sichtbar"})</text>`); continue; }
      const sel = auswahl === a.id, titel = a.titel || (a.schnitt ? `Schnitt ${a.schnitt.buchstabe || "A"}–${a.schnitt.buchstabe || "A"}` : a.lupe ? `Detail ${a.lupe.buchstabe || "B"}` : RICHTUNGEN[a.art]?.name);
      const clipId = `lc${a.id}`, fl = r.flaechen?.length ? `<path d="${r.flaechen.map((zug) => "M" + zug.map(([x, y]) => `${z(x)} ${z(y)}`).join("L") + "Z").join("")}" class="schnittflaeche"${r.rund ? ` clip-path="url(#${clipId})"` : ""}/>` : "";
      out.push(`<g transform="translate(${z(a.x)} ${z(a.y)})" data-id="${a.id}">${r.rund ? `<clipPath id="${clipId}"><circle cx="${z(r.rund)}" cy="${z(r.rund)}" r="${z(r.rund)}"/></clipPath>` : ""}${bildschirm ? `<rect width="${z(r.breite)}" height="${z(r.hoehe)}" class="treffer${sel ? " sel" : ""}"/>` : ""}
        ${fl}${r.verdeckt.length ? `<path d="${r.verdeckt.map(([x1, y1, x2, y2]) => `M${z(x1)} ${z(y1)}L${z(x2)} ${z(y2)}`).join("")}" class="verdeckt"/>` : ""}
        <path d="${r.sichtbar.map(([x1, y1, x2, y2]) => `M${z(x1)} ${z(y1)}L${z(x2)} ${z(y2)}`).join("")}" class="sichtbar"/>
        ${r.rund ? `<circle cx="${z(r.rund)}" cy="${z(r.rund)}" r="${z(r.rund)}" class="lupenrand"/>` : ""}
        <text x="0" y="${z(r.hoehe + 6)}" class="t35" style="text-anchor:start">${esc(titel)} 1:${+massstabVon(a).toFixed(2)}</text></g>`);
      // Lupe: Kreis und Buchstabe in der Ausgangsansicht
      if (a.lupe && r.quelle) { const q = r.quelle, R = +a.lupe.r || 10, x = q.x + a.lupe.cx, y = q.y + a.lupe.cy;
        out.push(`<circle cx="${z(x)}" cy="${z(y)}" r="${z(R)}" class="lupenkreis"/><text x="${z(x + R * 0.75 + 2)}" y="${z(y - R * 0.75 - 1)}" class="t5 fett">${esc(a.lupe.buchstabe || "B")}</text>`); }
      // Schnittlinie mit Pfeilen in jeder Ansicht, die quer zur Schnittebene schaut
      if (a.schnitt) {
        const d = new THREE.Vector3(...(RICHTUNGEN[a.art] || RICHTUNGEN.vorne).d).normalize(), L = (+a.schnitt.lage || 0), b0 = d.clone().multiplyScalar(L);
        for (const q of plan.ansichten) {
          if (q === a || q.schnitt || q.lupe) continue; const rq = ansicht(q); if (!rq) continue;
          const dq = new THREE.Vector3(...(RICHTUNGEN[q.art] || RICHTUNGEN.vorne).d).normalize(); if (Math.abs(dq.dot(d)) > 1e-6) continue;
          const u = d.clone().cross(dq).normalize(), P = (t) => rq.abbild(b0.clone().addScaledVector(u, t).toArray());
          const p0 = P(0), p1 = P(1000), dir = [p1[0] - p0[0], p1[1] - p0[1]], l = Math.hypot(...dir) || 1, e = [dir[0] / l, dir[1] / l];
          // auf das Ansichtsrechteck (+4 mm) beschneiden
          let t0 = -1e9, t1 = 1e9; const lim = [[-4, rq.breite + 4], [-4, rq.hoehe + 4]];
          for (let k = 0; k < 2; k++) { if (Math.abs(e[k]) < 1e-9) { if (p0[k] < lim[k][0] || p0[k] > lim[k][1]) t0 = 1, t1 = 0; continue; } const ta = (lim[k][0] - p0[k]) / e[k], tb = (lim[k][1] - p0[k]) / e[k]; t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb)); }
          if (t1 <= t0) continue;
          const A = [q.x + p0[0] + e[0] * t0, q.y + p0[1] + e[1] * t0], Bp = [q.x + p0[0] + e[0] * t1, q.y + p0[1] + e[1] * t1];
          const s0 = rq.abbild(b0.toArray()), s1 = rq.abbild(b0.clone().addScaledVector(d, -100).toArray()), pd = [s1[0] - s0[0], s1[1] - s0[1]], pl = Math.hypot(...pd) || 1, n = [(pd[0] / pl) * 6, (pd[1] / pl) * 6]; // Blickrichtung
          const bu = esc(a.schnitt.buchstabe || "A");
          out.push(`<g class="schnittlinie"><line x1="${z(A[0])}" y1="${z(A[1])}" x2="${z(Bp[0])}" y2="${z(Bp[1])}" class="schnittspur"/>${[A, Bp].map((P) => `<line x1="${z(P[0])}" y1="${z(P[1])}" x2="${z(P[0] + n[0])}" y2="${z(P[1] + n[1])}" class="masslinie" marker-end="url(#pp)"/><text x="${z(P[0] + n[0] * 1.6)}" y="${z(P[1] + n[1] * 1.6 + 1.8)}" class="t5 fett" text-anchor="middle">${bu}</text>`).join("")}</g>`);
        }
      }
    }
    // Schnitte (Querschnitte der Kantenbausteine)
    for (const d of plan.details) {
      const r = ctx.detailSvg(d.fid, d.massstab); const sel = auswahl === d.id;
      if (!r) { out.push(`<text x="${d.x}" y="${d.y}" class="t3">(Schnitt fehlt)</text>`); continue; }
      out.push(`<g data-id="${d.id}">${bildschirm ? `<rect x="${z(d.x)}" y="${z(d.y)}" width="${z(r.b)}" height="${z(r.h)}" class="treffer${sel ? " sel" : ""}"/>` : ""}${r.svg.replace("<svg ", `<svg x="${z(d.x)}" y="${z(d.y)}" `)}
        <text x="${z(d.x + r.b / 2)}" y="${z(d.y + r.h + 5)}" class="t35">${esc(d.titel || r.name)} 1:${d.massstab}</text></g>`);
    }
    // Masse
    for (const m of plan.masse) {
      const a = plan.ansichten.find((x) => x.id === m.ansicht); const r = a && ansicht(a); if (!r) continue;
      const [ax, ay] = r.abbild(m.a), [bx, by] = r.abbild(m.b), A = [ax + a.x, ay + a.y], B = [bx + a.x, by + a.y], L = m.lage || [(A[0] + B[0]) / 2, Math.min(A[1], B[1]) - 8];
      const sel = auswahl === m.id ? " sel" : "";
      let p1, p2, wert;
      const MS = massstabVon(a);
      if (m.art === "h") { p1 = [A[0], L[1]]; p2 = [B[0], L[1]]; wert = Math.abs(B[0] - A[0]) * MS; }
      else if (m.art === "v") { p1 = [L[0], A[1]]; p2 = [L[0], B[1]]; wert = Math.abs(B[1] - A[1]) * MS; }
      else { const d = [B[0] - A[0], B[1] - A[1]], l = Math.hypot(...d) || 1, n = [-d[1] / l, d[0] / l], k = (L[0] - A[0]) * n[0] + (L[1] - A[1]) * n[1]; p1 = [A[0] + n[0] * k, A[1] + n[1] * k]; p2 = [B[0] + n[0] * k, B[1] + n[1] * k]; wert = l * MS; }
      const wi = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI, w2 = wi > 90 || wi <= -90 ? wi + 180 : wi, mt = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      out.push(`<g data-id="${m.id}" class="mass${sel}"><path d="M${z(A[0])} ${z(A[1])}L${z(p1[0])} ${z(p1[1])}M${z(B[0])} ${z(B[1])}L${z(p2[0])} ${z(p2[1])}" class="hilfs"/>
        <line x1="${z(p1[0])}" y1="${z(p1[1])}" x2="${z(p2[0])}" y2="${z(p2[1])}" class="masslinie" marker-start="url(#pp)" marker-end="url(#pp)"/>
        <text x="${z(mt[0])}" y="${z(mt[1])}" dy="-1.2" transform="rotate(${z(w2)} ${z(mt[0])} ${z(mt[1])})" class="t35 masstext">${esc(m.text || (+wert.toFixed(1)).toString())}</text></g>`);
    }
    // Texte (z. B. Detailhinweise «A» mit Pfeil)
    for (const t of plan.texte) {
      const sel = auswahl === t.id ? " sel" : "";
      out.push(`<g data-id="${t.id}" class="text${sel}">${t.pfeil ? `<line x1="${z(t.x)}" y1="${z(t.y)}" x2="${z(t.pfeil[0])}" y2="${z(t.pfeil[1])}" class="masslinie" marker-end="url(#pp)"/>` : ""}
        <text x="${z(t.x)}" y="${z(t.y)}" class="frei" font-size="${t.groesse || 5}">${esc(t.text)}</text></g>`);
    }
    // Schriftfeld
    const x0 = F.b - rr - sfB, y0 = F.h - ru - sfH, zeile = (i) => y0 + 6 + i * 6.5;
    out.push(`<g class="schriftfeld"><rect x="${x0}" y="${y0}" width="${sfB}" height="${sfH}" class="rahmen"/><line x1="${x0 + 110}" y1="${y0}" x2="${x0 + 110}" y2="${y0 + sfH}" class="duenn"/>
      <text x="${x0 + 3}" y="${zeile(0)}" class="t25 grau">OBJEKT</text><text x="${x0 + 3}" y="${zeile(0) + 5}" class="t5">${esc(doc.objekt)}</text>
      <text x="${x0 + 3}" y="${zeile(2)}" class="t25 grau">PLAN</text><text x="${x0 + 3}" y="${zeile(2) + 5.5}" class="t5 fett">${esc(plan.name)}</text>
      <text x="${x0 + 113}" y="${zeile(0)}" class="t25 grau">NR.</text><text x="${x0 + 113}" y="${zeile(0) + 4.5}" class="t35">${esc(doc.nr)}</text>
      <text x="${x0 + 143}" y="${zeile(0)}" class="t25 grau">BLATT</text><text x="${x0 + 143}" y="${zeile(0) + 4.5}" class="t35">${nr} / ${von}</text>
      <text x="${x0 + 113}" y="${zeile(2) - 1.5}" class="t25 grau">MASSSTAB</text><text x="${x0 + 113}" y="${zeile(2) + 3}" class="t35">${M ? "1:" + M : "–"}</text>
      <text x="${x0 + 143}" y="${zeile(2) - 1.5}" class="t25 grau">DATUM</text><text x="${x0 + 143}" y="${zeile(2) + 3}" class="t35">${new Date().toLocaleDateString("de-CH")}</text>
      <text x="${x0 + 113}" y="${zeile(3) + 3.5}" class="t25 grau">${esc(einst.druck?.betrieb || "Spengler Digital CAD")}</text></g>`);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${F.b} ${F.h}" class="planblatt-svg">
<defs><pattern id="schraffur" patternUnits="userSpaceOnUse" width="1.6" height="1.6" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.6" stroke="#000" stroke-width=".2"/></pattern><marker id="pp" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="3.2" markerHeight="3.2" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 3L10 5L0 7z" fill="#000"/></marker></defs>
<style>.rahmen{fill:none;stroke:#000;stroke-width:.5}.duenn{stroke:#000;stroke-width:.25}.sichtbar{fill:none;stroke:#000;stroke-width:.35;stroke-linecap:round}.verdeckt{fill:none;stroke:#000;stroke-width:.18;stroke-dasharray:1.5 1}
.hilfs{stroke:#000;stroke-width:.18;fill:none}.schnittflaeche{fill:url(#schraffur);fill-rule:evenodd;stroke:#000;stroke-width:.5}.lupenrand{fill:none;stroke:#000;stroke-width:.35}.lupenkreis{fill:none;stroke:#000;stroke-width:.25;stroke-dasharray:3 1 .5 1}.schnittspur{stroke:#000;stroke-width:.5;stroke-dasharray:6 1.5 1 1.5}.masslinie{stroke:#000;stroke-width:.25}text{font-family:Arial,Helvetica,sans-serif;fill:#000}.t25{font-size:2.5px}.t3{font-size:3px}.t35{font-size:3.5px;text-anchor:middle}.t5{font-size:5px}.fett{font-weight:700}.grau{fill:#555}
.schriftfeld .t35{text-anchor:start}.frei{text-anchor:middle;dominant-baseline:middle}.treffer{fill:transparent;stroke:#1f5fbf33;stroke-width:.3;stroke-dasharray:2 2}.treffer.sel{stroke:#e0782b;stroke-width:.6}.sel text,.sel line,.sel path{stroke:#e0782b;fill:#e0782b}</style>
<rect width="${F.b}" height="${F.h}" fill="#fff"/>
${out.join("\n")}
</svg>`;
  }

  // ---------------------------------------------------------- Editor
  let plan = null, modus = "auswahl", sel = null, mass = null, zug = null;
  const $ = (id) => document.getElementById(id);
  const plaene = () => (ctx.doc().plaene ||= []);
  function neuerPlan() {
    const p = { id: neuId(), name: "Plan " + (plaene().length + 1), format: "A3", ansichten: [], details: [], masse: [], texte: [] };
    plaene().push(p); return p;
  }
  function oeffnen() {
    plan = plaene()[0] || neuerPlan(); sel = null; modus = "auswahl";
    $("planEditor").hidden = false; zeige();
  }
  const element = (id) => [...plan.ansichten, ...plan.details, ...plan.masse, ...plan.texte].find((x) => x.id === id);
  function zeige() {
    const p = plaene(), i = p.indexOf(plan);
    $("plBlatt").innerHTML = p.map((x, k) => `<option value="${k}" ${k === i ? "selected" : ""}>${esc(x.name)}</option>`).join("");
    $("plFormat").value = plan.format;
    document.querySelectorAll("#planEditor [data-modus]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.modus === modus));
    $("plFlaeche").innerHTML = blattSvg(plan, { auswahl: sel, nr: i + 1, von: p.length, bildschirm: true });
    eigenschaften(); ctx.speichern();
  }
  function eigenschaften() {
    const e = sel && element(sel), box = $("plEigen");
    if (!e) { box.innerHTML = `<p class="hinweis">${{ auswahl: "Element anklicken und ziehen. «+ Ansicht» (auch Schnitte) oder «+ Bausteinschnitt» platziert eine Zeichnung; «Auto-Masse» bemasst die gewählte Ansicht.", mass: "Bemassen: zwei Eckpunkte einer Ansicht anklicken, dann die Lage des Masses (oben/unten = waagrecht, seitlich = senkrecht).", text: "Text: Stelle anklicken, Text eingeben. Mit gedrückter Maus ziehen = Hinweispfeil.", lupe: "Detail (Lupe): in einer Ansicht die Stelle anklicken, die vergrössert werden soll." }[modus]}</p>`; return; }
    const ms = (v) => PLAN_MASSSTAEBE.map((m) => `<option value="${m}" ${+v === m ? "selected" : ""}>1:${m}</option>`).join("");
    if (e.lupe) box.innerHTML = `<label class="feld"><span>Vergrösserung</span><select data-e="faktor">${[1.5, 2, 3, 4, 5, 8, 10].map((k) => `<option value="${k}" ${+e.lupe.faktor === k ? "selected" : ""}>${k}×</option>`).join("")}</select></label>
      <label class="feld"><span>Radius auf dem Blatt (mm)</span><input data-e="r" type="number" step="1" value="${e.lupe.r}"></label>
      <label class="feld"><span>Mitte x / y (mm)</span><span><input data-e="cx" type="number" step="0.5" value="${z(e.lupe.cx)}" style="width:48%"> <input data-e="cy" type="number" step="0.5" value="${z(e.lupe.cy)}" style="width:48%"></span></label>
      <label class="feld"><span>Buchstabe</span><input data-e="buchstabe" value="${esc(e.lupe.buchstabe || "B")}"></label>
      <label class="feld"><span>Beschriftung</span><input data-e="titel" value="${esc(e.titel || "")}"></label>`;
    else if (plan.ansichten.includes(e)) box.innerHTML = `${e.schnitt ? `<label class="feld"><span>Schnittebene (mm)</span><input data-e="lage" type="number" step="10" value="${e.schnitt.lage}"></label><label class="feld"><span>Buchstabe</span><input data-e="buchstabe" value="${esc(e.schnitt.buchstabe || "A")}"></label>` : ""}<label class="feld"><span>${e.schnitt ? "Blickrichtung" : "Ansicht"}</span><select data-e="art">${Object.entries(RICHTUNGEN).map(([k, r]) => `<option value="${k}" ${e.art === k ? "selected" : ""}>${r.name}</option>`).join("")}</select></label>
      <label class="feld"><span>Massstab</span><select data-e="massstab">${ms(e.massstab)}</select></label>
      <label class="feld"><span>Verdeckte Kanten</span><select data-e="verdeckt"><option value="1" ${e.verdeckt !== false ? "selected" : ""}>zeigen</option><option value="" ${e.verdeckt === false ? "selected" : ""}>weglassen</option></select></label>
      <label class="feld"><span>Beschriftung</span><input data-e="titel" value="${esc(e.titel || "")}" placeholder="${esc(RICHTUNGEN[e.art]?.name)}"></label>`;
    else if (plan.details.includes(e)) box.innerHTML = `<label class="feld"><span>Massstab</span><select data-e="massstab">${ms(e.massstab)}</select></label><label class="feld"><span>Beschriftung</span><input data-e="titel" value="${esc(e.titel || "")}"></label>`;
    else if (plan.masse.includes(e)) box.innerHTML = `<label class="feld"><span>Art</span><select data-e="art"><option value="h" ${e.art === "h" ? "selected" : ""}>waagrecht</option><option value="v" ${e.art === "v" ? "selected" : ""}>senkrecht</option><option value="a" ${e.art === "a" ? "selected" : ""}>ausgerichtet</option></select></label>
      <label class="feld"><span>Text statt Wert</span><input data-e="text" value="${esc(e.text || "")}" placeholder="z. B. 1/3"></label>`;
    else box.innerHTML = `<label class="feld"><span>Text</span><input data-e="text" value="${esc(e.text)}"></label><label class="feld"><span>Grösse (mm)</span><input data-e="groesse" type="number" step="0.5" value="${e.groesse || 5}"></label>`;
    box.insertAdjacentHTML("beforeend", `<div class="reihe ohnerand"><button class="knopf weg" data-pl="loeschen">Entfernen</button></div>`);
  }
  const blattPunkt = (ev) => { const svg = $("plFlaeche").querySelector("svg"), pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y]; };
  function fang(q) { // nächster Eckpunkt einer Ansicht (3 mm)
    let best = null, bd = 3;
    for (const a of plan.ansichten) { const r = ansicht(a); if (!r) continue; for (const p of r.punkte) { const d = Math.hypot(p.x + a.x - q[0], p.y + a.y - q[1]); if (d < bd) { bd = d; best = { a, w: p.w, q: [p.x + a.x, p.y + a.y] }; } } }
    return best;
  }
  function treffer(q) {
    for (const t of plan.texte) if (Math.abs(t.x - q[0]) < (t.text.length * (t.groesse || 5)) * 0.35 && Math.abs(t.y - q[1]) < (t.groesse || 5)) return t;
    for (const m of plan.masse) { const g = $("plFlaeche").querySelector(`[data-id="${m.id}"] text`); if (g) { const b = g.getBBox(); if (q[0] > b.x - 2 && q[0] < b.x + b.width + 2 && q[1] > b.y - 2 && q[1] < b.y + b.height + 2) return m; } }
    for (const d of plan.details) { const r = ctx.detailSvg(d.fid, d.massstab); if (r && q[0] > d.x && q[0] < d.x + r.b && q[1] > d.y && q[1] < d.y + r.h) return d; }
    for (const a of plan.ansichten) { const r = ansicht(a); if (r && q[0] > a.x && q[0] < a.x + r.breite && q[1] > a.y && q[1] < a.y + r.hoehe) return a; }
    return null;
  }
  function binden() {
    $("plFlaeche").addEventListener("pointerdown", (ev) => {
      const q = blattPunkt(ev);
      if (modus === "auswahl") { const t = treffer(q); sel = t?.id || null; if (t) zug = { e: t, von: q, x: t.x ?? t.lage?.[0], y: t.y ?? t.lage?.[1] }; zeige(); return; }
      if (modus === "lupe") {
        const q0 = plan.ansichten.find((a) => { const r = ansicht(a); return !a.lupe && r && q[0] > a.x && q[0] < a.x + r.breite && q[1] > a.y && q[1] < a.y + r.hoehe; });
        if (!q0) return ctx.status("In eine Ansicht klicken – dort, wo vergrössert werden soll.");
        const r0 = ansicht(q0), nB = String.fromCharCode(66 + plan.ansichten.filter((a) => a.lupe).length);
        const a = { id: neuId(), art: q0.art, massstab: q0.massstab, lupe: { quelle: q0.id, cx: q[0] - q0.x, cy: q[1] - q0.y, r: 12, faktor: 4, buchstabe: nB }, x: q0.x, y: Math.max(...plan.ansichten.map((v) => { const rv = ansicht(v); return rv ? v.y + rv.hoehe : 0; })) + 30 };
        plan.ansichten.push(a); sel = a.id; modus = "auswahl"; zeige(); return ctx.status(`Detail ${nB} angelegt – Vergrösserung und Radius rechts anpassen, Detail an seinen Platz ziehen.`);
      }
      if (modus === "text") { const text = prompt("Text (z. B. Detailbuchstabe)", "A"); if (!text) return; const t = { id: neuId(), x: q[0], y: q[1], text, groesse: 5 }; plan.texte.push(t); sel = t.id; zug = { e: t, pfeil: true }; zeige(); return; }
      if (modus === "mass") {
        if (!mass) { const f = fang(q); if (!f) return ctx.status("Eckpunkt einer Ansicht anklicken (Fang 3 mm)."); mass = { a: f }; ctx.status("Zweiten Punkt anklicken."); return; }
        if (!mass.b) { const f = fang(q); if (!f || f.a !== mass.a.a) return ctx.status("Zweiten Punkt in derselben Ansicht anklicken."); mass.b = f; ctx.status("Lage des Masses anklicken."); return; }
        const A = mass.a.q, B = mass.b.q, mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
        const art = Math.abs(q[1] - my) >= Math.abs(q[0] - mx) ? "h" : "v";
        const m = { id: neuId(), ansicht: mass.a.a.id, a: mass.a.w, b: mass.b.w, art, lage: q };
        plan.masse.push(m); mass = null; sel = m.id; zeige(); ctx.status("Mass gesetzt.");
      }
    });
    $("plFlaeche").addEventListener("pointermove", (ev) => {
      if (!zug) return; const q = blattPunkt(ev);
      if (zug.pfeil) { if (Math.hypot(q[0] - zug.e.x, q[1] - zug.e.y) > 3) zug.e.pfeil = q; }
      else if (zug.e.lage) zug.e.lage = [zug.x + q[0] - zug.von[0], zug.y + q[1] - zug.von[1]];
      else { zug.e.x = zug.x + q[0] - zug.von[0]; zug.e.y = zug.y + q[1] - zug.von[1]; }
      $("plFlaeche").innerHTML = blattSvg(plan, { auswahl: sel, bildschirm: true, nr: plaene().indexOf(plan) + 1, von: plaene().length });
    });
    addEventListener("pointerup", () => { if (zug) { zug = null; zeige(); } });
    $("plEigen").addEventListener("change", (ev) => {
      const e = element(sel), k = ev.target.dataset.e; if (!e || !k) return;
      if (e.lupe && ["faktor", "r", "cx", "cy", "buchstabe"].includes(k)) { e.lupe[k] = k === "buchstabe" ? ev.target.value : +ev.target.value; return zeige(); }
      if (e.schnitt && ["lage", "buchstabe"].includes(k)) { e.schnitt[k] = k === "lage" ? +ev.target.value : ev.target.value; return zeige(); }
      e[k] = k === "massstab" || k === "groesse" ? +ev.target.value : k === "verdeckt" ? !!ev.target.value : ev.target.value; zeige();
    });
    $("plEigen").addEventListener("click", (ev) => {
      if (ev.target.dataset.pl !== "loeschen") return;
      for (const k of ["ansichten", "details", "masse", "texte"]) plan[k] = plan[k].filter((x) => x.id !== sel);
      plan.masse = plan.masse.filter((m) => plan.ansichten.some((a) => a.id === m.ansicht)); sel = null; zeige();
    });
    $("planEditor").addEventListener("click", (ev) => {
      const b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.modus) { modus = b.dataset.modus; mass = null; sel = null; zeige(); }
      else if (b.dataset.plansicht) { // neue Ansicht: rechts neben die letzte, Massstab passend zum Blatt
        const F = FORMATE[plan.format], vorige = plan.ansichten.filter((x) => !x.lupe).at(-1), M = vorige?.massstab || passenderPlanMassstab(F);
        const schnitt = b.dataset.plansicht.startsWith("schnitt:"), art = schnitt ? b.dataset.plansicht.slice(8) : b.dataset.plansicht;
        const a = { id: neuId(), art, massstab: M, verdeckt: !schnitt && art !== "iso", x: 30, y: 25 };
        if (schnitt) { const d = new THREE.Vector3(...RICHTUNGEN[art].d), bx = new THREE.Box3(); ctx.meshes().forEach((m) => bx.expandByObject(m)); a.schnitt = { lage: bx.isEmpty() ? 0 : Math.round(bx.getCenter(new THREE.Vector3()).dot(d)), buchstabe: String.fromCharCode(65 + plan.ansichten.filter((x) => x.schnitt).length) }; }
        if (vorige) { const r = ansicht(vorige); a.x = vorige.x + (r?.breite || 50) + 35; a.y = vorige.y; }
        plan.ansichten.push(a); sel = a.id; $("plAnsichtMenue").hidden = true; zeige();
      } else if (b.dataset.detail) { plan.details.push({ id: neuId(), fid: b.dataset.detail, massstab: 1, x: 40, y: 150 }); $("plDetailMenue").hidden = true; zeige(); }
      else if (b.id === "plNeuAnsicht") { $("plAnsichtMenue").hidden = !$("plAnsichtMenue").hidden; }
      else if (b.id === "plNeuDetail") { const d = ctx.details(); $("plDetailMenue").innerHTML = d.length ? d.map(([id, n]) => `<button data-detail="${id}">${esc(n)}</button>`).join("") : '<p class="hinweis">Noch keine Kanten mit Baustein – Flächenblech wählen und Kanten antippen.</p>'; $("plDetailMenue").hidden = !$("plDetailMenue").hidden; }
      else if (b.id === "plNeu") { plan = neuerPlan(); sel = null; zeige(); }
      else if (b.id === "plAutoMass") autoMasse();
      else if (b.id === "plUmbenennen") { const n = prompt("Name des Plans", plan.name); if (n?.trim()) { plan.name = n.trim(); zeige(); } }
      else if (b.id === "plWeg") { if (!confirm(`«${plan.name}» löschen?`)) return; plaene().splice(plaene().indexOf(plan), 1); plan = plaene()[0] || neuerPlan(); zeige(); }
      else if (b.id === "plDruck") drucken();
      else if (b.id === "plSvg") ctx.herunterladen(`${ctx.doc().nr} ${plan.name}.svg`, blattSvg(plan, { nr: plaene().indexOf(plan) + 1, von: plaene().length }), "image/svg+xml");
      else if (b.id === "plZu") { $("planEditor").hidden = true; ctx.fertig(); }
    });
    $("plBlatt").onchange = (e) => { plan = plaene()[+e.target.value]; sel = null; zeige(); };
    $("plFormat").onchange = (e) => { plan.format = e.target.value; zeige(); };
    addEventListener("keydown", (e) => {
      if ($("planEditor").hidden || e.target.closest?.("input,select")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel) { e.preventDefault(); $("plEigen").querySelector('[data-pl="loeschen"]')?.click(); }
      if (e.key === "Escape") { if (mass || sel) { mass = null; sel = null; zeige(); } else $("plZu").click(); }
    });
  }
  // Automatische Bemassung: Gesamtmasse und Kettenmasse (verschiedene x bzw. y der Eckpunkte) unter bzw. rechts der Ansicht
  function autoMasse() {
    const a = plan.ansichten.find((x) => x.id === sel) || plan.ansichten.find((x) => !x.lupe); if (!a) return ctx.status("Zuerst eine Ansicht platzieren und anklicken.");
    const r = ansicht(a); if (!r?.punkte.length) return ctx.status("Keine Eckpunkte in dieser Ansicht.");
    plan.masse = plan.masse.filter((m) => !(m.ansicht === a.id && m.auto));
    const neu = (p, q, art, lage) => plan.masse.push({ id: neuId(), ansicht: a.id, a: p.w, b: q.w, art, lage, auto: true });
    // echte Ecken: Endpunkte zusammengefasster gerader Linien (Zwischenpunkte geteilter Kanten fallen weg)
    const gruppen = new Map();
    for (const [x1, y1, x2, y2] of r.sichtbar) {
      const l = Math.hypot(x2 - x1, y2 - y1); if (l < 0.2) continue; let dx = (x2 - x1) / l, dy = (y2 - y1) / l; if (dx < -1e-6 || (Math.abs(dx) < 1e-6 && dy < 0)) { dx = -dx; dy = -dy; }
      const off = -dy * x1 + dx * y1, k = `${Math.round(dx * 200)},${Math.round(dy * 200)},${Math.round(off * 4)}`;
      if (!gruppen.has(k)) gruppen.set(k, { dx, dy, st: [] }); const t1 = dx * x1 + dy * y1, t2 = dx * x2 + dy * y2; gruppen.get(k).st.push([Math.min(t1, t2), Math.max(t1, t2), x1, y1, x2, y2]);
    }
    const ecken = [];
    for (const g of gruppen.values()) {
      g.st.sort((a, b) => a[0] - b[0]); let cur = null;
      const fertig = () => { if (cur) for (const t of [cur.t0, cur.t1]) ecken.push(cur.p(t)); };
      for (const s2 of g.st) {
        const p0 = [s2[2], s2[3]], basis = (t) => { const t0 = g.dx * p0[0] + g.dy * p0[1]; return [p0[0] + g.dx * (t - t0), p0[1] + g.dy * (t - t0)]; };
        if (cur && s2[0] <= cur.t1 + 0.3) cur.t1 = Math.max(cur.t1, s2[1]); else { fertig(); cur = { t0: s2[0], t1: s2[1], p: basis }; }
      }
      fertig();
    }
    const echte = r.punkte.filter((p) => ecken.some(([x, y]) => Math.hypot(p.x - x, p.y - y) < 0.4));
    const stufen = (achse) => { const s = [...(echte.length > 1 ? echte : r.punkte)].sort((p, q) => p[achse] - q[achse]), out = []; for (const p of s) if (!out.length || p[achse] - out.at(-1)[achse] > 0.6) out.push(p); return out; };
    const xs = stufen("x"), ys = stufen("y"), unten = a.y + r.hoehe + 14, rechts = a.x + r.breite + 10;
    if (xs.length > 1) { neu(xs[0], xs.at(-1), "h", [0, unten + (xs.length > 2 && xs.length <= 12 ? 8 : 0)]); if (xs.length > 2 && xs.length <= 12) xs.slice(1).forEach((p, i) => neu(xs[i], p, "h", [0, unten])); }
    if (ys.length > 1) { neu(ys[0], ys.at(-1), "v", [rechts + (ys.length > 2 && ys.length <= 12 ? 8 : 0), 0]); if (ys.length > 2 && ys.length <= 12) ys.slice(1).forEach((p, i) => neu(ys[i], p, "v", [rechts, 0])); }
    sel = null; zeige(); ctx.status(`Automatisch bemasst: ${xs.length > 2 && xs.length <= 12 ? "Ketten- und " : ""}Gesamtmasse. Masse lassen sich verschieben oder löschen.`);
  }
  const passenderPlanMassstab = (F) => {
    const box = ctx.groesse(); return PLAN_MASSSTAEBE.find((m) => box / m <= (F.b - 60) / 2.2) || 100;
  };
  function drucken(alle = true) {
    const p = alle ? plaene() : [plan];
    ctx.drucken(p.map((x, i) => `<section class="planblatt plan${x.format}">${blattSvg(x, { nr: i + 1, von: p.length })}</section>`).join(""));
  }
  return { oeffnen, binden, blattSvg, drucken };
}
