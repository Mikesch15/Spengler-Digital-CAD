// Spengler Digital CAD – Kern: Flansch, Umschlag und Kantenbausteine an den Stirnkanten (Anfang/Ende der Länge) eines Blechprofils.
// Das Profil ist ein Querschnitt, der über die Länge gezogen wird; seine Stirnkanten bestehen aus einem Stück je geradem Schenkel.
// An jedem Schenkel kann am Anfang (S1) und/oder Ende (S2) der Länge eine Lasche (Flansch, Umschlag, Baustein) angekantet werden.
// Die Lasche setzt die Blechebene des Schenkels über die Stirnkante hinaus fort und kantet dort ab (Biegung am Schenkelende, Ausklinkung an den Ecken
// ergibt sich aus der Schenkellänge ohne Biegezone).
import { berechne, kontur } from "./geometrie.js";
import { erweiterungsOps } from "./profile.js";

const hyp = Math.hypot;

// Gerade Schenkel des Profils mit ihrer Lage in der Abwicklung (s0…s1 von Kante A aus) und im Querschnitt (p1 → p2)
export function schenkelBereiche(res) {
  const out = []; let pos = 0, j = 0, vorher = null; // vorher: Biegung unmittelbar vor dem nächsten Schenkel (nur wenn davor ein Schenkel liegt)
  let letzter = null;
  for (const el of res.pfad) {
    if (el.typ === "linie") {
      const l = hyp(el.p2[0] - el.p1[0], el.p2[1] - el.p1[1]), b = { nr: out.length + 1, s0: pos, s1: pos + l, laenge: l, p1: el.p1, p2: el.p2, vor: letzter && vorher ? vorher : null, nach: null };
      if (letzter && vorher) letzter.nach = vorher;
      out.push(b); letzter = b; vorher = null; pos += l;
    } else { const bg = res.biegungen[j++]; pos = bg?.bis ?? pos; vorher = vorher ? null : bg ? { winkel: bg.winkel, rm: el.rm ?? 0, g: (bg.bis - bg.von) || 0 } : null; if (!letzter) vorher = null; }
  }
  return out;
}

// Gehrung: Stossen die Laschen zweier benachbarter Schenkel (gleiche Stirnseite) an einer Biegung zusammen, werden sie in der Winkelhalbierenden
// geschnitten (Ebene parallel zur Länge). Aussen wird verlängert (höchstens halbe Biegezone, damit die Abwicklung nicht überlappt), innen zurückgenommen.
// Rückgabe: Verschiebung der Laschenkante in Schenkelrichtung über den Schenkelpunkt hinaus (+ = länger) bei Abkanthöhe v (links der Schenkelrichtung positiv)
export function gehrungVersatz(b, v) {
  if (!b || !b.winkel) return 0;
  const w = b.winkel * Math.PI / 180, vs = Math.sign(w) * v, k = Math.tan(Math.min(Math.abs(w), 2.6) / 2);
  return Math.min((b.rm - vs) * k, (b.g || 0) / 2);
}
// Abkanthöhe v der Lasche an der abgewickelten Stelle pos (0 = Stirnkante)
export function laschenHoehe(l, pos) {
  let ang = 0, v = 0, p = 0; const bs = [...l.biegungen].sort((a, c) => a.pos - c.pos);
  for (const b of bs) { if (pos <= b.pos) break; v += (b.pos - p) * Math.sin(ang); p = b.pos; ang += b.winkel * Math.PI / 180; }
  return v + (pos - p) * Math.sin(ang);
}
// Kantenpunkte der Lasche im Querschnitt-Sinn: Versatz am Anfang/Ende des Schenkels bei Höhe v
export const laschenStart = (l, v) => -gehrungVersatz(l.gehrungStart, v);
export const laschenEnde = (l, v) => gehrungVersatz(l.gehrungEnde, v);

const verschiebe = (el, dx, dy) => ({ ...el, ...(el.p1 ? { p1: [el.p1[0] + dx, el.p1[1] + dy] } : {}), ...(el.p2 ? { p2: [el.p2[0] + dx, el.p2[1] + dy] } : {}), ...(el.pm ? { pm: [el.pm[0] + dx, el.pm[1] + dy] } : {}), ...(el.zentrum ? { zentrum: [el.zentrum[0] + dx, el.zentrum[1] + dy] } : {}) });

// extras: [{ ende: "S1" | "S2", schenkel: 0 (alle) | Nr., zeilen }] → Laschen: { ende, schenkel, s0, s1, p1, p2, laenge, biegungen: [{ pos, winkel }], ring }
// ring = Querschnitt der Lasche in (u, v): u = Fortsetzung der Blechebene über die Stirnkante, v = Abkantrichtung (positiver Winkel kantet nach v+, links der Schenkelrichtung)
export function stirnLaschen(res, extras, m) {
  const bereiche = schenkelBereiche(res), laschen = [], fehler = [];
  for (const x of extras || []) {
    const z = x.zeilen; if (!z || z.length < 2) continue;
    let r2;
    try { r2 = berechne(0, [{ typ: "schenkel", L: 1000 }, ...erweiterungsOps(z, m)], m.t, m.ri, m.k); } catch (e) { fehler.push(e.message); continue; }
    const erst = r2.pfad[0], ol = hyp(erst.p2[0] - erst.p1[0], erst.p2[1] - erst.p1[1]), [ox, oy] = erst.p2;
    const pfad = r2.pfad.slice(1).map((el) => verschiebe(el, -ox, -oy));
    const ring = kontur(pfad, m.t, 3), laenge = r2.zuschnitt - ol, biegungen = r2.biegungen.map((b) => ({ pos: b.pos - ol, winkel: b.winkel }));
    const wahl = x.schenkel > 0 ? bereiche.filter((b) => b.nr === x.schenkel) : bereiche;
    if (!wahl.length) fehler.push(`Schenkel ${x.schenkel} gibt es nicht (gerade Schenkel: 1–${bereiche.length})`);
    for (const b of wahl) laschen.push({ ende: x.ende, schenkel: b.nr, s0: b.s0, s1: b.s1, p1: b.p1, p2: b.p2, laenge, biegungen, ring, b });
  }
  for (const l of laschen) { // Gehrung nur, wenn der Nachbarschenkel an derselben Stirnseite auch eine Lasche hat
    const hat = (nr) => laschen.some((q) => q.ende === l.ende && q.schenkel === nr);
    l.gehrungStart = l.b.vor && hat(l.schenkel - 1) ? l.b.vor : null; l.gehrungEnde = l.b.nach && hat(l.schenkel + 1) ? l.b.nach : null; delete l.b;
  }
  return { laschen, fehler };
}

// Umriss der Abwicklung mit Laschen: Rechteck W × H, Laschen von S1 unten (y < 0), von S2 oben (y > H); Gehrungen als schräge Seitenkanten
const stuetz = (l) => [0, ...l.biegungen.map((b) => b.pos).filter((p) => p > 0 && p < l.laenge), l.laenge];
export function abwicklungUmriss(W, H, laschen) {
  const u = [[0, 0]], o = [];
  for (const l of laschen.filter((q) => q.ende === "S1").sort((a, b) => a.s0 - b.s0)) {
    const P = stuetz(l).map((p) => [p, laschenHoehe(l, p)]);
    for (const [p, v] of P) u.push([l.s0 + laschenStart(l, v), -p]);
    for (const [p, v] of [...P].reverse()) u.push([l.s1 + laschenEnde(l, v), -p]);
  }
  u.push([W, 0], [W, H]);
  for (const l of laschen.filter((q) => q.ende === "S2").sort((a, b) => b.s0 - a.s0)) {
    const P = stuetz(l).map((p) => [p, laschenHoehe(l, p)]);
    for (const [p, v] of P) o.push([l.s1 + laschenEnde(l, v), H + p]);
    for (const [p, v] of [...P].reverse()) o.push([l.s0 + laschenStart(l, v), H + p]);
  }
  o.push([0, H]);
  const pts = [...u, ...o].filter((p, i, a) => !i || hyp(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-9);
  return pts;
}

// Biegelinien der Laschen in der Abwicklung: [{ a: [x, y], b: [x, y] }]
export function laschenBiegelinien(H, laschen) {
  const l = [];
  for (const q of laschen) {
    const sg = q.ende === "S1" ? -1 : 1, y0 = q.ende === "S1" ? 0 : H;
    l.push({ a: [q.s0, y0], b: [q.s1, y0] });
    for (const b of q.biegungen) { const v = laschenHoehe(q, b.pos); l.push({ a: [q.s0 + laschenStart(q, v), y0 + sg * b.pos], b: [q.s1 + laschenEnde(q, v), y0 + sg * b.pos] }); }
  }
  return l;
}
