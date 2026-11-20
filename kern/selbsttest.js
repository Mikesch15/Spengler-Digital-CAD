// Selbsttest: prüft die Rechenkerne mit bekannten Werten (wie der Selbsttest des Fusion-Add-ins). Reine Funktion, keine Oberfläche.
import { berechne } from "./geometrie.js";
import { freiesProfil } from "./profile.js";
import { kFaktorAusProbe } from "./materialien.js";
import { folge } from "./details.js";
import { bausteinProfil } from "./flaechenblech.js";
import { rundblechAbwicklung } from "./abwicklungRund.js";
import { zerlege, alsText } from "./vorlagen/kurzschrift.js";
import { bausteinFolge } from "./vorlagen/parameter.js";
import { scheibeMitRand } from "./umformung.js";

const M = { id: "t", name: "Test 0.7", t: 0.7, ri: 1, k: 0.4 };
export function selbsttest() {
  const r = [], pruefe = (name, f) => { try { const x = f(); r.push({ name, ok: x === true || x?.ok === true, detail: x?.detail || "" }); } catch (e) { r.push({ name, ok: false, detail: e.message }); } };
  // Schenkelmass = bis zur Mittellinie des Blechs (Aussenmass der Probe = Schenkel + t/2).
  // Zwei unabhängige Wege: Zuschnitt aus der Biegerechnung ↔ K-Faktor aus der Probebiegung (Aussenmasse) müssen sich schliessen
  pruefe("Biegung 90°: Zuschnitt ⇄ K-Faktor der Probebiegung", () => {
    const { start, ops } = freiesProfil(0, folge("50 90 50"), M), res = berechne(start, ops, M.t, M.ri, M.k), k = kFaktorAusProbe({ zuschnitt: res.zuschnitt, a: 50 + M.t / 2, b: 50 + M.t / 2, t: M.t, ri: M.ri });
    return { ok: Math.abs(k - M.k) < 1e-9, detail: `Zuschnitt ${res.zuschnitt.toFixed(3)} mm, K-Faktor aus Probe ${k.toFixed(3)} (Ziel ${M.k})` };
  });
  pruefe("Kurzschrift: Hin und zurück", () => alsText(zerlege("90r5 25 U- 7")) === "90r5 25 U- 7");
  pruefe("Parameter: u+4·t mit t = 0.7", () => bausteinFolge({ folge: "90 25 U+ u+4*t", parameter: [{ name: "u", standard: 5 }] }, M) === "90 25 U+ 7.8");
  pruefe("Kantenbaustein: Zugabe Doppelfalz positiv", () => { const p = bausteinProfil({ folge: "90 25 U+ 7", versatz: 0 }, M); return { ok: p.zugabe > 0 && p.biegungen.length === 2, detail: `Zugabe ${p.zugabe.toFixed(2)} mm` }; });
  pruefe("Rundblech: Zylinder-Zuschnitt = π · Ø der K-Faser", () => {
    const a = rundblechAbwicklung({ art: "zylinder", d1: 200, h: 100, t: M.t, k: M.k, winkel: 360, zugabe: 0 }), g = a.masse.zuschnitt[0], f = a.masse.faserDurchmesser;
    return { ok: Math.abs(g - Math.PI * f) < 1e-9 && Math.abs(f - 200) < M.t && a.masse.zuschnitt[1] === 100, detail: `${g.toFixed(3)} mm bei Ø ${f.toFixed(2)}` };
  });
  pruefe("Umformung: Scheibe R100/h20 = −16.7 %", () => Math.abs(scheibeMitRand(100, 20).dehnungRand + 20 / 120) < 1e-12);
  return r;
}
