// Spengler Digital CAD – Kern: Berichtsseite (HTML) für eine Simulationsstudie
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const z = (v, n = 2) => { // Zahl mit höchstens n Nachkommastellen; Nullen werden nur NACH dem Komma entfernt (210000 bleibt 210000)
  if (!Number.isFinite(v)) return "∞"; let t = (+v).toFixed(n); if (t.includes(".")) t = t.replace(/0+$/, "").replace(/\.$/, ""); return t === "-0" || t === "" ? "0" : t; };

export const HINWEIS = "Richtwert, kein statischer Nachweis: Die Berechnung (lineare Schalen-FEM, Mittelfläche des Blechs, vereinfachte Ecken und Biegezonen) ersetzt keinen Tragsicherheitsnachweis nach Norm. Spannungsspitzen an Punktlagern und Einzelkräften sind rechnerische Singularitäten.";

export function lagerText(l) { const a = { eingespannt: "Einspannung (alle 6 Freiheitsgrade)", gelenkig: "Gelenkig (Verschiebungen gesperrt)", gleitX: "Gleitlager, frei in X", gleitY: "Gleitlager, frei in Y", gleitZ: "Gleitlager, frei in Z", nurX: "nur X gesperrt", nurY: "nur Y gesperrt", nurZ: "nur Z gesperrt", vorgabe: "Vorgegebene Verschiebung" }[l.art] || l.art; return `${a} · ${({ flaeche: "Fläche", kante: "Kante", punkt: "Punkt", ebene: "Querschnitt" })[l.sel?.art] || ""}${l.weg?.some((x) => x) ? ` · Weg ${l.weg.map((x) => z(x)).join("/")} mm` : ""}`; }
export function lastText(l) {
  const r = { flaeche: "Fläche", kante: "Kante", punkt: "Punkt", ebene: "Querschnitt" }[l.sel?.art] || "";
  if (l.art === "kraft") return `Kraft ${z(Math.hypot(...l.F))} N (${l.F.map((x) => z(x, 1)).join(" / ")}) auf ${r}`;
  if (l.art === "druck") return `Flächenlast ${z(l.p * 1000)} kN/m² ${l.modus === "richtung" ? `in Richtung ${(l.dir || []).map((x) => z(x, 2)).join("/")}${l.projiziert ? " (auf Grundriss bezogen)" : ""}` : l.vorzeichen === -1 ? "(Sog)" : "(auf die Fläche)"}`;
  if (l.art === "strecke") return `Linienlast ${z(Math.hypot(...l.q))} N/mm auf ${r}`;
  if (l.art === "schwerkraft") return `Eigengewicht, g = ${z(Math.hypot(...(l.g || [0, 0, -9810])) / 1000, 2)} m/s²`;
  return l.art;
}

// d: { titel, projekt, datum, teile:[{name,t}], werkstoff:{name,E,nu,rp}, netz:{knoten,elemente,h}, studie:{lager,lasten,lastfaelle,kombis,gammaM,durchbiegung}, ergebnisse:[...], bilder:[{titel,url}], norm:[text] }
export function berichtHtml(d) {
  const kt = (e) => `<tr><td>${esc(e.name)}</td><td>${esc(e.art || "")}</td><td class="r">${z(e.smax, 1)}</td><td class="r">${z(e.umax, 2)}</td><td class="r ${e.hoechstlast < 1 ? "bad" : "ok"}">${z(e.hoechstlast, 2)}</td><td class="r">${e.beul?.lambda ? z(e.beul.lambda, 2) : "–"}</td></tr>`;
  const m = d.massgebend;
  return `<div class="sim-bericht"><style>
.sim-bericht { font: 12px/1.45 Barlow, Arial, sans-serif; color: #111; max-width: 190mm; margin: 0 auto; } .sim-bericht h1 { font-size: 20px; margin: 0 0 2px; } .sim-bericht h2 { font-size: 14px; margin: 16px 0 4px; border-bottom: 1px solid #999; }
.sim-bericht table { border-collapse: collapse; width: 100%; margin: 4px 0; } .sim-bericht td, .sim-bericht th { border: 1px solid #bbb; padding: 3px 6px; text-align: left; } .sim-bericht th { background: #eee; } .sim-bericht .r { text-align: right; font-variant-numeric: tabular-nums; }
.sim-bericht .bad { color: #b00020; font-weight: 700; } .sim-bericht .ok { color: #11662b; font-weight: 700; } .sim-bericht .warn { border: 2px solid #b00020; padding: 6px 8px; margin: 8px 0; font-weight: 600; } .sim-bericht figure { display: inline-block; width: 48%; margin: 4px 0; vertical-align: top; } .sim-bericht figure img { width: 100%; border: 1px solid #bbb; } .sim-bericht figcaption { font-size: 11px; color: #444; }
</style>
<h1>Simulationsbericht · ${esc(d.studie?.name || "Studie")}</h1><div>${esc(d.projekt || "")} · ${esc(d.datum || "")}</div>
<div class="warn">${esc(HINWEIS)}</div>
<h2>Ergebnis (massgebend)</h2>${m ? `<p>Massgebend: <b>${esc(m.name)}</b>. Höchste Vergleichsspannung <b>${z(m.smax, 1)} N/mm²</b> bei zulässig ${z(m.zul, 1)} N/mm² → Ausnutzung <b>${z(m.smax / m.zul * 100, 0)} %</b>; grösste Verschiebung <b>${z(m.umax, 2)} mm</b>${m.wGrenze ? ` (Grenze ${z(m.wGrenze, 1)} mm)` : ""}. Die angesetzte Last darf rechnerisch bis zum <b>${z(m.hoechstlast, 2)}-fachen</b> gesteigert werden.${m.beul?.lambda ? ` Kritischer Beulfaktor λ<sub>cr</sub> = ${z(m.beul.lambda, 2)}.` : ""}</p>` : "<p>–</p>"}
<table><tr><th>Kombination</th><th>Art</th><th>σ<sub>v,max</sub> N/mm²</th><th>u<sub>max</sub> mm</th><th>Höchstlast ×</th><th>λ<sub>Beulen</sub></th></tr>${(d.ergebnisse || []).map(kt).join("")}</table>
${d.bilder?.length ? `<h2>Darstellung</h2>${d.bilder.map((b) => `<figure><img src="${b.url}" alt=""><figcaption>${esc(b.titel)}</figcaption></figure>`).join("")}` : ""}
<h2>Modell</h2><table><tr><th>Teil</th><th>Blechdicke mm</th></tr>${(d.teile || []).map((t) => `<tr><td>${esc(t.name)}</td><td class="r">${z(t.t)}</td></tr>`).join("")}</table>
<p>Werkstoff ${esc(d.werkstoff?.name || "")}: E = ${z(d.werkstoff?.E, 0)} N/mm², ν = ${z(d.werkstoff?.nu)}, R<sub>p0,2</sub> = ${z(d.werkstoff?.rp, 0)} N/mm², Teilsicherheit γ<sub>M</sub> = ${z(d.studie?.gammaM || 1, 2)}. Netz: ${d.netz?.knoten} Knoten, ${d.netz?.elemente} Dreiecks-Schalenelemente, Elementgrösse ≈ ${z(d.netz?.h, 1)} mm.</p>
<h2>Lager</h2><ul>${(d.studie?.lager || []).map((l) => `<li>${esc(lagerText(l))}</li>`).join("") || "<li>–</li>"}</ul>
<h2>Lasten</h2><ul>${(d.studie?.lasten || []).map((l) => `<li>${esc(lastText(l))} <small>(${esc((d.studie.lastfaelle.find((f) => f.id === l.lastfall) || d.studie.lastfaelle[0])?.name || "")})</small></li>`).join("") || "<li>–</li>"}</ul>
${d.norm?.length ? `<h2>Normlasten</h2><ul>${d.norm.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
<h2>Lastfälle und Kombinationen</h2><table><tr><th>Lastfall</th><th>Art</th></tr>${(d.studie?.lastfaelle || []).map((f) => `<tr><td>${esc(f.name)}</td><td>${f.art === "G" ? "ständig (G)" : "veränderlich (Q)"}</td></tr>`).join("")}</table>
<table><tr><th>Kombination</th><th>Faktoren</th></tr>${(d.ergebnisse || []).map((e) => `<tr><td>${esc(e.name)}</td><td>${Object.entries(e.faktoren || {}).map(([k, v]) => `${esc((d.studie.lastfaelle.find((f) => f.id === k) || {}).name || k)} × ${z(v)}`).join(", ")}</td></tr>`).join("")}</table>
<p><small>${esc(HINWEIS)}</small></p></div>`;
}
