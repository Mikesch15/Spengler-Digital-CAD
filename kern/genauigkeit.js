// Spengler Digital CAD – Genauigkeitsstatus je Feature (reine Rechnung, ohne Oberfläche)
//
// Klassen (von genau nach ungenau): "exact" < "hybrid" < "mesh" < "unsupported" < "failed"
//   exact        exakter B-Rep-Körper aus dem CAD-Kern bzw. reine Rechnung ohne Körpergeometrie (Skizze, Ebene …)
//   hybrid       Körper ist exakt, hängt aber von Netz-Darstellungen ab oder wird durch sie ergänzt (z. B. Flächenblech + Quetschfalte)
//   mesh         Näherung: Dreiecksnetz (Anzeige, Volumen und Export sind nicht exakt)
//   unsupported  vom exakten Kern nicht unterstützt und auch nicht als Netz berechenbar
//   failed       Berechnung fehlgeschlagen (Fehlermeldung am Feature)
// Abgeleitete Features erben die ungenaueste Klasse ihrer Abhängigkeiten (Ziel, Skizze, Pfad, Profile …), mindestens aber ihre eigene.

export const KLASSEN = ["exact", "hybrid", "mesh", "unsupported", "failed"];
const rang = (k) => Math.max(0, KLASSEN.indexOf(k));
export const schlechter = (a, b) => (rang(b) > rang(a) ? b : a);

// Features ohne Körpergeometrie: reine Rechnung (immer exakt im Sinne dieser Klassifizierung)
const OHNE_KOERPER = new Set(["skizze", "ebene", "achse", "konpunkt", "bild", "parameter"]);
// Features, die ausschliesslich als Netz entstehen (nicht im exakten Kern vorhanden)
const NUR_NETZ = {
  kehle: "Kehle/Grat ist noch nicht exakt (Netz)",
  quetschfalte: "Quetschfalte ist nur als Netz modelliert",
  stirnquetsch: "Quetschfalte an der Stirn ist nur als Netz modelliert",
};
// Abhängigkeiten eines Features (IDs anderer Features), soweit sie aus den Feldern ablesbar sind
export function abhaengigkeiten(f) {
  const ids = new Set();
  const nimm = (v) => { if (typeof v === "string" && v) ids.add(v.split(":")[0]); };
  for (const k of ["ziel", "skizze", "profil1", "profil2", "gebaeude", "quelle", "dachQuelle", "pfad", "fuehrung"]) nimm(f[k]);
  if (f.a?.ziel) nimm(f.a.ziel);
  if (f.b?.ziel) nimm(f.b.ziel);
  if (Array.isArray(f.ziele)) f.ziele.forEach(nimm);
  ids.delete(f.id); ids.delete("alle");
  return [...ids];
}

// eingabe: { features, kernAn, exakt: Set<fid> (Körper, deren Netz durch den Kern ersetzt wurde), nicht: Map<fid|fid:i, grund> }
// Ergebnis: Map<featureId, { klasse, grund, von: [featureId…] }>
export function bewerteGenauigkeit({ features, kernAn = false, exakt = new Set(), nicht = new Map() }) {
  const aus = new Map(), nachId = new Map(features.map((f) => [f.id, f]));
  const eigen = (f) => {
    if (f._fehler) return { klasse: "failed", grund: String(f._fehler) };
    if (OHNE_KOERPER.has(f.typ)) return { klasse: "exact", grund: "Rechnung ohne Körpergeometrie" };
    if (NUR_NETZ[f.typ]) return { klasse: "mesh", grund: NUR_NETZ[f.typ] };
    if (!kernAn) return { klasse: "mesh", grund: "Exakter CAD-Kern ist ausgeschaltet (Netz)" };
    const schluessel = [f.id, ...[...exakt, ...nicht.keys()].filter((k) => String(k).startsWith(f.id + ":"))];
    const gruende = schluessel.filter((k) => nicht.has(k)).map((k) => nicht.get(k));
    const exaktDa = schluessel.some((k) => exakt.has(k));
    if (gruende.length && exaktDa) return { klasse: "hybrid", grund: gruende[0] };
    if (gruende.length) return { klasse: "mesh", grund: gruende[0] };
    if (exaktDa) return { klasse: "exact", grund: "exakter Körper aus dem CAD-Kern" };
    // weder exakt noch gemeldet (z. B. Teil ohne Körper, versteckt): als Netz führen, nicht als exakt behaupten
    return { klasse: "mesh", grund: "kein exakter Körper vorhanden" };
  };
  const rechne = (f, besucht = new Set()) => {
    if (aus.has(f.id)) return aus.get(f.id);
    if (besucht.has(f.id)) return { klasse: "failed", grund: "zyklische Abhängigkeit", von: [] };
    besucht.add(f.id);
    let r = { ...eigen(f), von: [] };
    for (const d of abhaengigkeiten(f)) {
      const g = nachId.get(d); if (!g) continue;
      const rd = rechne(g, besucht);
      if (rd.klasse === "exact") continue;
      r.von.push(g.id);
      // exakt, aber auf einer Näherung aufgebaut → hybrid; sonst übernimmt das Feature die ungenauere Klasse
      const neu = r.klasse === "exact" && rd.klasse === "mesh" ? "hybrid" : schlechter(r.klasse, rd.klasse);
      if (neu !== r.klasse) r = { ...r, klasse: neu, grund: `abhängig von «${g.name || g.id}»: ${rd.grund}` };
    }
    besucht.delete(f.id); aus.set(f.id, r); return r;
  };
  for (const f of features) rechne(f);
  // Ergänzungen, die nur als Netz entstehen (Quetschfalte …), machen ihr exaktes Ziel zu «hybrid»
  for (const f of features) {
    if (!NUR_NETZ[f.typ] || !f.ziel || f._aus) continue;
    const z = aus.get(String(f.ziel).split(":")[0]);
    if (z && z.klasse === "exact") { z.klasse = "hybrid"; z.grund = `${f.name || f.typ}: ${NUR_NETZ[f.typ]}`; z.von = [...z.von, f.id]; }
  }
  return aus;
}

// Zusammenfassung des Gesamtmodells für Hinweise und Export: «exakt» nur, wenn kein sichtbares Körper-Feature schlechter als exact ist
export function modellStatus(erg, features) {
  const koerper = features.filter((f) => !OHNE_KOERPER.has(f.typ) && !f.versteckt && !f._aus);
  const klassen = koerper.map((f) => erg.get(f.id)?.klasse || "mesh");
  const gesamt = klassen.reduce((a, k) => schlechter(a, k), "exact");
  const zaehl = Object.fromEntries(KLASSEN.map((k) => [k, klassen.filter((x) => x === k).length]));
  return { gesamt, zaehl, nichtExakt: koerper.filter((f) => erg.get(f.id)?.klasse !== "exact").map((f) => ({ id: f.id, name: f.name, ...erg.get(f.id) })) };
}
