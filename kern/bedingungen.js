// Spengler Digital CAD – Kern: Abhängigkeiten und Masse einer Skizze als Gleichungen (Residuen = 0)
// Punkte sind [u, v], Radien Zahlen, Winkel im Bogenmass. Jede Funktion liefert ein Array von Residuen.
// Die Namen entsprechen den Fusion-Abhängigkeiten.

const dx = (a, b) => [b[0] - a[0], b[1] - a[1]];
const lang = (d) => Math.hypot(d[0], d[1]);
const kreuz = (a, b) => a[0] * b[1] - a[1] * b[0];
const skal = (a, b) => a[0] * b[0] + a[1] * b[1];
const wickel = (w) => { while (w > Math.PI) w -= 2 * Math.PI; while (w <= -Math.PI) w += 2 * Math.PI; return w; };
// vorzeichenbehafteter Abstand des Punkts p von der Geraden a–b (links positiv)
export const abstandGerade = (p, a, b) => kreuz(dx(a, b), dx(a, p)) / (lang(dx(a, b)) || 1e-12);
export const winkelZwischen = (d1, d2) => Math.atan2(kreuz(d1, d2), skal(d1, d2));

export const GL = {
  // Abhängigkeiten
  koinzident: (p, q) => [p[0] - q[0], p[1] - q[1]],
  horizontal: (p, q) => [p[1] - q[1]],
  vertikal: (p, q) => [p[0] - q[0]],
  aufLinie: (p, a, b) => [abstandGerade(p, a, b)],
  aufKreis: (p, c, r) => [lang(dx(c, p)) - r],
  parallel: (a1, b1, a2, b2) => { const d1 = dx(a1, b1), d2 = dx(a2, b2); return [kreuz(d1, d2) / ((lang(d1) * lang(d2)) || 1e-12)]; },
  senkrecht: (a1, b1, a2, b2) => { const d1 = dx(a1, b1), d2 = dx(a2, b2); return [skal(d1, d2) / ((lang(d1) * lang(d2)) || 1e-12)]; },
  gleichLang: (a1, b1, a2, b2) => [lang(dx(a1, b1)) - lang(dx(a2, b2))],
  gleichRadius: (r1, r2) => [r1 - r2],
  tangentLinie: (a, b, c, r) => [Math.abs(abstandGerade(c, a, b)) - r],
  tangentKreise: (c1, r1, c2, r2, innen) => [lang(dx(c1, c2)) - (innen ? Math.abs(r1 - r2) : r1 + r2)],
  mittelpunkt: (p, a, b) => [p[0] - (a[0] + b[0]) / 2, p[1] - (a[1] + b[1]) / 2],
  konzentrisch: (c1, c2) => [c1[0] - c2[0], c1[1] - c2[1]],
  kollinear: (a1, b1, a2, b2) => [abstandGerade(a2, a1, b1), abstandGerade(b2, a1, b1)],
  symmetrisch: (p, q, a, b) => { const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], d = dx(a, b); return [abstandGerade(m, a, b), skal(dx(p, q), d) / (lang(d) || 1e-12)]; },
  gleicherAbstand: (c, a, b) => [lang(dx(c, b)) - lang(dx(c, a))], // Bogen: Endpunkt b auf dem Kreis durch a
  // Masse (w = Sollwert; s = Vorzeichen bei der Erstellung, damit das Mass nicht «umklappt»)
  abstand: (p, q, w) => [lang(dx(p, q)) - w],
  abstandH: (p, q, w, s) => [s * (q[0] - p[0]) - w],
  abstandV: (p, q, w, s) => [s * (q[1] - p[1]) - w],
  punktLinie: (p, a, b, w, s) => [s * abstandGerade(p, a, b) - w],
  winkel: (a1, b1, a2, b2, w) => [wickel(winkelZwischen(dx(a1, b1), dx(a2, b2)) - w)],
  knick: (v, p, n, w) => [wickel(winkelZwischen(dx(v, p), dx(p, n)) - w)], // Knickwinkel am Eckpunkt p (Abkantwinkel)
  wert: (r, w) => [r - w], // Radius oder (mit Faktor) Durchmesser
};
