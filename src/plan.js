// Spengler Digital CAD – Planblatt (wie Zeichnung in Fusion): Ansichten des Modells, Details, Bemassung, Text, Schriftfeld
import { rechneAnsicht, RICHTUNGEN } from "./ansicht.js";

export const FORMATE = { A3: { b: 420, h: 297 }, A4: { b: 297, h: 210 } };
export const PLAN_MASSSTAEBE = [1, 2, 5, 10, 20, 25, 50, 100];
const z = (v) => +(+v).toFixed(2);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ctx: { renderer, meshes(), signatur(), doc(), einst(), detailSvg(fid, M) → { svg, b, h } | null, status(t), herunterladen(), drucken(html) }
export function planModul(ctx) {
  const cache = new Map();
  const ansicht = (a) => {
    const key = `${a.art}|${a.massstab}|${a.verdeckt !== false}|${ctx.signatur()}`;
    if (!cache.has(key)) { if (cache.size > 40) cache.clear(); cache.set(key, rechneAnsicht(ctx.renderer, ctx.meshes(), a.art, 1 / a.massstab, { verdeckte: a.verdeckt !== false })); }
    return cache.get(key);
  };
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
      if (!r) { out.push(`<text x="${a.x}" y="${a.y}" class="t3">(kein Körper sichtbar)</text>`); continue; }
      const sel = auswahl === a.id;
      out.push(`<g transform="translate(${z(a.x)} ${z(a.y)})" data-id="${a.id}">${bildschirm ? `<rect width="${z(r.breite)}" height="${z(r.hoehe)}" class="treffer${sel ? " sel" : ""}"/>` : ""}
        ${r.verdeckt.length ? `<path d="${r.verdeckt.map(([x1, y1, x2, y2]) => `M${z(x1)} ${z(y1)}L${z(x2)} ${z(y2)}`).join("")}" class="verdeckt"/>` : ""}
        <path d="${r.sichtbar.map(([x1, y1, x2, y2]) => `M${z(x1)} ${z(y1)}L${z(x2)} ${z(y2)}`).join("")}" class="sichtbar"/>
        <text x="${z(r.breite / 2)}" y="${z(r.hoehe + 6)}" class="t35">${esc(a.titel || RICHTUNGEN[a.art]?.name)} 1:${a.massstab}</text></g>`);
    }
    // Details (Schnitte aus Spenglerdetails)
    for (const d of plan.details) {
      const r = ctx.detailSvg(d.fid, d.massstab); const sel = auswahl === d.id;
      if (!r) { out.push(`<text x="${d.x}" y="${d.y}" class="t3">(Detail fehlt)</text>`); continue; }
      out.push(`<g data-id="${d.id}">${bildschirm ? `<rect x="${z(d.x)}" y="${z(d.y)}" width="${z(r.b)}" height="${z(r.h)}" class="treffer${sel ? " sel" : ""}"/>` : ""}${r.svg.replace("<svg ", `<svg x="${z(d.x)}" y="${z(d.y)}" `)}
        <text x="${z(d.x + r.b / 2)}" y="${z(d.y + r.h + 5)}" class="t35">${esc(d.titel || r.name)} 1:${d.massstab}</text></g>`);
    }
    // Masse
    for (const m of plan.masse) {
      const a = plan.ansichten.find((x) => x.id === m.ansicht); const r = a && ansicht(a); if (!r) continue;
      const [ax, ay] = r.abbild(m.a), [bx, by] = r.abbild(m.b), A = [ax + a.x, ay + a.y], B = [bx + a.x, by + a.y], L = m.lage || [(A[0] + B[0]) / 2, Math.min(A[1], B[1]) - 8];
      const sel = auswahl === m.id ? " sel" : "";
      let p1, p2, wert;
      if (m.art === "h") { p1 = [A[0], L[1]]; p2 = [B[0], L[1]]; wert = Math.abs(B[0] - A[0]) / (1 / a.massstab); }
      else if (m.art === "v") { p1 = [L[0], A[1]]; p2 = [L[0], B[1]]; wert = Math.abs(B[1] - A[1]) / (1 / a.massstab); }
      else { const d = [B[0] - A[0], B[1] - A[1]], l = Math.hypot(...d) || 1, n = [-d[1] / l, d[0] / l], k = (L[0] - A[0]) * n[0] + (L[1] - A[1]) * n[1]; p1 = [A[0] + n[0] * k, A[1] + n[1] * k]; p2 = [B[0] + n[0] * k, B[1] + n[1] * k]; wert = l * a.massstab; }
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
<defs><marker id="pp" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="3.2" markerHeight="3.2" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 3L10 5L0 7z" fill="#000"/></marker></defs>
<style>.rahmen{fill:none;stroke:#000;stroke-width:.5}.duenn{stroke:#000;stroke-width:.25}.sichtbar{fill:none;stroke:#000;stroke-width:.35;stroke-linecap:round}.verdeckt{fill:none;stroke:#000;stroke-width:.18;stroke-dasharray:1.5 1}
.hilfs{stroke:#000;stroke-width:.18;fill:none}.masslinie{stroke:#000;stroke-width:.25}text{font-family:Arial,Helvetica,sans-serif;fill:#000}.t25{font-size:2.5px}.t3{font-size:3px}.t35{font-size:3.5px;text-anchor:middle}.t5{font-size:5px}.fett{font-weight:700}.grau{fill:#555}
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
    if (!e) { box.innerHTML = `<p class="hinweis">${{ auswahl: "Element anklicken und ziehen. «+ Ansicht» oder «+ Detail» platziert eine Zeichnung.", mass: "Bemassen: zwei Eckpunkte einer Ansicht anklicken, dann die Lage des Masses (oben/unten = waagrecht, seitlich = senkrecht).", text: "Text: Stelle anklicken, Text eingeben. Mit gedrückter Maus ziehen = Hinweispfeil." }[modus]}</p>`; return; }
    const ms = (v) => PLAN_MASSSTAEBE.map((m) => `<option value="${m}" ${+v === m ? "selected" : ""}>1:${m}</option>`).join("");
    if (plan.ansichten.includes(e)) box.innerHTML = `<label class="feld"><span>Ansicht</span><select data-e="art">${Object.entries(RICHTUNGEN).map(([k, r]) => `<option value="${k}" ${e.art === k ? "selected" : ""}>${r.name}</option>`).join("")}</select></label>
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
        const F = FORMATE[plan.format], vorige = plan.ansichten.at(-1), M = vorige?.massstab || passenderPlanMassstab(F);
        const a = { id: neuId(), art: b.dataset.plansicht, massstab: M, verdeckt: b.dataset.plansicht !== "iso", x: 30, y: 25 };
        if (vorige) { const r = ansicht(vorige); a.x = vorige.x + (r?.breite || 50) + 20; a.y = vorige.y; }
        plan.ansichten.push(a); sel = a.id; $("plAnsichtMenue").hidden = true; zeige();
      } else if (b.dataset.detail) { plan.details.push({ id: neuId(), fid: b.dataset.detail, massstab: 2, x: 40, y: 150 }); $("plDetailMenue").hidden = true; zeige(); }
      else if (b.id === "plNeuAnsicht") { $("plAnsichtMenue").hidden = !$("plAnsichtMenue").hidden; }
      else if (b.id === "plNeuDetail") { const d = ctx.details(); $("plDetailMenue").innerHTML = d.length ? d.map(([id, n]) => `<button data-detail="${id}">${esc(n)}</button>`).join("") : '<p class="hinweis">Noch keine Spenglerdetails.</p>'; $("plDetailMenue").hidden = !$("plDetailMenue").hidden; }
      else if (b.id === "plNeu") { plan = neuerPlan(); sel = null; zeige(); }
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
  const passenderPlanMassstab = (F) => {
    const box = ctx.groesse(); return PLAN_MASSSTAEBE.find((m) => box / m <= (F.b - 60) / 2.2) || 100;
  };
  function drucken(alle = true) {
    const p = alle ? plaene() : [plan];
    ctx.drucken(p.map((x, i) => `<section class="planblatt plan${x.format}">${blattSvg(x, { nr: i + 1, von: p.length })}</section>`).join(""));
  }
  return { oeffnen, binden, blattSvg, drucken };
}
