// Spengler Digital CAD – Kern: Verbindungsnähte zwischen zwei Blechen (Punktschweissnaht mit Überlappung, Falznaht, Schweissnaht, Ecknaht)
// Überlappung und Falz werden als Kantenbausteine (Abkantfolgen) an den beiden gewählten Kanten abgebildet; Schweiss- und Ecknaht sind nur Darstellung.
// Absetzung (Kröpfung) immer um genau eine Blechstärke, so dass die Bleche danach bündig liegen. Winkel + = zur Sichtseite, − = Rückseite.
const zahl = (v) => String(+(+v).toFixed(3));
export const NAHT_ARTEN = { punkt: "Punktschweissnaht (Überlappung)", falz: "Falznaht", schweiss: "Schweissnaht (Raupe)", ecke: "Ecknaht (Raupe)" };
export const nahtStandard = (art = "punkt") => ({ art, absetz: art === "falz" || art === "punkt" ? "b" : "keine", richtung: "oben", zugabe: 15, falzA: 5, falzB: 10, mittig: false, absetzen: true, raupeBreite: 0, raupeHoehe: 0, seite: "oben" });

// Kröpfung um eine Blechstärke mit 45°-Bögen: Schenkel zwischen den scharfen Kanten = t / sin 45°, Radius so klein, dass beide Tangentenlängen hineinpassen
export function kroepfung(t, ri, vorz) {
  const leg = t / Math.sin(Math.PI / 4), rMax = leg / (2 * Math.tan(Math.PI / 8)) - t / 2, r = Math.max(0.05, Math.min(ri > 0 ? ri : t, rMax * 0.98)), tang = (r + t / 2) * Math.tan(Math.PI / 8);
  return { leg, r, tang, folge: `${vorz * 45}r${zahl(r)} ${zahl(leg)} ${-vorz * 45}r${zahl(r)}`, tangente: tang };
}

// Abkantfolgen der beiden Seiten: { a: folge | null, b: folge | null }; die Folge wird an die Kante des Blechs angehängt (wie ein Kantenbaustein)
export function nahtFolgen(n, m) {
  const t = +m?.t || 0.7, ri = +m?.ri || 1, s = n.richtung === "unten" ? -1 : 1, art = n.art || "punkt";
  if (art === "schweiss" || art === "ecke") return { a: null, b: null };
  const kr = kroepfung(t, ri, s), absA = n.absetz === "a";
  if (art === "punkt") {
    const zug = Math.max(1, +n.zugabe || 15), folge = n.absetzen === false ? `0 ${zahl(zug)}` : `${kr.folge} ${zahl(zug + kr.tang)}`; // ohne Absetzung: gerade Verlängerung (Zugabe)
    return absA ? { a: folge, b: null } : { a: null, b: folge };
  }
  // Falz: ein Blech Falz «falzA» (einfacher Umschlag), das abgesetzte Blech Falz «falzB»; mittig = beide gleich (Summe), keine Absetzung
  const sum = (+n.falzA || 5) + (+n.falzB || 10);
  if (n.mittig) { const h = sum / 2; return { a: `U${s > 0 ? "+" : "-"} ${zahl(h)}`, b: `U${s > 0 ? "-" : "+"} ${zahl(h)}` }; }
  const mid = kr.tang + (ri + t) + 0.3, hemA = `U${s > 0 ? "+" : "-"} ${zahl(+n.falzA || 5)}`, hemB = `${kr.folge} ${zahl(mid)} U${s > 0 ? "-" : "+"} ${zahl(+n.falzB || 10)}`; // kurzes gerades Stück zwischen Kröpfung und Falzbogen
  return absA ? { a: hemB, b: hemA } : { a: hemA, b: hemB };
}

// Raupenmasse: Breite etwa 2 t, Höhe etwa t (mindestens 1.2 / 0.6 mm)
export const raupeMasse = (n, t) => ({ b: +n.raupeBreite > 0 ? +n.raupeBreite : Math.max(1.2, 2 * t), h: +n.raupeHoehe > 0 ? +n.raupeHoehe : Math.max(0.6, t) });

// Raupe entlang einer Polylinie (3D-Punkte), Querschnitt in der Ebene senkrecht zur Linie: n = Richtung «oben» (Normale zur Naht), Linse bzw. Dreieck (Ecknaht)
export function raupenNetz(punkte, nrm, art, b, h) {
  const pos = [], zv = (a, c) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]], kr = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]], nr = (a) => { const l = Math.hypot(...a) || 1; return a.map((x) => x / l); };
  const N = nr(nrm), ringe = punkte.map((p, i) => {
    const T = nr(zv(punkte[Math.min(i + 1, punkte.length - 1)], punkte[Math.max(i - 1, 0)])), Q = nr(kr(T, N)), q = [];
    if (art === "ecke") for (const [u, v] of [[-h, 0], [0, 0], [0, h]]) q.push([p[0] + Q[0] * u + N[0] * v, p[1] + Q[1] * u + N[1] * v, p[2] + Q[2] * u + N[2] * v]);
    else for (let k = 0; k <= 10; k++) { const x = (k / 10 - 0.5) * b, y = h * (1 - (2 * x / b) ** 2); q.push([p[0] + Q[0] * x + N[0] * y, p[1] + Q[1] * x + N[1] * y, p[2] + Q[2] * x + N[2] * y]); }
    return q;
  });
  for (let i = 0; i + 1 < ringe.length; i++) for (let k = 0; k + 1 < ringe[i].length; k++) { const a = ringe[i][k], c = ringe[i][k + 1], d = ringe[i + 1][k + 1], e = ringe[i + 1][k]; pos.push(...a, ...c, ...d, ...a, ...d, ...e); }
  return new Float32Array(pos);
}
