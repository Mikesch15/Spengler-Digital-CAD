// Projekte der Spengler-Digital-App (Tabelle projects): Prüfregeln wie in der App (js/09-projekte.js), Suche, Zuordnung zum Modell
export const STATUS = [["offen", "Offen"], ["in_arbeit", "In Arbeit"], ["abgeschlossen", "Abgeschlossen"]];
const norm = (s) => String(s ?? "").trim().toLowerCase();

// Pflichtfelder der App: Projektname, Auftrags-Nr. (je Firma einmalig, ohne Gross-/Kleinschreibung), Adresse (object)
export function pruefeProjekt(p, liste = [], ausserId = null) {
  const f = [];
  if (!String(p.name ?? "").trim()) f.push("Bitte einen Projektnamen eingeben.");
  if (!String(p.order_no ?? "").trim()) f.push("Bitte eine Auftrags-Nr. eingeben.");
  if (!String(p.object ?? "").trim()) f.push("Bitte eine Adresse eingeben.");
  const nr = norm(p.order_no);
  const schon = nr && liste.find((x) => norm(x.order_no) === nr && String(x.id) !== String(ausserId));
  if (schon) f.push(`Die Auftrags-Nr. «${String(p.order_no).trim()}» gibt es schon: ${schon.name}.`);
  return f;
}
export function suche(liste, text) {
  const t = norm(text); if (!t) return liste;
  return liste.filter((p) => [p.name, p.order_no, p.customer, p.object].some((v) => norm(v).includes(t)));
}
// Felder, die aus dem App-Projekt ins Modell übernommen werden (Auftragsnummer, Objekt = Kunde, Adresse)
export const modellFelder = (p) => ({ nr: String(p.order_no || p.name).slice(0, 40), objekt: [p.customer, p.object].filter(Boolean).join(", ") || p.name, appProjekt: { id: p.id, name: p.name } });
// Hat sich das Projekt in der App geändert (gegenüber dem, was das Modell kennt)?
export const geaendert = (modell, p) => { const m = modellFelder(p); return modell.nr !== m.nr || modell.objekt !== m.objekt || modell.appProjekt?.name !== m.appProjekt.name; };
