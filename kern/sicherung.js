// Sicherungen der Einstellungen und Papierkorb für gelöschte Bausteine/Materialien (wie Backup/Papierkorb des Add-ins)
const kopie = (x) => JSON.parse(JSON.stringify(x));
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Neue Sicherung vorn einreihen; unverändert gegenüber der letzten → keine neue; höchstens `max` behalten
export function sichere(liste, einst, grund, zeit = new Date().toISOString(), max = 10) {
  if (liste[0] && gleich(liste[0].einst, einst)) return liste;
  return [{ zeit, grund, einst: kopie(einst) }, ...liste].slice(0, max);
}
// Was beim Übernehmen verschwunden ist (nach id)
export function geloeschte(alt, neu) {
  const ids = (l) => new Set((l || []).map((x) => x.id));
  return { baustein: (alt.bausteine || []).filter((b) => !ids(neu.bausteine).has(b.id)), material: (alt.materialien || []).filter((m) => !ids(neu.materialien).has(m.id)) };
}
export function inPapierkorb(korb, g, zeit = new Date().toISOString(), max = 50) {
  const neu = [...g.baustein.map((d) => ({ art: "baustein", zeit, daten: kopie(d) })), ...g.material.map((d) => ({ art: "material", zeit, daten: kopie(d) }))];
  return [...neu, ...korb].slice(0, max);
}
// Eintrag zurückholen; bei vorhandener id mit neuer id (nichts wird überschrieben)
export function zurueckholen(einst, eintrag) {
  const feld = eintrag.art === "baustein" ? "bausteine" : "materialien", d = kopie(eintrag.daten), liste = [...(einst[feld] || [])];
  if (liste.some((x) => x.id === d.id)) d.id = `${d.id}-${Math.random().toString(36).slice(2, 6)}`;
  return { ...einst, [feld]: [...liste, d] };
}
// Sicherung einspielen: Vorlagen/Bausteine/Materialien der Sicherung; vorher aktueller Stand wird gesichert (rufender Code)
export const einspielen = (eintrag) => kopie(eintrag.einst);
