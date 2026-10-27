// Spengler Digital CAD – Kern: Skizze ↔ Gleichungslöser (Abhängigkeiten und treibende Masse wie in Fusion)
// Elemente: linie {pts, geschlossen}, kreis {c, r}, bogen {a, b, m}, langloch {a, b, r}, punkt {p}, jeweils mit id.
// Bezüge in f.bedingungen:
//   Punkt   {e, k}  k = "p3" (Linienpunkt), "c" (Mitte), "a", "b" (Bogen-/Langlochenden), "p" (Punkt)  – oder {e: "O"} Ursprung
//   Strecke {e, s}  s = Kantennummer eines Linienzugs                                         – oder {e: "X"|"Y"} Achsen
//   Kurve   {e}     Kreis, Bogen oder Langloch (Radius, Mitte)
import { loese, freiheitsgrade } from "./loeser.js";
import { GL } from "./bedingungen.js";
import { bogenDaten } from "./skizze.js";

const ABH = ["koinzident", "aufKurve", "horizontal", "vertikal", "parallel", "senkrecht", "gleich", "tangential", "mittelpunkt", "konzentrisch", "kollinear", "symmetrisch", "fix"];
export const IST_MASS = (b) => !ABH.includes(b.typ);

// Element-IDs vergeben (auch für Elemente, die Werkzeuge neu einfügen)
export function sichereIds(f) {
  let max = Math.max(f.ezaehler || 0, ...f.elemente.map((el) => el.id || 0));
  for (const el of f.elemente) if (el.id == null) el.id = ++max;
  f.ezaehler = max;
}
export const neueElementId = (f) => { sichereIds(f); return ++f.ezaehler; };

// Ältere Skizzen: Rechtecke werden zu Linienzügen mit H/V, Punkte an gleicher Stelle bekommen «koinzident»
export function vorbereiten(f) {
  sichereIds(f);
  const neu = !f.bedingungen; f.bedingungen ||= [];
  for (const el of f.elemente) if (el.art === "rechteck") {
    const { a, b } = el;
    Object.assign(el, { art: "linie", pts: [a.slice(), [b[0], a[1]], b.slice(), [a[0], b[1]]], geschlossen: true }); delete el.a; delete el.b;
    f.bedingungen.push(...rechteckBedingungen(el.id));
  }
  if (neu) {
    const pk = punkte(f), gesehen = [];
    for (const p of pk) {
      const q = gesehen.find((g) => g.e !== p.e && Math.abs(g.uv[0] - p.uv[0]) < 1e-6 && Math.abs(g.uv[1] - p.uv[1]) < 1e-6);
      if (q) f.bedingungen.push({ typ: "koinzident", a: q.ref, b: p.ref }); else gesehen.push(p);
    }
  }
}
export const rechteckBedingungen = (e) => [{ typ: "horizontal", l: { e, s: 0 } }, { typ: "vertikal", l: { e, s: 1 } }, { typ: "horizontal", l: { e, s: 2 } }, { typ: "vertikal", l: { e, s: 3 } }];

// Alle Punkte mit Bezug (zum Fangen und Anklicken); Ursprung zuerst
export function punkte(f) {
  const out = [{ ref: { e: "O" }, uv: [0, 0], e: "O" }];
  for (const el of f.elemente) {
    const p = (k, uv) => out.push({ ref: { e: el.id, k }, uv, e: el.id, el });
    if (el.art === "linie" || el.art === "spline") el.pts.forEach((q, i) => p("p" + i, q));
    else if (el.art === "kreis") p("c", el.c);
    else if (el.art === "ellipse") { p("c", el.c); p("a", el.a); }
    else if (el.art === "bogen") { p("a", el.a); p("b", el.b); const d = bogenDaten(el); if (d) p("c", d.c); }
    else if (el.art === "langloch") { p("a", el.a); p("b", el.b); }
    else if (el.art === "punkt") p("p", el.p);
  }
  return out;
}
export const kantenZahl = (el) => (el.art === "linie" ? (el.geschlossen ? el.pts.length : el.pts.length - 1) : 0);

// Variablen und Gleichungen der Skizze
export function modell(f) {
  sichereIds(f);
  const x = [], fest = new Set(), pkt = new Map(), rad = new Map(), elVars = new Map(), bogen = [];
  const neuP = (key, p, el) => { const i = x.length; x.push(p[0], p[1]); pkt.set(key, [i, i + 1]); if (el) elVars.get(el.id).push(i, i + 1); return [i, i + 1]; };
  for (const [k, p] of [["O", [0, 0]], ["X1", [1, 0]], ["Y1", [0, 1]]]) neuP(k, p).forEach((i) => fest.add(i));
  const els = new Map(f.elemente.map((el) => [el.id, el]));
  for (const el of f.elemente) {
    elVars.set(el.id, []);
    const k = (n, p) => neuP(el.id + ":" + n, p, el);
    const r = (w) => { rad.set(el.id, x.length); elVars.get(el.id).push(x.length); x.push(w); };
    if (el.art === "linie" || el.art === "spline") el.pts.forEach((p, i) => k("p" + i, p));
    else if (el.art === "kreis") { k("c", el.c); r(el.r); }
    else if (el.art === "ellipse") { k("c", el.c); k("a", el.a); r(el.r2); }
    else if (el.art === "bogen") { const d = bogenDaten(el); if (d) { k("c", d.c); k("a", el.a); k("b", el.b); bogen.push({ el, sg: Math.sign(d.sweep) || 1 }); } }
    else if (el.art === "langloch") { k("a", el.a); k("b", el.b); r(el.r); }
    else if (el.art === "punkt") k("p", el.p);
  }
  const punkt = (ref) => (ref?.e === "O" ? pkt.get("O") : pkt.get(ref?.e + ":" + ref?.k)) || null;
  const strecke = (ref) => {
    if (ref?.e === "X") return [pkt.get("O"), pkt.get("X1")];
    if (ref?.e === "Y") return [pkt.get("O"), pkt.get("Y1")];
    const el = els.get(ref?.e); if (!el || el.art !== "linie" || !(ref.s >= 0 && ref.s < kantenZahl(el))) return null;
    return [pkt.get(el.id + ":p" + ref.s), pkt.get(el.id + ":p" + ((ref.s + 1) % el.pts.length))];
  };
  const kurve = (ref) => {
    const el = els.get(ref?.e); if (!el) return null;
    if (el.art === "kreis") return { c: { P: pkt.get(el.id + ":c") }, r: { R: rad.get(el.id) } };
    if (el.art === "langloch") return { c: null, r: { R: rad.get(el.id) } };
    if (el.art === "bogen" && pkt.get(el.id + ":c")) return { c: { P: pkt.get(el.id + ":c") }, r: { Rb: [...pkt.get(el.id + ":c"), ...pkt.get(el.id + ":a")] } };
    return null;
  };
  return { x, fest, pkt, rad, els, elVars, bogen, punkt, strecke, kurve };
}

// Gleichung aus GL-Funktion; Argumente {P:[i,j]} Punkt, {R:i} Radiusvariable, {Rb:[ci,cj,ai,aj]} Bogenradius, {K:wert}
function gleichung(name, args) {
  const v = [];
  const teile = args.map((a) => {
    const o = v.length;
    if (a.P) { v.push(...a.P); return (w) => [w[o], w[o + 1]]; }
    if (a.R != null) { v.push(a.R); return (w) => w[o]; }
    if (a.Rb) { v.push(...a.Rb); return (w) => Math.hypot(w[o + 2] - w[o], w[o + 3] - w[o + 1]); }
    return () => a.K;
  });
  return { v, f: (w) => GL[name](...teile.map((t) => t(w))) };
}

// Eine Bedingung → Gleichungen (null, wenn ein Bezug fehlt); fix → feste Variablen
function uebersetze(b, M) {
  const P = (r) => { const p = M.punkt(r); return p && { P: p }; };
  const L = (r) => { const s = M.strecke(r); return s && [{ P: s[0] }, { P: s[1] }]; };
  const K = M.kurve, Z = (w) => ({ K: w });
  const alle = (...a) => (a.flat().every(Boolean) ? a.flat() : null);
  const g = (name, ...a) => { const args = alle(...a); return args ? [gleichung(name, args)] : null; };
  switch (b.typ) {
    case "koinzident": return g("koinzident", P(b.a), P(b.b));
    case "aufKurve": if (b.l) return g("aufLinie", P(b.p), L(b.l)); { const k = K(b.k); return k?.c ? g("aufKreis", P(b.p), k.c, k.r) : null; }
    case "horizontal": case "vertikal": return b.l ? g(b.typ, L(b.l)) : g(b.typ, P(b.a), P(b.b));
    case "parallel": case "senkrecht": case "kollinear": return g(b.typ, L(b.l1), L(b.l2));
    case "gleich": if (b.l1) return g("gleichLang", L(b.l1), L(b.l2)); { const k1 = K(b.k1), k2 = K(b.k2); return k1 && k2 ? g("gleichRadius", k1.r, k2.r) : null; }
    case "tangential": {
      if (b.l) { const k = K(b.k); return k?.c ? g("tangentLinie", L(b.l), k.c, k.r) : null; }
      const k1 = K(b.k1), k2 = K(b.k2); return k1?.c && k2?.c ? g("tangentKreise", k1.c, k1.r, k2.c, k2.r, Z(!!b.innen)) : null;
    }
    case "mittelpunkt": return b.l ? g("mittelpunkt", P(b.p), L(b.l)) : g("mittelpunkt", P(b.p), P(b.a), P(b.b));
    case "konzentrisch": { const k1 = K(b.k1), k2 = K(b.k2); return k1?.c && k2?.c ? g("konzentrisch", k1.c, k2.c) : null; }
    case "symmetrisch": {
      if (b.a) return g("symmetrisch", P(b.a), P(b.b), L(b.l));
      const k1 = K(b.k1), k2 = K(b.k2); if (!k1?.c || !k2?.c) return null;
      const s = g("symmetrisch", k1.c, k2.c, L(b.l)); return s && [...s, ...g("gleichRadius", k1.r, k2.r)];
    }
    case "fix": return [];
    case "abstand": return g("abstand", P(b.a), P(b.b), Z(b.w));
    case "abstandH": case "abstandV": return g(b.typ, P(b.a), P(b.b), Z(b.w), Z(b.s || 1));
    case "punktLinie": return g("punktLinie", P(b.p), L(b.l), Z(b.w), Z(b.s || 1));
    case "winkel": return g("winkel", L(b.l1), L(b.l2), Z(b.w));
    case "knick": return g("knick", P(b.a), P(b.p), P(b.n), Z(b.w));
    case "radius": case "durchmesser": { const k = K(b.k); return k ? g("wert", k.r, Z(b.typ === "radius" ? b.w : b.w / 2)) : null; }
  }
  return null;
}
function festeVariablen(b, M) {
  if (b.typ !== "fix") return [];
  if (b.p) return M.punkt(b.p) || [];
  if (b.l) return (M.strecke(b.l) || []).flat();
  return M.elVars.get(b.e) || [];
}

// Bedingungen mit fehlenden Bezügen entfernen (nach Löschen, Stutzen …); liefert die Anzahl
export function bereinige(f) {
  if (!f.bedingungen) return 0;
  const M = modell(f), vorher = f.bedingungen.length;
  f.bedingungen = f.bedingungen.filter((b) => (b.typ === "fix" ? festeVariablen(b, M).length > 0 : uebersetze(b, M) !== null));
  return vorher - f.bedingungen.length;
}

function system(f, M = modell(f)) {
  const gl = [], fest = new Set(M.fest);
  M.gewicht = M.x.map(() => 1); for (const i of M.rad.values()) M.gewicht[i] = 25; // Grössen bleiben eher, Lagen ändern sich (wie in Fusion)
  for (const { el } of M.bogen) gl.push(gleichung("gleicherAbstand", [{ P: M.pkt.get(el.id + ":c") }, { P: M.pkt.get(el.id + ":a") }, { P: M.pkt.get(el.id + ":b") }]));
  for (const b of f.bedingungen || []) { const e = uebersetze(b, M); if (e) gl.push(...e); festeVariablen(b, M).forEach((i) => fest.add(i)); }
  return { M, gl, fest };
}

// Ergebnis in die Elemente zurückschreiben; koinzidente Punkte exakt gleich setzen (Profile schliessen sich)
function schreibe(f, M, x, fest) {
  for (const b of f.bedingungen || []) if (b.typ === "koinzident") {
    const p = M.punkt(b.a), q = M.punkt(b.b); if (!p || !q) continue;
    const [von, nach] = fest.has(q[0]) ? [q, p] : [p, q]; x[nach[0]] = x[von[0]]; x[nach[1]] = x[von[1]];
  }
  const P = (key) => { const i = M.pkt.get(key); return [x[i[0]], x[i[1]]]; };
  for (const el of f.elemente) {
    const id = el.id;
    if (el.art === "linie" || el.art === "spline") el.pts = el.pts.map((_, i) => P(id + ":p" + i));
    else if (el.art === "ellipse") { el.c = P(id + ":c"); el.a = P(id + ":a"); el.r2 = Math.abs(x[M.rad.get(id)]); }
    else if (el.art === "kreis") { el.c = P(id + ":c"); el.r = Math.abs(x[M.rad.get(id)]); }
    else if (el.art === "langloch") { el.a = P(id + ":a"); el.b = P(id + ":b"); el.r = Math.abs(x[M.rad.get(id)]); }
    else if (el.art === "punkt") el.p = P(id + ":p");
  }
  for (const { el, sg } of M.bogen) {
    const c = P(el.id + ":c"), a = P(el.id + ":a"), b = P(el.id + ":b"), r = Math.hypot(a[0] - c[0], a[1] - c[1]);
    const wa = Math.atan2(a[1] - c[1], a[0] - c[0]), wb = Math.atan2(b[1] - c[1], b[0] - c[0]);
    let sw = ((wb - wa) * sg) % (2 * Math.PI); if (sw <= 1e-9) sw += 2 * Math.PI;
    const wm = wa + (sg * sw) / 2;
    Object.assign(el, { a, b, m: [c[0] + r * Math.cos(wm), c[1] + r * Math.sin(wm)] });
  }
}

// Skizze lösen. ziel: [{ ref: Punktbezug, uv }] beim Ziehen (die gezogenen Punkte folgen der Maus, soweit möglich)
export function loeseSkizze(f, { ziel = [] } = {}) {
  const { M, gl, fest } = system(f);
  let x = M.x.slice();
  if (ziel.length) {
    const zf = new Set(fest), zp = [];
    for (const z of ziel) { // Punkt {ref, uv} oder Radius {r: Element-ID, wert}
      const p = z.ref ? M.punkt(z.ref) : M.rad.has(z.r) ? [M.rad.get(z.r)] : null, w = z.ref ? z.uv : [z.wert];
      if (!p || p.some((i) => fest.has(i))) continue;
      p.forEach((i, k) => { x[i] = w[k]; zf.add(i); }); zp.push([p, w]);
    }
    let r = loese(x, gl, zf, { gewicht: M.gewicht });
    if (!r.ok) { // Ziel nicht ganz erreichbar: weich zur Maus ziehen, dann sauber lösen
      const weich = zp.map(([p, uv]) => ({ v: p, f: (w) => w.map((z, k) => 0.05 * (z - uv[k])) }));
      const w = loese(M.x, [...gl, ...weich], fest, { gewicht: M.gewicht });
      r = loese(w.x, gl, fest, { gewicht: M.gewicht });
    }
    if (!r.ok) return { ok: false };
    x = r.x;
  } else {
    const r = loese(x, gl, fest, { gewicht: M.gewicht });
    if (!r.ok) return { ok: false, rest: r.rest };
    x = r.x;
  }
  schreibe(f, M, x, fest);
  return { ok: true };
}

// Freiheitsgrade und vollständig bestimmte Elemente (Fusion: schwarz statt blau)
export function analyse(f) {
  const { M, gl, fest } = system(f);
  const fg = freiheitsgrade(M.x, gl, fest);
  const bestimmt = new Set();
  for (const [id, vars] of M.elVars) if (vars.length && vars.every((i) => fest.has(i) || fg.bestimmt[i])) bestimmt.add(id);
  const pBestimmt = (ref) => { const p = M.punkt(ref); return !!p && p.every((i) => fest.has(i) || fg.bestimmt[i]); };
  return { dof: fg.dof, rang: fg.rang, bestimmt, pBestimmt };
}

// Neue Bedingung prüfen und übernehmen: lösbar und nicht überzählig (sonst unverändert, Grund zurück)
export function fuegeHinzu(f, b) {
  const sicher = JSON.stringify({ e: f.elemente, b: f.bedingungen || [] });
  const zurueck = (grund) => { // Objekte behalten (Auswahl in der Oberfläche zeigt darauf), nur Inhalt zurücksetzen
    const s = JSON.parse(sicher);
    f.elemente.forEach((el, i) => { for (const k of Object.keys(el)) delete el[k]; Object.assign(el, s.e[i]); });
    f.bedingungen = s.b; return { ok: false, grund };
  };
  f.bedingungen ||= [];
  const vorher = analyse(f);
  if (!uebersetze(b, modell(f))) return { ok: false, grund: "Bezug fehlt" };
  f.bedingungen.push(b);
  const ueberzaehlig = (a) => (b.typ === "fix" ? a.dof >= vorher.dof : a.rang <= vorher.rang);
  if (ueberzaehlig(analyse(f))) return zurueck("ueberzaehlig"); // schon bestimmt, egal welcher Wert
  if (!loeseSkizze(f).ok) return zurueck("widerspruch");
  const nachher = analyse(f);
  if (ueberzaehlig(nachher)) return zurueck("ueberzaehlig");
  return { ok: true, dof: nachher.dof };
}
