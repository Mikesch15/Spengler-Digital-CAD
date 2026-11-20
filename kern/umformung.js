// Rundbleche und Werkstattumformung – Port von spengler_cad/forming/forming.py (Fusion-Add-in)
// scheibe: Rand wird gestaucht · kragen: Rand wird gestreckt · kegel: abwickelbar ohne Umformung.
// Getrennt beurteilt: konstruierbar · abwickelbar · herstellbar (nur mit eigenem Erfahrungswert im Material, sonst «nicht beurteilbar»).
// Die Dehnung ist reine Geometrie (Umfangsänderung), KEINE Garantie: Rückfederung, Wanddicke, Falten sind nicht gerechnet.
// Es werden nie Einschnitte erzeugt.
export const VERFAHREN = { stauchen: "Stauchen / Schweifen", strecken: "Strecken / Schweifen", manuell: "Manuelle Werkstattumformung", auto: "Automatische Empfehlung" };
const rad = (g) => (g * Math.PI) / 180;

export function tangentialeDehnung(vorher, nachher) {
  if (!(vorher > 0)) throw new Error("Radius muss grösser als 0 sein");
  return (nachher - vorher) / vorher;
}
export function scheibeMitRand(radius, randhoehe, winkel = 90) {
  if (!(radius > 0 && randhoehe > 0)) throw new Error("Radius und Randhöhe müssen grösser als 0 sein");
  if (!(winkel > 0 && winkel <= 180)) throw new Error("Randwinkel muss zwischen 0° und 180° liegen");
  const rFlach = radius + randhoehe, rEnd = radius + randhoehe * Math.cos(rad(winkel)), eps = tangentialeDehnung(rFlach, Math.max(rEnd, 1e-9));
  return { fall: "scheibe", rohlingRadius: rFlach, rohlingDurchmesser: 2 * rFlach, dehnungRand: eps, art: eps < 0 ? "stauchen" : "strecken", abwickelbar: false, konstruierbar: true, zone: { von: radius, bis: rFlach } };
}
export function kragen(lochRadiusFertig, hoehe, winkel = 90) {
  if (!(hoehe > 0 && lochRadiusFertig > 0)) throw new Error("Radius und Kragenhöhe müssen grösser als 0 sein");
  const rFlach = lochRadiusFertig - hoehe;
  if (rFlach <= 0) return { fall: "kragen", konstruierbar: true, abwickelbar: false, art: "strecken", dehnungRand: null, rohlingLochRadius: 0, fehler: "Kragen höher als der Lochradius: aus der Fläche nicht ohne Einschnitte herstellbar." };
  const rEnd = lochRadiusFertig - hoehe + hoehe * (1 - Math.cos(rad(winkel)));
  return { fall: "kragen", rohlingLochRadius: rFlach, dehnungRand: tangentialeDehnung(rFlach, rEnd), art: "strecken", abwickelbar: false, konstruierbar: true, zone: { von: rFlach, bis: lochRadiusFertig } };
}
export function kegelstumpf(rUnten, rOben, hoehe) {
  if (!(rUnten > 0 && rOben >= 0 && hoehe > 0)) throw new Error("Radien ≥ 0 und Höhe > 0 nötig");
  if (Math.abs(rUnten - rOben) < 1e-9) return { fall: "kegel", zylinder: true, abwickelbar: true, konstruierbar: true, rechteck: [2 * Math.PI * rUnten, hoehe], art: null, dehnungRand: 0 };
  const s = Math.hypot(rUnten - rOben, hoehe), rg = Math.max(rUnten, rOben), rk = Math.min(rUnten, rOben), R2 = (s * rg) / (rg - rk), R1 = R2 - s, w = (360 * rg) / R2;
  return { fall: "kegel", zylinder: false, abwickelbar: true, konstruierbar: true, rInnen: R1, rAussen: R2, oeffnungswinkel: w, mehrteiligNoetig: w > 360, art: null, dehnungRand: 0 };
}
// material.umform = { schrumpfMaxProzent, streckMaxProzent, quelle } (eigener Erfahrungswert der Werkstatt)
export function beurteilen(e, verfahren, material, einschnitteErlaubt = false) {
  const r = { ...e }, h = [], eps = e.dehnungRand, lim = material?.umform || {};
  if (e.fehler) { r.herstellbar = false; h.push(e.fehler); if (einschnitteErlaubt) h.push("Einschnitte sind freigegeben, werden aber nicht automatisch erzeugt – bitte gezielt konstruieren."); }
  else if (e.abwickelbar) {
    r.herstellbar = true; h.push("Abwickelbar ohne Umformung (Kegel/Zylinder): Zuschnitt aus der Abwicklung, Rundung auf der Rundmaschine.");
    if (e.mehrteiligNoetig) h.push("Öffnungswinkel über 360°: der Mantel muss aus mehreren Teilen bestehen.");
  } else {
    const art = e.art;
    if (verfahren === "auto") { verfahren = art; h.push(`Empfehlung aus der Geometrie: ${VERFAHREN[art]} (Rand wird ${art === "stauchen" ? "kürzer" : "länger"}).`); }
    if ((verfahren === "stauchen" || verfahren === "strecken") && verfahren !== art) { r.herstellbar = false; h.push(`Der Rand muss ${art === "stauchen" ? "gestaucht" : "gestreckt"} werden – mit «${VERFAHREN[verfahren]}» nicht herstellbar.`); }
    else {
      const grenze = art === "stauchen" ? lim.schrumpfMaxProzent : lim.streckMaxProzent;
      if (grenze == null || verfahren === "manuell") { r.herstellbar = null; h.push(`Herstellbarkeit nicht beurteilbar: ${verfahren === "manuell" ? "manuelle Werkstattumformung gewählt" : "kein eigener Grenzwert im Material hinterlegt"}`); }
      else { r.herstellbar = Math.abs(eps) * 100 <= grenze; h.push(`Rand ${art === "stauchen" ? "gestaucht" : "gestreckt"} um ${(Math.abs(eps) * 100).toFixed(1)} % (eigener Grenzwert ${(+grenze).toFixed(1)} %, Quelle: ${lim.quelle || "nicht angegeben"}).`); }
    }
    h.push(`Umformzone: Radius ${e.zone.von.toFixed(1)} bis ${e.zone.bis.toFixed(1)} mm.`);
    h.push("Theoretische Rechnung (Umfangsänderung). Keine Garantie: Faltenbildung, Rückfederung und Wanddicke sind nicht berücksichtigt.");
  }
  if (!einschnitteErlaubt) h.push("Einschnitte/Lappen: nicht erlaubt – es werden keine erzeugt.");
  return Object.assign(r, { verfahren, hinweise: h });
}
// Flacher Zuschnitt (mm, Blechmitte, theoretisch): Elemente kreis/bogen/linie; wirft bei nicht einteiligem Zuschnitt
export function zuschnitt(e) {
  if (e.fall === "scheibe") { const R = e.rohlingRadius, r = e.zone.von; return { kontur: [["kreis", 0, 0, R]], biegelinien: [["kreis", 0, 0, r]], grenzen: [-R, -R, R, R], beschreibung: `Scheibe Rohling D ${(2 * R).toFixed(1)} mm, Biegelinie D ${(2 * r).toFixed(1)} mm (theoretisch)` }; }
  if (e.fall === "kragen") {
    if (e.fehler || e.rohlingLochRadius <= 0) throw new Error("Kragen höher als der Lochradius – kein Zuschnitt");
    const r0 = e.rohlingLochRadius, r1 = e.zone.bis; return { kontur: [["kreis", 0, 0, r0]], biegelinien: [["kreis", 0, 0, r1]], grenzen: [-r1, -r1, r1, r1], beschreibung: `Kragen Loch im Rohling D ${(2 * r0).toFixed(1)} mm, Biegelinie D ${(2 * r1).toFixed(1)} mm (theoretisch)` };
  }
  if (e.fall === "kegel") {
    if (e.zylinder) { const [b, h] = e.rechteck; return { kontur: [["linie", 0, 0, b, 0], ["linie", b, 0, b, h], ["linie", b, h, 0, h], ["linie", 0, h, 0, 0]], biegelinien: [], grenzen: [0, 0, b, h], beschreibung: `Zylinder Rechteck ${b.toFixed(1)} x ${h.toFixed(1)} mm (theoretisch)` }; }
    if (e.mehrteiligNoetig) throw new Error("Öffnungswinkel über 360° – der Mantel besteht aus mehreren Teilen, kein einteiliger Zuschnitt");
    const { rInnen: R1, rAussen: R2, oeffnungswinkel: w } = e, a = rad(w);
    const kont = [["bogen", 0, 0, R2, 0, w], ["linie", R2, 0, R1, 0], ["linie", R2 * Math.cos(a), R2 * Math.sin(a), R1 * Math.cos(a), R1 * Math.sin(a)]]; if (R1 > 1e-9) kont.push(["bogen", 0, 0, R1, 0, w]);
    return { kontur: kont, biegelinien: [], grenzen: [w > 180 ? -R2 : Math.min(0, R2 * Math.cos(a)), w > 270 ? -R2 : 0, R2, R2], beschreibung: `Kegelstumpf Kreisringsektor R ${R1.toFixed(1)} / ${R2.toFixed(1)} mm, Winkel ${w.toFixed(1)} Grad (theoretisch)` };
  }
  throw new Error("Unbekannter Fall");
}

// Zuschnitt als DXF (mm, Blechmitte): Layer KONTUR (weiss/schwarz) und BIEGELINIE (blau), Titel als Text; Elemente wie bei zuschnitt()
export function zuschnittDxf(z, titel = "Zuschnitt") {
  const f = (v) => (+v).toFixed(4), out = ["0", "SECTION", "2", "ENTITIES"];
  const el = (e, lage, farbe) => {
    if (e[0] === "kreis") out.push("0", "CIRCLE", "8", lage, "62", farbe, "10", f(e[1]), "20", f(e[2]), "30", "0", "40", f(e[3]));
    else if (e[0] === "bogen") out.push("0", "ARC", "8", lage, "62", farbe, "10", f(e[1]), "20", f(e[2]), "30", "0", "40", f(e[3]), "50", f(e[4]), "51", f(e[5]));
    else out.push("0", "LINE", "8", lage, "62", farbe, "10", f(e[1]), "20", f(e[2]), "30", "0", "11", f(e[3]), "21", f(e[4]), "31", "0");
  };
  z.kontur.forEach((e) => el(e, "KONTUR", "7")); z.biegelinien.forEach((e) => el(e, "BIEGELINIE", "5"));
  const txt = `${titel}  ${z.beschreibung}`.replace(/[^\x20-\x7e]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss", "–": "-", "Ø": "D" })[c] || "?");
  out.push("0", "TEXT", "8", "TEXT", "10", "0", "20", f(z.grenzen[1] - 20), "30", "0", "40", "6.00", "1", txt, "0", "ENDSEC", "0", "EOF");
  return out.join("\n") + "\n";
}
