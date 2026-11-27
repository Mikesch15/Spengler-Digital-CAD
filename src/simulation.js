// Spengler Digital CAD – Simulation: Tragfähigkeit von Blechen (lineare Schalen-FEM, Richtwert – kein Nachweis)
// Oberfläche: angedocktes Fenster «Simulation» (Studie, Modell, Lager, Lasten, Lastfälle, Nachweis, Ergebnis), Auswahl per Klick in der 3D-Ansicht,
// Ergebnisfarben auf der Mittelfläche, Bericht. Die Rechnung steht in kern/fem/.
import * as THREE from "three";
import { baueModell } from "../kern/fem/blechmodell.js";
import { analyse, auswahl, rechneStudie } from "../kern/fem/studie.js";
import { werkstoff } from "../kern/fem/werkstoff.js";
import { schneelast, windlast, personenlast, kombinationen, BEIWERTE, QUELLENSTAND } from "../kern/fem/normen.js";
import { berichtHtml, lagerText, lastText, HINWEIS } from "../kern/fem/bericht.js";

export const LAGERARTEN = [["eingespannt", "Einspannung (fest)"], ["gelenkig", "Gelenkig (Verschiebung gesperrt)"], ["gleitX", "Gleitlager – frei in X"], ["gleitY", "Gleitlager – frei in Y"], ["gleitZ", "Gleitlager – frei in Z"], ["nurX", "Nur X gesperrt"], ["nurY", "Nur Y gesperrt"], ["nurZ", "Nur Z gesperrt (Auflager)"], ["vorgabe", "Vorgegebene Verschiebung"]];
const FESTE = { eingespannt: { ux: 1, uy: 1, uz: 1, rx: 1, ry: 1, rz: 1 }, gelenkig: { ux: 1, uy: 1, uz: 1 }, gleitX: { uy: 1, uz: 1 }, gleitY: { ux: 1, uz: 1 }, gleitZ: { ux: 1, uy: 1 }, nurX: { ux: 1 }, nurY: { uy: 1 }, nurZ: { uz: 1 }, vorgabe: { ux: 1, uy: 1, uz: 1 } };
const RICHT = [["-z", "nach unten (−Z)"], ["+z", "nach oben (+Z)"], ["-y", "−Y"], ["+y", "+Y"], ["-x", "−X"], ["+x", "+X"], ["normal", "auf die angeklickte Fläche"], ["weg", "von der angeklickten Fläche weg"]];
const AUSWAHLEN = [["flaeche", "Fläche"], ["kante", "Kante"], ["punkt", "Punkt"], ["ebene", "Querschnitt (Stirn)"]];
const WAHLNAME = { flaeche: "Fläche", kante: "Kante", punkt: "Punkt", ebene: "Querschnitt" };
const ANZEIGEN = [["spannung", "Vergleichsspannung"], ["verschiebung", "Verschiebung"], ["sicherheit", "Sicherheit (zul./vorh.)"], ["beulform", "Beulform"]];
const PALETTE = [[0, [37, 99, 235]], [0.25, [6, 182, 212]], [0.5, [34, 197, 94]], [0.75, [250, 204, 21]], [1, [220, 38, 38]]];
const farbe = (t) => { t = Math.max(0, Math.min(1, t)); for (let i = 1; i < PALETTE.length; i++) if (t <= PALETTE[i][0]) { const [t0, a] = PALETTE[i - 1], [t1, b] = PALETTE[i], f = (t - t0) / (t1 - t0); return a.map((x, j) => (x + (b[j] - x) * f) / 255); } return PALETTE.at(-1)[1].map((x) => x / 255); };
const z = (v, n = 1) => (Number.isFinite(v) ? (+v).toFixed(n) : "∞");
const neueId = () => "E" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const achse = (k) => { const a = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[k[1]], s = k[0] === "-" ? -1 : 1; return a.map((v) => v * s); };
const richtungVon = (k, nref) => (k === "normal" ? nref.map((x) => -x) : k === "weg" ? nref.slice() : achse(k));

export function simModul(ctx) {
  const { $, esc, status, szene, modell, kamera, renderer } = ctx;
  const marken = new THREE.Group(), ergGr = new THREE.Group(), sonden = new THREE.Group(); szene.add(marken); szene.add(ergGr); szene.add(sonden);
  const S = { M: null, G: null, sig: null, erg: null, form: null, zeige: { art: "spannung", kombi: 0, ueber: "", koerper: false }, offen: false, cache: new WeakMap() };

  const sim = () => { const d = ctx.doc(); d.simulation ||= { studien: [], aktiv: 0 }; if (!d.simulation.studien.length) d.simulation.studien.push(neueStudie(1)); return d.simulation; };
  const neueStudie = (n) => ({ id: neueId(), name: `Studie ${n}`, teile: null, h: null, lager: [], lasten: [], lastfaelle: [{ id: "LF1", name: "Lastfall 1", art: "Q" }], kombiModus: "einzeln", gammaM: 1, durchbiegungN: 200, beulen: false, rp: null, emod: null, norm: [] });
  const st = () => { const s = sim(); s.aktiv = Math.min(s.aktiv, s.studien.length - 1); return s.studien[s.aktiv]; };
  const geoSig = () => JSON.stringify([ctx.doc().features, ctx.doc().komponentenLage, ctx.doc().parameter, st().teile, st().h], (k, v) => (k.startsWith("_") ? undefined : v));

  // ------------------------------------------------------------------ Modell
  function modellSichern() {
    const s = st(), sig = geoSig();
    if (S.M && sig === S.sig) return S.M;
    const q = ctx.quellen(s.teile); if (!q.length) throw new Error("Kein Blech im Modell – ein Blechprofil oder Flächenblech anlegen (sichtbar, nicht unterdrückt)");
    S.M = baueModell(q, s.h || null); S.G = analyse(S.M); S.box = [Infinity, -Infinity, Infinity, -Infinity, Infinity, -Infinity]; for (const p of S.M.nodes) for (let j = 0; j < 3; j++) { S.box[2 * j] = Math.min(S.box[2 * j], p[j]); S.box[2 * j + 1] = Math.max(S.box[2 * j + 1], p[j]); } S.Lref = Math.max(S.box[1] - S.box[0], S.box[3] - S.box[2], S.box[5] - S.box[4]); S.sig = sig; S.erg = null; S.cache = new WeakMap(); S.quellen = q;
    return S.M;
  }
  const matWerte = () => {
    const s = st(), q = S.quellen?.[0], m = ctx.material(q?.material), w = werkstoff(m);
    return { ...w, name: m?.name || "Werkstoff", rp: +s.rp > 0 ? +s.rp : w.rp, E: +s.emod > 0 ? +s.emod : w.E };
  };
  const loes = (sel) => { if (!sel) return null; let r = S.cache.get(sel); if (!r) { r = auswahl(S.M, S.G, sel); S.cache.set(sel, r); } return r; };

  // ------------------------------------------------------------------ Marken (Lager, Lasten, Auswahl)
  const dirPfeil = (p, d, L, c) => { const a = new THREE.ArrowHelper(new THREE.Vector3(...d).normalize(), new THREE.Vector3(...p), L, c, L * 0.32, L * 0.18); for (const o of [a.line, a.cone]) { o.material.depthTest = false; o.material.transparent = true; o.renderOrder = 20; } return a; };
  const punkte = (pos, c, gr) => { const g = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pos.flat(), 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color: c, size: gr, sizeAttenuation: false, depthTest: false, transparent: true })); m.renderOrder = 19; return m; };
  function zeigeMarken() {
    ctx.leeren(marken); if (!S.offen || !S.M) return;
    const s = st(), M = S.M, L = S.Lref || 500, cen = (r) => { const a = [0, 0, 0]; let n = 0; for (const i of r.knoten.keys()) { a[0] += M.nodes[i][0]; a[1] += M.nodes[i][1]; a[2] += M.nodes[i][2]; n++; } return n ? a.map((x) => x / n) : null; };
    const knoten = (r) => [...r.knoten.keys()].slice(0, 600).map((i) => M.nodes[i]);
    const lager = [...s.lager.map((l) => ({ l, o: false }))], lasten = s.lasten.filter((l) => l.aktiv !== false);
    for (const { l } of lager) { const r = loes(l.sel); if (!r) continue; marken.add(punkte(knoten(r), l.art === "eingespannt" ? 0x1f6fb2 : l.art === "vorgabe" ? 0x1d8fff : l.art.startsWith("gleit") ? 0x8e6bbf : 0x2a9d8f, 7)); }
    for (const l of lasten) {
      const r = l.sel ? loes(l.sel) : null;
      if (l.art === "kraft" && r) { const c = cen(r); if (c) marken.add(dirPfeil(c.map((x, i) => x - (l.F[i] / (Math.hypot(...l.F) || 1)) * L * 0.15), l.F, L * 0.15, 0xd62828)); }
      else if (l.art === "strecke" && r) { const ks = [...r.knoten.keys()], dd = l.q, nrm = Math.hypot(...dd) || 1; ks.filter((_, i) => i % Math.max(1, Math.ceil(ks.length / 8)) === 0).forEach((i) => marken.add(dirPfeil(M.nodes[i].map((x, j) => x - (dd[j] / nrm) * L * 0.08), dd, L * 0.08, 0xd62828))); }
      else if (l.art === "druck" && r) { const es = r.elemente, k = Math.max(1, Math.ceil(es.length / 14)); es.filter((_, i) => i % k === 0).forEach((e) => { let d = l.modus === "richtung" ? richtungVon(l.richtung || "-z", l.nref || [0, 0, 1]) : S.G.nor[e].slice(); if (l.modus !== "richtung") { if (l.nref && d[0] * l.nref[0] + d[1] * l.nref[1] + d[2] * l.nref[2] < 0) d = d.map((x) => -x); d = d.map((x) => -x * (l.vorzeichen || 1)); } marken.add(dirPfeil(S.G.sp[e].map((x, j) => x - d[j] * L * 0.08), d, L * 0.08, 0xd62828)); }); }
      else if (l.art === "schwerkraft") { const b = S.box; if (b) marken.add(dirPfeil([(b[0] + b[1]) / 2, (b[2] + b[3]) / 2, b[5] + L * 0.2], l.g || [0, 0, -1], L * 0.18, 0x6c757d)); }
    }
    const f = S.form; if (f?.sel) { const r = loes(f.sel); if (r) marken.add(punkte(knoten(r), 0xf59e0b, 9)); }
  }

  // ------------------------------------------------------------------ Ergebnisdarstellung
  function ergebnisZeigen() {
    ctx.leeren(ergGr); ctx.leeren(sonden); const R = S.erg; $("simLegende").hidden = true; modell.visible = true;
    if (!S.offen || !R) return;
    const M = S.M, e = R.ergebnisse[Math.min(S.zeige.kombi, R.ergebnisse.length - 1)], art = S.zeige.art, N = M.nodes.length, L = R.Lref;
    let wert, lo = 0, hi, einheit, titel, rev = false, form = null;
    if (art === "spannung") { wert = e.vmN; hi = Math.max(e.smax, 1e-9); einheit = "N/mm²"; titel = "Vergleichsspannung (von Mises)"; }
    else if (art === "verschiebung") { wert = e.disp; hi = Math.max(e.umax, 1e-9); einheit = "mm"; titel = "Verschiebung"; }
    else if (art === "sicherheit") { wert = Float64Array.from(e.vmN, (v) => (v > 1e-9 ? Math.min(3, e.zul / v) : 3)); lo = 0; hi = 3; einheit = "–"; titel = "Sicherheit zul. / vorh."; rev = true; }
    else { form = e.beul?.form; if (!form) { status("Für diese Kombination gibt es keine Beulform – «Beulen» im Nachweis einschalten und neu rechnen."); S.zeige.art = "spannung"; return ergebnisZeigen(); } wert = Float64Array.from({ length: N }, (_, i) => Math.hypot(form[6 * i], form[6 * i + 1], form[6 * i + 2])); hi = Math.max(...wert, 1e-12); einheit = "relativ"; titel = `Beulform (λ = ${z(e.beul.lambda, 2)})`; }
    const mx = form ? Math.max(...wert) || 1 : 0, ue = form ? (0.08 * L) / mx : +S.zeige.ueber > 0 ? +S.zeige.ueber : e.umax > 0 ? Math.min(500, Math.max(1, (0.06 * L) / e.umax)) : 1, U = form || e.u;
    const pos = new Float32Array(M.tris.length * 9), col = new Float32Array(M.tris.length * 9);
    M.tris.forEach((tr, k) => tr.forEach((i, j) => { for (let c = 0; c < 3; c++) pos[k * 9 + j * 3 + c] = M.nodes[i][c] + ue * U[6 * i + c]; const t = (wert[i] - lo) / (hi - lo || 1), rgb = farbe(rev ? 1 - t : t); col.set(rgb, k * 9 + j * 3); }));
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })); m.userData.sim = true; ergGr.add(m);
    const kt = new THREE.LineSegments(new THREE.WireframeGeometry(g), new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.12 })); ergGr.add(kt);
    modell.visible = !!S.zeige.koerper;
    const lg = $("simLegende"), stops = PALETTE.map(([p, c]) => `rgb(${c}) ${p * 100}%`).join(","), n = 5, ticks = Array.from({ length: n }, (_, i) => z(lo + ((hi - lo) * (rev ? n - 1 - i : i)) / (n - 1), art === "verschiebung" ? 2 : 1)).reverse();
    lg.innerHTML = `<b>${esc(titel)}</b> <small>${einheit}${art === "verschiebung" || art === "spannung" ? ` · Überhöhung ×${z(ue, 0)}` : ""}</small><div class="lgrow"><div class="lgbar" style="background:linear-gradient(to top,${stops})"></div><div class="lgtick">${ticks.map((t) => `<span>${t}</span>`).join("")}</div></div>${art === "spannung" ? `<small>zulässig ${z(e.zul, 0)} N/mm²</small>` : ""}`;
    lg.hidden = false;
  }

  // ------------------------------------------------------------------ Rechnen
  const kombisVon = (s) => (s.kombiModus === "norm" ? kombinationen(s.lastfaelle) : s.lastfaelle.map((f) => ({ name: f.name, art: "alle", faktoren: { [f.id]: 1 } })));
  async function rechnen() {
    const s = st();
    try {
      modellSichern(); ergebnisZeigen(); status("Berechnet … (je nach Netz einige Sekunden)"); $("simRechnen") && ($("simRechnen").disabled = true);
      await new Promise((r) => setTimeout(r, 30));
      const t0 = performance.now(), studie = { lager: s.lager.map((l) => ({ ...l, fest: FESTE[l.art] })), lasten: s.lasten, lastfaelle: s.lastfaelle, kombis: kombisVon(s), gammaM: s.gammaM || 1, durchbiegung: s.durchbiegungN ? { n: +s.durchbiegungN } : null, beulen: !!s.beulen, glaetten: !!s.glaetten };
      const mat = matWerte(); S.erg = rechneStudie(S.M, studie, mat); S.erg.dauer = performance.now() - t0; S.erg.matName = mat.name;
      S.zeige.kombi = Math.max(0, S.erg.ergebnisse.indexOf(S.erg.massgebend)); ergebnisZeigen(); zeichne();
      const m = S.erg.massgebend; status(`Fertig (${(S.erg.dauer / 1000).toFixed(1)} s): Höchstlast ${z(m.hoechstlast, 2)}× der angesetzten Last, σmax ${z(m.smax, 0)} N/mm² – Richtwert, kein Nachweis.`);
    } catch (e) { status("⚠ " + e.message); S.erg = null; ergebnisZeigen(); zeichne(); }
    $("simRechnen") && ($("simRechnen").disabled = false);
  }

  // ------------------------------------------------------------------ Eingaben (Lager / Lasten / Normlasten)
  const FORMTITEL = { lager: "Lager", kraft: "Kraft", druck: "Flächenlast", strecke: "Linienlast", schwerkraft: "Eigengewicht", norm: "Normlast", lastfall: "Lastfall" };
  function formStart(typ, vor = {}) {
    if (ctx.vorOeffnen) ctx.vorOeffnen(); oeffnen(true);
    try { modellSichern(); } catch (e) { return status("⚠ " + e.message); }
    const w = { art: typ === "lager" ? "eingespannt" : undefined, auswahl: { lager: "kante", kraft: "punkt", druck: "flaeche", strecke: "kante", schwerkraft: null, norm: "flaeche" }[typ], r: S.M.h, F: 1000, richtung: typ === "druck" ? "-z" : "-z", p: 1, projiziert: false, vorzeichen: 1, dx: 0, dy: 0, dz: 0, lastfall: st().lastfaelle[0].id, norm: "schnee", hoehe: 500, neigung: 10, qp: 0.9, cp: 0.8, q: 1, g: 9.81, lfName: "Lastfall", lfArt: "Q", ...vor };
    if (typ === "druck" && !("modus" in w)) w.modus = "richtung"; S.form = { typ, w, sel: vor.sel || null, nref: vor.nref || null, editId: vor.editId || null };
    zeichne(); zeigeMarken(); status(w.auswahl ? `${FORMTITEL[typ]}: ${w.auswahl === "kante" ? "Kante (nahe der Kante klicken)" : w.auswahl === "ebene" ? "Stirnseite des Profils" : WAHLNAME[w.auswahl]} im Modell anklicken.` : "Werte eintragen und übernehmen.");
  }
  function formWerte() { // Eintrag aus dem Formular bauen
    const { typ, w, sel, nref } = S.form, f = S.form, id = f.editId || neueId(), nr = nref || [0, 0, 1], need = (x) => { if (!x) throw new Error("Zuerst die Stelle im Modell anklicken (Fläche, Kante oder Punkt)."); };
    if (typ === "lager") { need(sel); return { id, art: w.art, sel, weg: w.art === "vorgabe" ? [+w.dx || 0, +w.dy || 0, +w.dz || 0] : null }; }
    if (typ === "kraft") { need(sel); const d = richtungVon(w.richtung, nr), F = d.map((x) => x * (+w.F || 0)); return { id, art: "kraft", sel, F, nref: nr, richtung: w.richtung, lastfall: w.lastfall }; }
    if (typ === "strecke") { need(sel); const d = richtungVon(w.richtung, nr), q = d.map((x) => x * (+w.q || 0)); return { id, art: "strecke", sel, q, nref: nr, richtung: w.richtung, lastfall: w.lastfall }; }
    if (typ === "druck") { need(sel); const nur = w.richtung === "normal" || w.richtung === "weg"; return { id, art: "druck", sel, p: (+w.p || 0) * 1e-3, modus: nur ? "normal" : "richtung", dir: nur ? null : richtungVon(w.richtung, nr), richtung: w.richtung, vorzeichen: w.richtung === "weg" ? -1 : 1, projiziert: !!w.projiziert && !nur, nref: nr, lastfall: w.lastfall }; }
    if (typ === "schwerkraft") return { id, art: "schwerkraft", g: [0, 0, -(+w.g || 9.81) * 1000], lastfall: w.lastfall };
    throw new Error("Unbekannte Eingabe");
  }
  function formOk() {
    const f = S.form, s = st();
    try {
      if (f.typ === "lastfall") { s.lastfaelle.push({ id: "LF" + (s.lastfaelle.length + 1) + Math.random().toString(36).slice(2, 4), name: f.w.lfName || "Lastfall", art: f.w.lfArt }); }
      else if (f.typ === "norm") {
        const k = f.w.norm, lf = { id: "LF" + neueId(), name: k === "schnee" ? "Schnee" : k === "wind" ? "Wind" : k === "person" ? "Person (1 kN)" : "Nutzlast", art: "Q", psi0: BEIWERTE.psi0[k] ?? 0.6 }, e = { id: neueId(), lastfall: lf.id };
        if (!f.sel) throw new Error("Zuerst die Fläche bzw. den Punkt im Modell anklicken.");
        let text;
        if (k === "schnee") { const r = schneelast({ hoehe: +f.w.hoehe, neigung: +f.w.neigung }); Object.assign(e, { art: "druck", sel: f.sel, p: r.q, modus: "richtung", dir: [0, 0, -1], richtung: "-z", projiziert: true, nref: f.nref }); text = "Schnee: " + r.text; }
        else if (k === "wind") { const r = windlast({ qp: +f.w.qp, cp: +f.w.cp }); Object.assign(e, { art: "druck", sel: f.sel, p: r.q, modus: "normal", vorzeichen: r.sog ? -1 : 1, richtung: r.sog ? "weg" : "normal", nref: f.nref }); text = "Wind: " + r.text; }
        else if (k === "person") { const r = personenlast(); Object.assign(e, { art: "kraft", sel: { ...f.sel, art: "punkt", r: r.seite / 2 }, F: [0, 0, -r.F], nref: f.nref, richtung: "-z" }); text = "Person: " + r.text; }
        else { Object.assign(e, { art: "druck", sel: f.sel, p: (+f.w.q || 0) * 1e-3, modus: "richtung", dir: [0, 0, -1], richtung: "-z", nref: f.nref }); text = `Nutzlast: ${f.w.q} kN/m²`; }
        s.lastfaelle.push(lf); s.lasten.push(e); (s.norm ||= []).push(text); s.kombiModus = "norm";
      } else {
        const e = formWerte(), liste = e.art && FESTE[e.art] ? s.lager : s.lasten, i = liste.findIndex((x) => x.id === e.id);
        if (e.art === "schwerkraft" && s.lasten.some((x) => x.art === "schwerkraft" && x.id !== e.id)) throw new Error("Eigengewicht ist schon angesetzt.");
        if (i >= 0) liste[i] = e; else liste.push(e);
      }
    } catch (err) { return status("⚠ " + err.message); }
    S.form = null; S.erg = null; ergebnisZeigen(); zeichne(); zeigeMarken(); ctx.merke?.(); status("Eingetragen.");
  }
  function sonde(e) { // Klick auf das Ergebnis: Werte am nächsten Knoten
    const R = S.erg, m = ergGr.children.find((o) => o.userData.sim); if (!R || !m) return false;
    const h = ctx.treffer(e, [m]); if (!h) return false;
    const k = Math.min(S.zeige.kombi, R.ergebnisse.length - 1), er = R.ergebnisse[k], tri = Math.floor(h.faceIndex), M = S.M, tr = M.tris[tri]; let b = tr[0], bd = Infinity;
    for (const i of tr) { const p = M.nodes[i], d = Math.hypot(p[0] - h.point.x, p[1] - h.point.y, p[2] - h.point.z); if (d < bd && (bd = d, true)) b = i; }
    ctx.leeren(sonden); const pt = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false })); pt.position.copy(h.point); pt.userData.bildschirm = 0.006; pt.renderOrder = 21; sonden.add(pt);
    status(`σ_v ${z(er.vmN[b], 1)} N/mm² (zul. ${z(er.zul, 0)}) · u ${z(er.disp[b], 2)} mm · Sicherheit ${z(er.vmN[b] > 1e-9 ? er.zul / er.vmN[b] : Infinity, 2)} · Blechdicke ${z(M.dicke[tri], 2)} mm`);
    return true;
  }
  function klick(e) {
    if (S.offen && !S.form) return sonde(e);
    if (!S.offen || !S.form || !S.form.w.auswahl) return false;
    const h = ctx.treffer(e); if (!h) { status("Hier ist kein Blech – direkt auf das Blech klicken."); return true; }
    const n = (h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 0, 1)).toArray(), M = modellSichern();
    S.form.sel = { art: S.form.w.auswahl, p: h.point.toArray(), n, ...(S.form.w.auswahl === "punkt" ? { r: Math.max(0.5, +S.form.w.r || M.h) } : {}) }; S.form.nref = n;
    const r = loes(S.form.sel); status(r?.knoten.size ? `${WAHLNAME[S.form.w.auswahl]} gewählt (${r.knoten.size} Knoten). Werte prüfen, dann «Übernehmen».` : "Nichts gefunden – näher an die Kante bzw. auf das Blech klicken.");
    zeichne(); zeigeMarken(); return true;
  }

  // ------------------------------------------------------------------ Fenster
  const sel = (id, opt, wert) => `<select id="${id}">${opt.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(wert) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
  const feld = (lab, inner, hid = "") => `<div class="feld"${hid}><label>${lab}</label>${inner}</div>`;
  const zahl = (id, w) => `<input id="${id}" type="text" class="zahlfeld" inputmode="decimal" autocomplete="off" value="${esc(w)}">`;
  function formHtml() {
    const f = S.form, w = f.w, lf = st().lastfaelle.map((l) => [l.id, l.name]), r = (f.sel && loes(f.sel)) || null;
    const wahl = w.auswahl ? feld("Stelle wählen", sel("sf_auswahl", AUSWAHLEN, w.auswahl)) + `<p class="hinweis">${f.sel ? `✓ ${r?.knoten.size || 0} Knoten gewählt – erneut klicken ändert die Auswahl.` : "Im Modell anklicken – die Auswahl erscheint blau."}</p>` + (w.auswahl === "punkt" ? feld("Radius (mm)", zahl("sf_r", w.r)) : "") : "";
    const lfSel = feld("Lastfall", sel("sf_lastfall", lf, w.lastfall));
    let inner = "";
    if (f.typ === "lager") inner = feld("Art", sel("sf_art", LAGERARTEN, w.art)) + wahl + (w.art === "vorgabe" ? feld("Weg X (mm)", zahl("sf_dx", w.dx)) + feld("Weg Y (mm)", zahl("sf_dy", w.dy)) + feld("Weg Z (mm)", zahl("sf_dz", w.dz)) : "");
    else if (f.typ === "kraft") inner = wahl + feld("Kraft (N)", zahl("sf_F", w.F)) + feld("Richtung", sel("sf_richtung", RICHT, w.richtung)) + lfSel;
    else if (f.typ === "strecke") inner = wahl + feld("Linienlast (N/mm)", zahl("sf_q", w.q)) + feld("Richtung", sel("sf_richtung", RICHT, w.richtung)) + lfSel;
    else if (f.typ === "druck") inner = wahl + feld("Flächenlast (kN/m²)", zahl("sf_p", w.p)) + feld("Richtung", sel("sf_richtung", RICHT, w.richtung)) + feld("Auf Grundriss bezogen", `<input id="sf_proj" type="checkbox" ${w.projiziert ? "checked" : ""}>`, ' title="Schnee: Last je m² Grundfläche"') + lfSel;
    else if (f.typ === "schwerkraft") inner = feld("Erdbeschleunigung (m/s²)", zahl("sf_g", w.g)) + lfSel + `<p class="hinweis">Eigengewicht aus Blechdicke, Fläche und Dichte des Materials, Richtung −Z.</p>`;
    else if (f.typ === "lastfall") inner = feld("Name", `<input id="sf_lfName" type="text" value="${esc(w.lfName)}">`) + feld("Art", sel("sf_lfArt", [["G", "ständig (Eigengewicht, Aufbauten)"], ["Q", "veränderlich (Schnee, Wind, Nutzlast)"]], w.lfArt));
    else if (f.typ === "norm") {
      const k = w.norm, v = k === "schnee" ? schneelast({ hoehe: +w.hoehe, neigung: +w.neigung }).text : k === "wind" ? windlast({ qp: +w.qp, cp: +w.cp }).text : k === "person" ? personenlast().text : "";
      inner = feld("Last", sel("sf_norm", [["schnee", "Schnee (SIA 261, vereinfacht)"], ["wind", "Wind (q_p · c_p)"], ["person", "Person / Montage (1 kN)"], ["nutz", "Nutzlast (frei)"]], k)) + wahl
        + (k === "schnee" ? feld("Höhe ü. M. (m)", zahl("sf_hoehe", w.hoehe)) + feld("Dachneigung (°)", zahl("sf_neigung", w.neigung)) : k === "wind" ? feld("Staudruck q_p (kN/m²)", zahl("sf_qp", w.qp)) + feld("Beiwert c_p (negativ = Sog)", zahl("sf_cp", w.cp)) : k === "nutz" ? feld("Nutzlast (kN/m²)", zahl("sf_q", w.q)) : "")
        + `<p class="hinweis">${esc(v)}<br>Legt einen eigenen Lastfall an und schaltet auf Normkombinationen (γ<sub>G</sub> ${BEIWERTE.gammaG}, γ<sub>Q</sub> ${BEIWERTE.gammaQ}). Normwerte vor dem Einsatz an der gültigen Norm prüfen.</p><p class="hinweis"><b>${esc(QUELLENSTAND.text)}</b>${k === "schnee" ? "<br>" + esc(QUELLENSTAND.schnee) : ""}</p>`;
    }
    return inner;
  }
  function formBinden() {
    const f = S.form, w = f.w, el = (id) => document.getElementById(id), ein = (id, key, zahlig = true) => { const e = el(id); if (!e) return; e.addEventListener("input", () => { w[key] = zahlig ? e.value.replace(",", ".") : e.value; }); e.addEventListener("change", () => { w[key] = e.type === "checkbox" ? e.checked : zahlig ? e.value.replace(",", ".") : e.value; if (["norm", "art", "auswahl"].includes(key)) { if (key === "auswahl") f.sel = null; zeichne(); zeigeMarken(); } }); };
    ein("sf_auswahl", "auswahl", false); ein("sf_r", "r"); ein("sf_art", "art", false); ein("sf_dx", "dx"); ein("sf_dy", "dy"); ein("sf_dz", "dz"); ein("sf_F", "F"); ein("sf_q", "q"); ein("sf_p", "p"); ein("sf_g", "g"); ein("sf_richtung", "richtung", false); ein("sf_lastfall", "lastfall", false);
    ein("sf_lfName", "lfName", false); ein("sf_lfArt", "lfArt", false); ein("sf_norm", "norm", false); ein("sf_hoehe", "hoehe"); ein("sf_neigung", "neigung"); ein("sf_qp", "qp"); ein("sf_cp", "cp"); ein("sf_proj", "projiziert", false);
    el("sf_proj")?.addEventListener("change", (e) => { w.projiziert = e.target.checked; });
    el("sf_r")?.addEventListener("change", () => { if (f.sel) { f.sel = { ...f.sel, r: +w.r || S.M.h }; zeigeMarken(); } });
  }
  function ergebnisHtml() {
    const R = S.erg; if (!R) return `<p class="hinweis">Noch nicht gerechnet. Lager und Lasten setzen, dann «Berechnen».</p>`;
    const m = R.massgebend, ok = m.hoechstlast >= 1, e = R.ergebnisse[Math.min(S.zeige.kombi, R.ergebnisse.length - 1)];
    return `<div class="simergebnis ${ok ? "ok" : "bad"}"><b>${ok ? "Hält" : "Überlastet"}</b> – Höchstlast <b>${z(m.hoechstlast, 2)}×</b> der angesetzten Last<br><small>${esc(m.name)}: σ<sub>max</sub> ${z(m.smax, 0)} N/mm² (zul. ${z(m.zul, 0)}${S.erg.massgebend.smaxKnoten < m.smaxElementWert * 0.97 ? `; Knotenmittel ${z(m.smaxKnoten, 0)}` : ""}), u<sub>max</sub> ${z(m.umax, 2)} mm${m.wGrenze ? ` (Grenze ${z(m.wGrenze, 1)})` : ""}${m.beul?.lambda ? `, Beulen λ ${z(m.beul.lambda, 2)}` : ""}</small></div>`
      + (R.ergebnisse.length > 1 ? `<table class="simtab"><tr><th>Kombination</th><th>σ</th><th>u</th><th>×</th></tr>${R.ergebnisse.map((x, i) => `<tr data-k="${i}" class="${i === S.zeige.kombi ? "jetzt" : ""}"><td>${esc(x.name)}</td><td>${z(x.smax, 0)}</td><td>${z(x.umax, 1)}</td><td class="${x.hoechstlast < 1 ? "bad" : ""}">${z(x.hoechstlast, 2)}</td></tr>`).join("")}</table>` : "")
      + feld("Anzeige", sel("simAnz", ANZEIGEN, S.zeige.art)) + feld("Überhöhung (×)", `<input id="simUeber" type="text" class="zahlfeld" inputmode="decimal" placeholder="auto" value="${esc(S.zeige.ueber)}">`)
      + feld("Blech darunter zeigen", `<input id="simKoerper" type="checkbox" ${S.zeige.koerper ? "checked" : ""}>`) + `<p class="hinweis">Reaktionskraft Σ ${e.summeReaktion.map((x) => z(x, 0)).join(" / ")} N · Netz ${S.M.nodes.length} Knoten, ${S.M.tris.length} Elemente.</p>`;
  }
  function zeichne() {
    const el = $("simInhalt"), fuss = $("simFuss"); if (!el) return; const s = st(), sm = sim();
    if (S.form) {
      el.innerHTML = `<div class="simkopf">${FORMTITEL[S.form.typ]}${S.form.editId ? " ändern" : " hinzufügen"}</div>` + formHtml(); fuss.innerHTML = `<button class="knopf" id="simFAbbr">Abbrechen</button><button class="knopf haupt" id="simFOk">Übernehmen</button>`;
      formBinden(); $("simFAbbr").onclick = () => { S.form = null; zeichne(); zeigeMarken(); status(""); }; $("simFOk").onclick = formOk; return;
    }
    const q = ctx.quellen(null), teilAn = (id) => !s.teile || s.teile.includes(id), lfName = (id) => s.lastfaelle.find((l) => l.id === id)?.name || s.lastfaelle[0].name;
    const liste = (arr, txt, art) => arr.length ? arr.map((x) => `<div class="simzeile" data-art="${art}" data-id="${x.id}"><button class="simname" data-edit title="Bearbeiten">${esc(txt(x))}</button><button class="weg" data-weg title="Entfernen" aria-label="Entfernen">×</button></div>`).join("") : `<p class="hinweis">–</p>`;
    el.innerHTML = `
      ${feld("Studie", sel("simStudie", sm.studien.map((x, i) => [i, x.name]), sm.aktiv))}<div class="simreihe"><button class="knopf klein" id="simNeu">+ Studie</button><button class="knopf klein" id="simUm">Umbenennen</button>${sm.studien.length > 1 ? `<button class="knopf klein" id="simDel">Löschen</button>` : ""}</div>
      <div class="simkopf">Modell</div>${q.map((x) => `<label class="simteil"><input type="checkbox" data-teil="${esc(x.id)}" ${teilAn(x.id) ? "checked" : ""}> ${esc(x.name)} <small>${z(x.t, 2)} mm</small></label>`).join("") || `<p class="hinweis">Kein Blech vorhanden.</p>`}
      ${feld("Elementgrösse (mm)", `<input id="simH" type="text" class="zahlfeld" inputmode="decimal" placeholder="auto" value="${esc(s.h ?? "")}">`)}
      <div class="simkopf">Lager <button class="knopf klein" id="simAddLager">+ Lager</button></div>${liste(s.lager, lagerText, "lager")}
      <div class="simkopf">Lasten <button class="knopf klein" id="simAddKraft">+ Kraft</button><button class="knopf klein" id="simAddDruck">+ Druck</button><button class="knopf klein" id="simAddNorm">+ Norm</button></div>${liste(s.lasten, (l) => `${lastText(l)} · ${lfName(l.lastfall)}`, "last")}
      <div class="simreihe"><button class="knopf klein" id="simAddStrecke">+ Linienlast</button><button class="knopf klein" id="simAddGrav">+ Eigengewicht</button></div>
      <div class="simkopf">Lastfälle <button class="knopf klein" id="simAddLF">+ Lastfall</button></div>${s.lastfaelle.map((l, i) => `<div class="simzeile" data-art="lf" data-i="${i}"><span class="simname">${esc(l.name)} <small>${l.art === "G" ? "ständig" : "veränderlich"}</small></span>${s.lastfaelle.length > 1 ? `<button class="weg" data-weg aria-label="Entfernen">×</button>` : ""}</div>`).join("")}
      ${feld("Kombinationen", sel("simKombi", [["einzeln", "einzeln"], ["norm", "Norm GZT/GZG"]], s.kombiModus))}
      <div class="simkopf">Nachweis</div>
      ${feld("R<sub>p0,2</sub> (N/mm²)", `<input id="simRp" type="text" class="zahlfeld" inputmode="decimal" placeholder="${z(matWerte().rp, 0)}" value="${esc(s.rp ?? "")}">`)}
      ${feld("E-Modul (N/mm²)", `<input id="simE" type="text" class="zahlfeld" inputmode="decimal" placeholder="${z(matWerte().E, 0)}" value="${esc(s.emod ?? "")}">`)}
      ${feld("Teilsicherheit γ<sub>M</sub>", `<input id="simGm" type="text" class="zahlfeld" inputmode="decimal" value="${esc(s.gammaM)}">`)}
      ${feld("Durchbiegung L / …", `<input id="simDn" type="text" class="zahlfeld" inputmode="decimal" placeholder="aus" value="${esc(s.durchbiegungN ?? "")}">`)}
      ${feld("Spannung glätten (Knotenmittel)", `<input id="simGlatt" type="checkbox" ${s.glaetten ? "checked" : ""}>`)}
      ${feld("Beulen mitrechnen", `<input id="simBeulen" type="checkbox" ${s.beulen ? "checked" : ""}>`)}
      <div class="simkopf">Ergebnis</div>${ergebnisHtml()}<p class="hinweis simwarn">${esc(HINWEIS)}</p>`;
    fuss.innerHTML = `<button class="knopf" id="simZu">Schliessen</button><button class="knopf" id="simBericht" ${S.erg ? "" : "disabled"}>Bericht</button><button class="knopf haupt" id="simRechnen">Berechnen</button>`;
    binden();
  }
  function binden() {
    const s = st(), sm = sim(), el = $("simInhalt"), tg = (id, f) => { const e = $(id); if (e) e.onchange = () => f(e); };
    tg("simStudie", (e) => { sm.aktiv = +e.value; S.M = null; S.erg = null; ergebnisZeigen(); zeichne(); zeigeMarken(); });
    $("simNeu") && ($("simNeu").onclick = () => { sm.studien.push(neueStudie(sm.studien.length + 1)); sm.aktiv = sm.studien.length - 1; S.M = null; S.erg = null; ergebnisZeigen(); zeichne(); zeigeMarken(); ctx.merke?.(); });
    $("simUm") && ($("simUm").onclick = () => { const n = prompt("Name der Studie", s.name)?.trim(); if (n) { s.name = n; zeichne(); ctx.merke?.(); } });
    $("simDel") && ($("simDel").onclick = () => { sm.studien.splice(sm.aktiv, 1); sm.aktiv = 0; S.M = null; S.erg = null; ergebnisZeigen(); zeichne(); zeigeMarken(); ctx.merke?.(); });
    el.querySelectorAll("[data-teil]").forEach((c) => (c.onchange = () => { const alle = ctx.quellen(null).map((x) => x.id), an = new Set(s.teile || alle); c.checked ? an.add(c.dataset.teil) : an.delete(c.dataset.teil); s.teile = an.size === alle.length ? null : [...an]; S.M = null; S.erg = null; ergebnisZeigen(); zeigeMarken(); }));
    tg("simH", (e) => { const v = +e.value.replace(",", "."); s.h = v > 0 ? v : null; S.M = null; S.erg = null; ergebnisZeigen(); });
    for (const [id, typ] of [["simAddLager", "lager"], ["simAddKraft", "kraft"], ["simAddDruck", "druck"], ["simAddNorm", "norm"], ["simAddStrecke", "strecke"], ["simAddGrav", "schwerkraft"], ["simAddLF", "lastfall"]]) $(id) && ($(id).onclick = () => formStart(typ));
    el.querySelectorAll(".simzeile").forEach((r) => {
      const art = r.dataset.art, id = r.dataset.id;
      r.querySelector("[data-weg]")?.addEventListener("click", () => { if (art === "lager") s.lager = s.lager.filter((x) => x.id !== id); else if (art === "last") s.lasten = s.lasten.filter((x) => x.id !== id); else { const lf = s.lastfaelle.splice(+r.dataset.i, 1)[0]; s.lasten = s.lasten.filter((x) => x.lastfall !== lf.id); } S.erg = null; ergebnisZeigen(); zeichne(); zeigeMarken(); ctx.merke?.(); });
      r.querySelector("[data-edit]")?.addEventListener("click", () => {
        const x = (art === "lager" ? s.lager : s.lasten).find((y) => y.id === id); if (!x) return;
        const typ = art === "lager" ? "lager" : x.art === "schwerkraft" ? "schwerkraft" : x.art, w = { ...x, auswahl: x.sel?.art, art: art === "lager" ? x.art : undefined, F: x.F ? Math.hypot(...x.F) : 1000, q: x.q ? Math.hypot(...x.q) : 1, p: x.p ? x.p * 1000 : 1, dx: x.weg?.[0] ?? 0, dy: x.weg?.[1] ?? 0, dz: x.weg?.[2] ?? 0, g: x.g ? Math.hypot(...x.g) / 1000 : 9.81, r: x.sel?.r ?? S.M?.h, richtung: x.richtung || "-z" };
        formStart(typ, { ...w, sel: x.sel, nref: x.nref, editId: x.id });
      });
    });
    tg("simKombi", (e) => { s.kombiModus = e.value; S.erg = null; ergebnisZeigen(); zeichne(); });
    tg("simRp", (e) => { s.rp = +e.value.replace(",", ".") > 0 ? +e.value.replace(",", ".") : null; S.erg = null; ergebnisZeigen(); }); tg("simE", (e) => { s.emod = +e.value.replace(",", ".") > 0 ? +e.value.replace(",", ".") : null; S.erg = null; ergebnisZeigen(); });
    tg("simGm", (e) => { s.gammaM = Math.max(1, +e.value.replace(",", ".") || 1); S.erg = null; ergebnisZeigen(); }); tg("simDn", (e) => { s.durchbiegungN = +e.value > 0 ? +e.value : null; S.erg = null; ergebnisZeigen(); });
    tg("simGlatt", (e) => { s.glaetten = e.checked; S.erg = null; ergebnisZeigen(); zeichne(); }); tg("simBeulen", (e) => { s.beulen = e.checked; S.erg = null; ergebnisZeigen(); });
    tg("simAnz", (e) => { S.zeige.art = e.value; ergebnisZeigen(); }); tg("simKoerper", (e) => { S.zeige.koerper = e.checked; ergebnisZeigen(); });
    $("simUeber") && ($("simUeber").onchange = (e) => { S.zeige.ueber = e.target.value.replace(",", "."); ergebnisZeigen(); });
    el.querySelectorAll(".simtab tr[data-k]").forEach((r) => (r.onclick = () => { S.zeige.kombi = +r.dataset.k; ergebnisZeigen(); zeichne(); }));
    $("simRechnen").onclick = rechnen; $("simZu").onclick = () => oeffnen(false); $("simBericht").onclick = bericht;
  }
  function oeffnen(an = true) {
    S.offen = an; $("simFenster").hidden = !an; const mitte = document.querySelector(".mitte"); mitte?.classList.toggle("simOffen", an);
    if (an) { S.zeige.koerper ||= false; try { modellSichern(); } catch (e) { status("⚠ " + e.message); } zeichne(); zeigeMarken(); ergebnisZeigen(); }
    else { S.form = null; ctx.leeren(marken); ctx.leeren(ergGr); ctx.leeren(sonden); $("simLegende").hidden = true; modell.visible = true; }
    for (const b of document.querySelectorAll("[data-sim]")) b.setAttribute("aria-pressed", an && b.dataset.sim === "fenster" ? "true" : "false");
  }
  // Bericht: Bilder von Spannung und Verschiebung, dann Druckseite
  function bericht() {
    const R = S.erg; if (!R) return status("Zuerst rechnen.");
    const alt = { ...S.zeige }, bilder = [];
    for (const [art, titel] of [["spannung", "Vergleichsspannung"], ["verschiebung", "Verschiebung (überhöht)"], ...(R.massgebend.beul?.form ? [["beulform", "Beulform"]] : [])]) { S.zeige.art = art; S.zeige.kombi = R.ergebnisse.indexOf(R.massgebend); ergebnisZeigen(); renderer.render(szene, kamera); try { bilder.push({ titel: `${titel} – ${R.massgebend.name}`, url: renderer.domElement.toDataURL("image/png") }); } catch {} }
    Object.assign(S.zeige, alt); ergebnisZeigen();
    const s = st(), w = matWerte(), d = new Date();
    ctx.drucken(berichtHtml({ projekt: ctx.doc().name || ctx.doc().titel || "", datum: d.toLocaleDateString("de-CH"), teile: S.quellen.map((x) => ({ name: x.name, t: x.t })), werkstoff: w, netz: { knoten: S.M.nodes.length, elemente: S.M.tris.length, h: S.M.h }, studie: s, ergebnisse: R.ergebnisse, massgebend: R.massgebend, bilder, norm: s.norm }));
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.offen && S.form) { S.form = null; zeichne(); zeigeMarken(); e.preventDefault(); } });
  return {
    oeffnen, zeichne, klick, rechnen, formStart, zeige(art) { S.zeige.art = art; if (S.erg) ergebnisZeigen(); zeichne(); }, offen: () => S.offen, formOffen: () => !!S.form,
    nachRegen() { if (!S.M) return; if (geoSig() !== S.sig) { const hatte = !!S.erg; S.M = null; S.erg = null; if (S.offen) { ergebnisZeigen(); try { modellSichern(); } catch {} zeichne(); zeigeMarken(); if (hatte) status("Geometrie geändert – Simulation neu berechnen."); } } },
    test: { st, sim, modell: () => modellSichern(), erg: () => S.erg, analyse: () => S.G, zeige: S.zeige, form: () => S.form, formOk, setzeForm: (k, v) => { S.form.w[k] = v; }, setzeSel: (sel, nref) => { S.form.sel = sel; S.form.nref = nref || sel.n || [0, 0, 1]; zeichne(); zeigeMarken(); }, ergGruppe: ergGr, marken, bericht },
  };
}
