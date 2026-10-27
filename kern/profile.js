// Spengler Digital CAD – Kern: Profilvorlagen
// Jede Vorlage liefert { start, ops } aus Parametern p (mm / Grad) und Material m.
// Querschnitt: x nach rechts, y nach oben. Startpunkt = Kante A.

const L = (x) => ({ typ: "schenkel", L: +x });
const B = (w, ri = null) => ({ typ: "biegung", winkel: +w, ri, modus: "sharp" });
const HEM = (vz, m, ri = null) => ({ typ: "biegung", winkel: 180 * vz, ri: ri ?? m.t, modus: "hem" });
const ARC = (w, ri) => ({ typ: "biegung", winkel: +w, ri: +ri, modus: "tangent" });

function traufe(p, m) {
  const n = p.neigung;
  let start = 180 - n;
  const ops = [];
  if (p.umschlag > 0) ops.push(L(p.umschlag), HEM(-1, m));
  else start = -n;
  ops.push(L(p.dach), B(-(90 - n)), L(p.stirn));
  if (p.tropf > 0) ops.push(B(45), L(p.tropf));
  return { start, ops };
}

function ortgang(p, m) {
  let start = 0;
  const ops = [];
  if (p.aufkantung > 0) {
    start = 90;
    if (p.umschlag > 0) ops.push(L(p.umschlag), HEM(-1, m));
    else start = -90;
    ops.push(L(p.aufkantung), B(90));
  }
  ops.push(L(p.dach), B(-90), L(p.stirn));
  if (p.tropf > 0) ops.push(B(45), L(p.tropf));
  return { start, ops };
}

function first(p, m) {
  const n = p.neigung;
  let start = n;
  const ops = [];
  if (p.umschlag > 0) { start = 180 + n; ops.push(L(p.umschlag), HEM(-1, m)); }
  ops.push(L(p.schenkel), B(-2 * n), L(p.schenkel));
  if (p.umschlag > 0) ops.push(HEM(-1, m), L(p.umschlag));
  return { start, ops };
}

function wandanschluss(p, m) {
  let start = 0;
  const ops = [];
  if (p.umschlag > 0) { start = 180; ops.push(L(p.umschlag), HEM(-1, m)); }
  ops.push(L(p.dach), B(180 - p.winkel), L(p.wand));
  if (p.oben > 0) ops.push(B(-90), L(p.oben));
  return { start, ops };
}

function kappleiste(p) {
  let start = -90;
  const ops = [];
  if (p.oben > 0) { start = -45; ops.push(L(p.oben), B(-45)); }
  ops.push(L(p.wand), B(-90), L(p.auskragung), B(90), L(p.schuerze));
  if (p.tropf > 0) ops.push(B(-45), L(p.tropf));
  return { start, ops };
}

function abdeckung(p) {
  const g = p.gefaelle;
  let start = 90;
  const ops = [];
  if (p.tropf > 0) { start = 45; ops.push(L(p.tropf), B(45)); }
  ops.push(L(p.links), B(-(90 + g)), L(p.breite), B(-(90 - g)), L(p.rechts));
  if (p.tropf > 0) ops.push(B(45), L(p.tropf));
  return { start, ops };
}

function haengerinne(p) {
  const ops = [L(p.rueckwand), ARC(180, p.radius)];
  if (p.wulst > 0) ops.push(ARC(-270, p.wulst));
  return { start: -90, ops };
}

function kastenrinne(p, m) {
  let start = -90;
  const ops = [];
  if (p.umschlag > 0) { start = 90; ops.push(L(p.umschlag), HEM(-1, m)); }
  ops.push(L(p.hinten), B(90), L(p.boden), B(90), L(p.vorne));
  if (p.wasserfalz > 0) {
    ops.push(B(-90), L(p.wasserfalz));
    if (p.umschlag > 0) ops.push(HEM(-1, m), L(p.umschlag));
  }
  return { start, ops };
}

function kehle(p, m) {
  const n = p.neigung;
  let start = -n;
  const ops = [];
  if (p.wasserfalz > 0) { start = 180 - n; ops.push(L(p.wasserfalz), HEM(1, m)); }
  ops.push(L(p.schenkel), B(2 * n), L(p.schenkel));
  if (p.wasserfalz > 0) ops.push(HEM(1, m), L(p.wasserfalz));
  return { start, ops };
}

function fensterbank(p) {
  // Kante A oben an der Aufkantung (Wandseite), Fläche mit Gefälle nach aussen, Stirn, Tropfnase nach aussen
  const g = p.gefaelle;
  const ops = [];
  let start = -90;
  if (p.aufkantung > 0) ops.push(L(p.aufkantung), B(90 - g));
  else start = -g;
  ops.push(L(p.tiefe), B(-(90 - g)), L(p.stirn));
  if (p.tropf > 0) ops.push(B(45), L(p.tropf));
  return { start, ops };
}

// [schlüssel, beschriftung, einheit, standard]
export const VORLAGEN = [
  { id: "traufe", name: "Traufblech", gruppe: "Dachrand", bau: traufe, params: [
    ["dach", "Dachschenkel", "mm", 120], ["neigung", "Dachneigung", "°", 25],
    ["stirn", "Stirn", "mm", 50], ["tropf", "Tropfnase", "mm", 15], ["umschlag", "Umschlag", "mm", 10]] },
  { id: "ortgang", name: "Ortgangblech", gruppe: "Dachrand", bau: ortgang, params: [
    ["aufkantung", "Aufkantung Dachseite", "mm", 25], ["dach", "Dachschenkel", "mm", 100],
    ["stirn", "Stirn", "mm", 80], ["tropf", "Tropfnase", "mm", 15], ["umschlag", "Umschlag", "mm", 10]] },
  { id: "first", name: "Firstblech", gruppe: "Dachrand", bau: first, params: [
    ["schenkel", "Schenkel je Seite", "mm", 150], ["neigung", "Dachneigung", "°", 30], ["umschlag", "Umschlag", "mm", 10]] },
  { id: "wand", name: "Wandanschluss", gruppe: "Anschlüsse", bau: wandanschluss, params: [
    ["dach", "Dachschenkel", "mm", 150], ["wand", "Wandschenkel", "mm", 120],
    ["winkel", "Winkel Dach–Wand", "°", 90], ["oben", "Abkantung oben", "mm", 0], ["umschlag", "Umschlag", "mm", 10]] },
  { id: "kappleiste", name: "Kappleiste", gruppe: "Anschlüsse", bau: kappleiste, params: [
    ["wand", "Wandschenkel", "mm", 60], ["auskragung", "Auskragung", "mm", 20],
    ["schuerze", "Schürze", "mm", 30], ["tropf", "Tropfnase", "mm", 10], ["oben", "Dichtstoffkehle", "mm", 10]] },
  { id: "kamin", name: "Kaminanschluss", gruppe: "Anschlüsse", bau: wandanschluss, params: [
    ["dach", "Dachschenkel", "mm", 150], ["wand", "Aufkantung am Kamin", "mm", 150],
    ["winkel", "Winkel Dach–Kamin", "°", 90], ["oben", "Abkantung oben", "mm", 0], ["umschlag", "Umschlag", "mm", 10]] },
  { id: "mauer", name: "Mauerabdeckung", gruppe: "Abdeckungen", bau: abdeckung, params: [
    ["breite", "Breite oben", "mm", 300], ["links", "Schenkel links", "mm", 60],
    ["rechts", "Schenkel rechts", "mm", 60], ["gefaelle", "Gefälle", "°", 3], ["tropf", "Tropfnase", "mm", 15]] },
  { id: "attika", name: "Attikaabdeckung", gruppe: "Abdeckungen", bau: abdeckung, params: [
    ["breite", "Breite oben", "mm", 350], ["links", "Schenkel aussen", "mm", 80],
    ["rechts", "Schenkel innen", "mm", 120], ["gefaelle", "Gefälle nach innen", "°", 5], ["tropf", "Tropfnase", "mm", 15]] },
  { id: "fensterbank", name: "Fensterbank", gruppe: "Abdeckungen", bau: fensterbank, params: [
    ["tiefe", "Tiefe", "mm", 200], ["aufkantung", "Aufkantung hinten", "mm", 30],
    ["gefaelle", "Gefälle", "°", 5], ["stirn", "Stirn", "mm", 40], ["tropf", "Tropfnase", "mm", 10]] },
  { id: "haengerinne", name: "Hängerinne halbrund", gruppe: "Rinnen und Kehlen", bau: haengerinne, params: [
    ["radius", "Rinnenradius innen", "mm", 63], ["rueckwand", "Rückwand über Rundung", "mm", 30], ["wulst", "Wulstradius", "mm", 8]] },
  { id: "kastenrinne", name: "Kastenrinne", gruppe: "Rinnen und Kehlen", bau: kastenrinne, params: [
    ["hinten", "Rückwand", "mm", 120], ["boden", "Boden", "mm", 100], ["vorne", "Vorderwand", "mm", 90],
    ["wasserfalz", "Wasserfalz vorne", "mm", 15], ["umschlag", "Umschlag", "mm", 10]] },
  { id: "kehle", name: "Kehlblech", gruppe: "Rinnen und Kehlen", bau: kehle, params: [
    ["schenkel", "Schenkel je Seite", "mm", 250], ["neigung", "Dachneigung", "°", 30], ["wasserfalz", "Wasserfalz", "mm", 15]] },
];

export const VORLAGE = Object.fromEntries(VORLAGEN.map((v) => [v.id, v]));

export function standardwerte(id) {
  return Object.fromEntries(VORLAGE[id].params.map(([k, , , v]) => [k, v]));
}

// Freies Profil: Liste von Schenkeln mit Winkel nach dem Schenkel
// [{ L, winkel, art: "abkanten" | "umschlag" }], Startwinkel in Grad
export function freiesProfil(startWinkel, zeilen, m) {
  const ops = [];
  zeilen.forEach((z, i) => {
    ops.push(L(z.L));
    if (i < zeilen.length - 1) {
      if (z.art === "umschlag") ops.push(HEM(z.winkel >= 0 ? 1 : -1, m, z.ri > 0 ? z.ri : null)); // ri: Umschlag um weitere Lagen (Falz)
      else ops.push(B(z.winkel, z.ri > 0 ? z.ri : null));
    }
  });
  return { start: startWinkel, ops };
}

// Wandelt eine Vorlage in Zeilen für das freie Profil um (nur Abkant-Profile)
export function alsZeilen(start, ops) {
  const zeilen = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.typ !== "schenkel") continue;
    const nxt = ops[i + 1];
    if (nxt?.modus === "tangent") return null;
    zeilen.push({
      L: op.L,
      winkel: nxt ? nxt.winkel : 0,
      art: nxt?.modus === "hem" ? "umschlag" : "abkanten",
    });
  }
  return { start, zeilen };
}
