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
  const out = []; let pos = 0, j = 0;
  for (const el of res.pfad) {
    if (el.typ === "linie") { const l = hyp(el.p2[0] - el.p1[0], el.p2[1] - el.p1[1]); out.push({ nr: out.length + 1, s0: pos, s1: pos + l, laenge: l, p1: el.p1, p2: el.p2 }); pos += l; }
    else { pos = res.biegungen[j++]?.bis ?? pos; }
  }
  return out;
}

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
    for (const b of wahl) laschen.push({ ende: x.ende, schenkel: b.nr, s0: b.s0, s1: b.s1, p1: b.p1, p2: b.p2, laenge, biegungen, ring });
  }
  return { laschen, fehler };
}

// Umriss der Abwicklung mit Laschen: Rechteck W × H, Laschen von S1 unten (y < 0), von S2 oben (y > H)
export function abwicklungUmriss(W, H, laschen) {
  const u = [[0, 0]], o = [];
  for (const l of laschen.filter((q) => q.ende === "S1").sort((a, b) => a.s0 - b.s0)) u.push([l.s0, 0], [l.s0, -l.laenge], [l.s1, -l.laenge], [l.s1, 0]);
  u.push([W, 0], [W, H]);
  for (const l of laschen.filter((q) => q.ende === "S2").sort((a, b) => b.s0 - a.s0)) o.push([l.s1, H], [l.s1, H + l.laenge], [l.s0, H + l.laenge], [l.s0, H]);
  o.push([0, H]);
  // doppelte Folgepunkte entfernen
  const pts = [...u, ...o].filter((p, i, a) => !i || hyp(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-9);
  return pts;
}

// Biegelinien der Laschen in der Abwicklung: [{ a: [x, y], b: [x, y] }]
export function laschenBiegelinien(H, laschen) {
  const l = [];
  for (const q of laschen) {
    const sg = q.ende === "S1" ? -1 : 1, y0 = q.ende === "S1" ? 0 : H;
    l.push({ a: [q.s0, y0], b: [q.s1, y0] });
    for (const b of q.biegungen) l.push({ a: [q.s0, y0 + sg * b.pos], b: [q.s1, y0 + sg * b.pos] });
  }
  return l;
}
