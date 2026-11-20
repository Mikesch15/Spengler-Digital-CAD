// Spengler Digital CAD – Kern: 2D-Zeichnen mit Layern (Farbe, Linienart) und DXF-Ausgabe (R12, mm)
// Ein Layer hat Name, Farbe (AutoCAD-Index) und Linienart; Elemente verweisen mit «layer» auf seine id.
export const FARBEN = [ // [AutoCAD-Farbnummer, Name, Bildschirmfarbe]
  [7, "Weiss/Schwarz", 0x20262e], [1, "Rot", 0xe02424], [2, "Gelb", 0xd6a900], [3, "Grün", 0x1f9d3a], [4, "Cyan", 0x00a5b8],
  [5, "Blau", 0x1f5fbf], [6, "Magenta", 0xc2269b], [30, "Orange", 0xe0782b], [8, "Grau", 0x8a929b], [140, "Hellblau", 0x5b8fd6],
];
export const LINIENARTEN = { // name → [DXF-Name, Anzeigename, Muster (mm: Strich +, Lücke −)]
  durchgezogen: ["CONTINUOUS", "Durchgezogen", []], gestrichelt: ["DASHED", "Gestrichelt", [6, -3]], strichpunkt: ["DASHDOT", "Strich-Punkt", [8, -3, 0.5, -3]],
  mittellinie: ["CENTER", "Mittellinie", [16, -3, 3, -3]], verdeckt: ["HIDDEN", "Verdeckt", [3, -2]], gepunktet: ["DOT", "Gepunktet", [0.5, -3]],
};
export const farbeHex = (aci) => (FARBEN.find((f) => f[0] === aci) || FARBEN[0])[2];
export const standardLayer = () => [{ id: "0", name: "0", aci: null, art: "durchgezogen", sichtbar: true }];
const ascii = (s) => String(s).replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/[^\x20-\x7e]/g, "?");
const lname = (s) => ascii(s).replace(/[<>/\\":;?*|=`,]/g, "_").trim().slice(0, 31).toUpperCase() || "0";

// layers: [{ id, name, aci, art, sichtbar }]; objekte: { layer, art: "linie"|"kreis"|"bogen"|"poly", ... } in mm
//   linie { a, b } · kreis { c, r } · bogen { c, r, w0, w1 } (Grad, gegen den Uhrzeiger) · poly { pts, geschlossen }
export function skizzenDxf(layers, objekte, titel = "") {
  const f = (v) => (+v).toFixed(4), out = [];
  const ls = layers.filter((l) => l.sichtbar !== false), namen = new Map(layers.map((l) => [l.id, lname(l.name)]));
  const benutzt = [...new Set(ls.map((l) => l.art || "durchgezogen"))].filter((a) => LINIENARTEN[a]);
  if (!benutzt.includes("durchgezogen")) benutzt.unshift("durchgezogen");
  out.push("0", "SECTION", "2", "TABLES");
  out.push("0", "TABLE", "2", "LTYPE", "70", String(benutzt.length));
  for (const a of benutzt) {
    const [dxf, anzeige, muster] = LINIENARTEN[a], total = muster.reduce((s, v) => s + Math.abs(v), 0);
    out.push("0", "LTYPE", "2", dxf, "70", "64", "3", anzeige, "72", "65", "73", String(muster.length), "40", f(total), ...muster.flatMap((v) => ["49", f(v)]));
  }
  out.push("0", "ENDTAB", "0", "TABLE", "2", "LAYER", "70", String(ls.length));
  for (const l of ls) out.push("0", "LAYER", "2", namen.get(l.id), "70", "0", "62", String(l.aci ?? 7), "6", (LINIENARTEN[l.art] || LINIENARTEN.durchgezogen)[0]);
  out.push("0", "ENDTAB", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES");
  const sicht = new Set(ls.map((l) => l.id));
  for (const o of objekte) {
    if (!sicht.has(o.layer)) continue;
    const lay = namen.get(o.layer);
    if (o.art === "linie") out.push("0", "LINE", "8", lay, "10", f(o.a[0]), "20", f(o.a[1]), "30", "0", "11", f(o.b[0]), "21", f(o.b[1]), "31", "0");
    else if (o.art === "kreis") out.push("0", "CIRCLE", "8", lay, "10", f(o.c[0]), "20", f(o.c[1]), "30", "0", "40", f(o.r));
    else if (o.art === "bogen") out.push("0", "ARC", "8", lay, "10", f(o.c[0]), "20", f(o.c[1]), "30", "0", "40", f(o.r), "50", f(o.w0), "51", f(o.w1));
    else if (o.art === "poly") {
      out.push("0", "POLYLINE", "8", lay, "66", "1", "10", "0", "20", "0", "30", "0", "70", o.geschlossen ? "1" : "0");
      for (const p of o.pts) out.push("0", "VERTEX", "8", lay, "10", f(p[0]), "20", f(p[1]), "30", "0");
      out.push("0", "SEQEND", "8", lay);
    }
  }
  if (titel) out.push("0", "TEXT", "8", lname("TEXT"), "10", "0", "20", "-10", "30", "0", "40", "6.00", "1", ascii(titel));
  out.push("0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}
