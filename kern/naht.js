// Spengler Digital CAD – Kern: Verbindungsnähte zwischen zwei Blechen (Punktschweissnaht mit Überlappung, Falznaht, Schweissnaht, Ecknaht)
// Überlappung und Falz werden als Kantenbausteine (Abkantfolgen) an den beiden gewählten Kanten abgebildet; Schweiss- und Ecknaht sind nur Darstellung.
// Absetzung (Kröpfung) immer um genau eine Blechstärke, so dass die Bleche danach bündig liegen. Winkel + = zur Sichtseite, − = Rückseite.
const zahl = (v) => String(+(+v).toFixed(3));
export const NAHT_ARTEN = { punkt: "Punktschweissnaht (Überlappung)", falz: "Falznaht", schweiss: "Schweissnaht (Raupe)", ecke: "Ecknaht (Raupe)" };
export const nahtStandard = (art = "punkt") => ({ art, absetz: art === "falz" || art === "punkt" ? "b" : "keine", richtung: "oben", zugabe: 15, falzA: 5, falzB: 10, mittig: false, absetzen: true, raupeBreite: 0, raupeHoehe: 0, seite: "oben" });

// Kröpfung um die Höhe h (Standard eine Blechstärke) mit 45°-Bögen: Schenkel zwischen den scharfen Kanten = h / sin 45°, Radius so klein, dass beide Tangentenlängen hineinpassen
export function kroepfung(t, ri, vorz, h = t) {
  const leg = h / Math.sin(Math.PI / 4), rMax = leg / (2 * Math.tan(Math.PI / 8)) - t / 2, r = Math.max(0.05, Math.min(ri > 0 ? ri : t, rMax * 0.98)), tang = (r + t / 2) * Math.tan(Math.PI / 8);
  return { leg, r, tang, folge: `${vorz * 45}r${zahl(r)} ${zahl(leg)} ${-vorz * 45}r${zahl(r)}`, tangente: tang, breite: h };
}

// Abkantfolgen der beiden Seiten: { a: { folge, versatz } | null, b: ... }. Die Folge hängt an der Kante des Blechs (wie ein Kantenbaustein), «versatz» setzt die Kante des nicht
// abgesetzten Blechs zurück, so dass sich die Bleche nirgends durchdringen (Bleche liegen nur aufeinander, Falzhaken greifen ineinander).
// Das abgesetzte Blech (n.absetz) wird gekröpft, die Oberflächen sind danach bündig; Richtung + = zur Sichtseite.
export function nahtFolgen(n, m) {
  const t = +m?.t || 0.7, ri = +m?.ri || 1, s = n.richtung === "unten" ? -1 : 1, art = n.art || "punkt", absB = n.absetz !== "a", kopf = (x) => (absB ? { a: x.flach, b: x.abg } : { a: x.abg, b: x.flach });
  if (art === "schweiss" || art === "ecke") return { a: null, b: null };
  if (art === "punkt") {
    const zug = Math.max(1, +n.zugabe || 15), kr = kroepfung(t, ri, s), rueck = t + kr.tang + 0.3; // Kröpfung des einen Blechs reicht um t + Tangente über die Kante: das andere endet davor
    return kopf({ abg: { folge: `${kr.folge} ${zahl(zug + kr.tang)}`, versatz: 0 }, flach: { folge: "0 2", versatz: -(rueck + 2) } });
  }
  // Falz: das abgesetzte Blech (Falz «falzB») wird um 3 t gekröpft, läuft unter dem Haken des anderen Blechs (Falz «falzA») durch und hakt sich mit einem 180°-Bogen um dessen Ende
  const fa = Math.max(2, +n.falzA || 5), fb = Math.max(2, +n.falzB || 10), mittig = !!n.mittig, hA = mittig ? (fa + fb) / 2 : fa, hB = mittig ? hA : fb;
  const rA = t / 2, rmA = rA + t / 2, kr = kroepfung(t, ri, s, 3 * t), rB = t / 2, rmB = rB + t / 2;
  const lauf = Math.max(hB, 2), setzen = lauf - hA + 3 * t + kr.tang + rmB - t / 2 - 0.3; // Rücksetzung des Hakenblechs: Haken endet vor dem Jog des anderen Blechs
  const hemA = `U${s > 0 ? "+" : "-"}r${zahl(rA)} ${zahl(hA)}`;
  const rueckB = Math.max(rmB + t / 2 + 1.5, hA - 0.5), mid = lauf + kr.tang + (rmB + t / 2); // gerader Lauf unter dem Haken, dann Haken um dessen Ende
  const hemB = `${kr.folge} ${zahl(mid)} U${s > 0 ? "-" : "+"}r${zahl(rB)} ${zahl(rueckB)}`;
  return kopf({ abg: { folge: hemB, versatz: 0 }, flach: { folge: hemA, versatz: -setzen } });
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
