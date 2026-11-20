// Umrechnung Freies Profil der CAD ⇄ Schenkelliste der Spengler-Digital-App
// App: schenkel[i] = { laenge, winkel } – winkel = Biegung VOR diesem Schenkel (erster = 0); ±180 = Umschlag
// CAD: zeilen[i] = { L, winkel, art } – winkel = Biegung NACH diesem Schenkel (letzter = 0)
export function zeilenAusSchenkel(schenkel) {
  return schenkel.map((s, i) => { const w = i < schenkel.length - 1 ? Number(schenkel[i + 1].winkel) || 0 : 0; return { L: Number(s.laenge), winkel: w, art: Math.abs(w) === 180 ? "umschlag" : "abkanten" }; });
}
export function schenkelAusZeilen(zeilen) { return zeilen.map((z, i) => ({ laenge: +z.L, winkel: i === 0 ? 0 : +zeilen[i - 1].winkel || 0 })); }
// Teil der CAD → Zeile für cad_teile (Zuschnitt aus der Abwicklung, Schenkel im App-Format)
export function teilFuerApp(f, res, mat, nr) {
  return { nr, label: String(nr), name: f.name, material: mat?.name ?? null, staerke: mat?.t ?? null, breite: res?.zuschnitt != null ? Math.round(res.zuschnitt * 100) / 100 : null, laenge: f.laenge ?? null, stueck: f.stueck ?? 1, vorlage: "Freies Profil",
    appData: { material: "", ansicht: "rechts", konisch: "nein", schenkel: schenkelAusZeilen(f.zeilen || []), segmente: [{ laenge: f.laenge ?? 0, massen: [] }], cad: { material_name: mat?.name ?? "" } } };
}
