// Einfacher Flansch und Umschlag wie in Fusion: Winkel, Länge, Radius, Bezug (Mittellinie/Aussen/Innen), Richtung.
// Wird zu einer Abkantfolge («90r2 24.65») und einem Versatz der Kante umgerechnet; das Blech endet danach am Biegebeginn.
// Die gezeichnete Kante ist der gedachte Schnittpunkt der Mittellinien; bei Aussen-/Innenbezug wandert er um (t/2)·tan(α/2).
const zahl = (v) => String(+(+v).toFixed(3));
export function werkzeugAuf(b, m) {
  const w = b?.werkzeug; if (!w) return b;
  const t = +m?.t || 0, r = w.radius > 0 ? w.radius : null, s = w.seite === -1 ? -1 : 1;
  if (w.typ === "umschlag") { // Saumarten wie in Fusion: geschlossen (180°, Radius 0), offen (180° mit Lücke = Radius), Tropfen (180° mit grossem Radius)
    const sa = w.saum || "geschlossen", sg = s > 0 ? "+" : "-", L = zahl(Math.max(0.1, w.laenge));
    if (sa === "offen") return { ...b, folge: `U${sg}r${zahl(r || Math.max(1.5, 2 * t))} ${L}`, versatz: 0 };
    if (sa === "tropfen") return { ...b, folge: `U${sg}r${zahl(r || Math.max(3, 5 * t))} ${L}`, versatz: 0 }; // Tropfensaum: 180° mit grossem Innenradius (Tropfenform)
    return { ...b, folge: `U${sg}${r ? "r" + zahl(r) : ""} ${L}`, versatz: 0 };
  }
  const a = Math.min(Math.max(+w.winkel || 90, 1), 179), k = (t / 2) * Math.tan((a * Math.PI) / 360), korr = w.bezug === "aussen" ? k : w.bezug === "innen" ? -k : 0;
  return { ...b, folge: `${s * a}${r ? "r" + zahl(r) : ""} ${zahl(Math.max(0.1, w.laenge - korr))}`, versatz: +(-korr).toFixed(4) };
}
export const flanschStandard = (typ = "flansch") => ({ typ, winkel: 90, laenge: typ === "umschlag" ? 10 : 25, radius: null, bezug: "mitte", seite: 1 });
export const SAUMARTEN = { geschlossen: "Geschlossener Saum", offen: "Offener Saum", tropfen: "Tropfensaum" };
export const werkzeugName = (w) => w.typ === "umschlag" ? `${SAUMARTEN[w.saum || "geschlossen"].replace("Geschlossener Saum", "Umschlag")} ${w.laenge} mm ${w.seite === -1 ? "hinten" : "Sichtseite"}` : `Flansch ${w.winkel}° ${w.laenge} mm${w.bezug && w.bezug !== "mitte" ? " (" + (w.bezug === "aussen" ? "aussen" : "innen") + ")" : ""}`;

// Abkantfolge eines Bausteins («90 25 U+ 7»: Winkel, Länge, Winkel, Länge …) in die Gegenrichtung (Sichtseite ⇄ Rückseite):
// alle Winkel bekommen das andere Vorzeichen, U+ ⇄ U−; Längen und Radien bleiben.
export function folgeUmkehren(folge) {
  return String(folge).replace(/−/g, "-").trim().split(/\s+/).filter(Boolean).map((t, i) => {
    if (i % 2) return t; // Länge
    const u = /^U([+-]?)(r[\d.]+)?$/i.exec(t); if (u) return `U${u[1] === "-" ? "+" : "-"}${u[2] || ""}`;
    const w = /^([+-]?)(\d+(?:\.\d+)?)(r[\d.]+)?$/i.exec(t); return w ? `${w[1] === "-" ? "" : "-"}${w[2]}${w[3] || ""}` : t;
  }).join(" ");
}
// Neuer Baustein/Flansch an einen bestehenden: dessen Abkantfolge wird hinten fortgesetzt («90 25» + «90 15» = «90 25 90 15»)
export const folgeAnhaengen = (basis, neu) => `${String(basis).trim()} ${String(neu).trim()}`.trim();
