// Spengler Digital CAD – Kern: Vorlagen für Dachdeckung und Dachaufbau (Richtwerte, in den Grundeinstellungen änderbar)
// Alle Masse in mm; Neigungen in Grad. Die Werte sind Richtwerte aus gängigen Herstellerangaben – vor dem Einsatz am gewählten Produkt prüfen.
export const DECKUNGEN_STANDARD = [
  { id: "schiebeziegel", name: "Schiebeziegel (Falzziegel)", art: "schiebeziegel", lattweite: 340, deckbreite: 200, ziegelDicke: 25, stueckProM2: 14.7, gewichtProM2: 42, mindestNeigung: 22, lattenB: 40, lattenH: 60, richtwert: true },
  { id: "biber-einfach", name: "Biberschwanz – Einfachdeckung (Spiess)", art: "biber-einfach", lattweite: 300, deckbreite: 180, ziegelDicke: 14, stueckProM2: 18.5, gewichtProM2: 45, mindestNeigung: 40, lattenB: 30, lattenH: 50, richtwert: true },
  { id: "biber-doppel", name: "Biberschwanz – Doppeldeckung", art: "biber-doppel", lattweite: 150, deckbreite: 180, ziegelDicke: 28, stueckProM2: 37, gewichtProM2: 75, mindestNeigung: 30, lattenB: 30, lattenH: 50, richtwert: true },
];
export const AUFBAU_STANDARD = [
  { id: "standard-200", name: "Sparren 8/20, Zwischensparrendämmung 200", sparrenB: 80, sparrenH: 200, achsabstand: 700, daemmung: "zwischen", daemmDicke: 200, unterdach: "schalung", unterdachDicke: 24, konterB: 60, konterH: 40, richtwert: true },
  { id: "aufsparren-120", name: "Sparren 8/16, Aufsparrendämmung 120", sparrenB: 80, sparrenH: 160, achsabstand: 700, daemmung: "aufsparren", daemmDicke: 120, unterdach: "schalung", unterdachDicke: 24, konterB: 60, konterH: 40, richtwert: true },
];
export const grundeinstellung = () => ({ deckungen: DECKUNGEN_STANDARD.map((d) => ({ ...d })), aufbauten: AUFBAU_STANDARD.map((a) => ({ ...a })), standardDeckung: "schiebeziegel", standardAufbau: "standard-200" });
// Schichten senkrecht zur Dachfläche, gemessen ab Oberkante Sparren (nach oben +): Liste von { id, name, von, bis }
export function schichten(aufbau, deckung) {
  const a = aufbau, d = deckung, l = [];
  const sp = { id: "sparren", name: `Sparren ${a.sparrenB}/${a.sparrenH}, e = ${a.achsabstand}`, von: -a.sparrenH, bis: 0 };
  if (a.daemmung === "zwischen") l.push({ id: "daemmung", name: `Zwischensparrendämmung ${a.daemmDicke}`, von: -Math.min(a.daemmDicke, a.sparrenH), bis: 0 });
  l.push(sp);
  let z = 0;
  if (a.daemmung === "aufsparren") { l.push({ id: "daemmung", name: `Aufsparrendämmung ${a.daemmDicke}`, von: z, bis: z + a.daemmDicke }); z += a.daemmDicke; }
  l.push({ id: "unterdach", name: a.unterdach === "schalung" ? `Unterdach (Schalung ${a.unterdachDicke} + Bahn)` : "Unterdach (diffusionsoffene Bahn)", von: z, bis: z + (a.unterdachDicke || 0) }); z += a.unterdachDicke || 0;
  l.push({ id: "konter", name: `Konterlattung ${a.konterB}/${a.konterH} (Hinterlüftung)`, von: z, bis: z + a.konterH }); z += a.konterH;
  l.push({ id: "lattung", name: `Dachlattung ${d.lattenB}/${d.lattenH}, Lattweite ${d.lattweite}`, von: z, bis: z + d.lattenH }); z += d.lattenH;
  l.push({ id: "deckung", name: d.name, von: z, bis: z + (d.ziegelDicke || 0) }); z += d.ziegelDicke || 0;
  return { liste: l.sort((x, y) => x.von - y.von || x.bis - y.bis), unten: -a.sparrenH, oben: z, dicke: z + a.sparrenH };
}
// Prüfungen: Mindestneigung der Deckung (Richtwert) – Meldungen auf Deutsch, leer = in Ordnung
export function pruefeDach({ neigungen, deckung }) {
  const m = [], min = Math.min(...neigungen);
  if (deckung?.mindestNeigung && min < deckung.mindestNeigung) m.push(`Neigung ${min.toFixed(0)}° ist kleiner als die Richtwert-Mindestneigung ${deckung.mindestNeigung}° für «${deckung.name}» – Zusatzmassnahmen (Unterdach, Regensicherheit) prüfen.`);
  return m;
}
// Latten je Dachfläche: Anzahl Latten aus der Länge der Fallinie (Traufe → First) und der Lattweite
export const lattenAnzahl = (fallinie, lattweite, erste = 0) => Math.max(1, Math.floor((fallinie - erste) / lattweite) + 1);
