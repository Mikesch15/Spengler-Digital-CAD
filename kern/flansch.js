// Einfacher Flansch und Umschlag wie in Fusion: Winkel, Länge, Radius, Bezug (Mittellinie/Aussen/Innen), Richtung.
// Wird zu einer Abkantfolge («90r2 24.65») und einem Versatz der Kante umgerechnet; das Blech endet danach am Biegebeginn.
// Die gezeichnete Kante ist der gedachte Schnittpunkt der Mittellinien; bei Aussen-/Innenbezug wandert er um (t/2)·tan(α/2).
const zahl = (v) => String(+(+v).toFixed(3));
export function werkzeugAuf(b, m) {
  const w = b?.werkzeug; if (!w) return b;
  const t = +m?.t || 0, r = w.radius > 0 ? w.radius : null, s = w.seite === -1 ? -1 : 1;
  if (w.typ === "umschlag") return { ...b, folge: `U${s > 0 ? "+" : "-"}${r ? "r" + zahl(r) : ""} ${zahl(Math.max(0.1, w.laenge))}`, versatz: 0 };
  const a = Math.min(Math.max(+w.winkel || 90, 1), 179), k = (t / 2) * Math.tan((a * Math.PI) / 360), korr = w.bezug === "aussen" ? k : w.bezug === "innen" ? -k : 0;
  return { ...b, folge: `${s * a}${r ? "r" + zahl(r) : ""} ${zahl(Math.max(0.1, w.laenge - korr))}`, versatz: +(-korr).toFixed(4) };
}
export const flanschStandard = (typ = "flansch") => ({ typ, winkel: 90, laenge: typ === "umschlag" ? 10 : 25, radius: null, bezug: "mitte", seite: 1 });
export const werkzeugName = (w) => w.typ === "umschlag" ? `Umschlag ${w.laenge} mm ${w.seite === -1 ? "hinten" : "Sichtseite"}` : `Flansch ${w.winkel}° ${w.laenge} mm${w.bezug && w.bezug !== "mitte" ? " (" + (w.bezug === "aussen" ? "aussen" : "innen") + ")" : ""}`;
