// Kernvergleich: führt dieselben Fälle mit beiden Kernen aus, schreibt ergebnisse/messprotokoll.{json,csv}
// Aufruf: node run.mjs [occt|opengeometry]
import { writeFileSync, mkdirSync } from "node:fs";
import { FAELLE, ZINK, BREITE } from "./faelle.mjs";
import { occt } from "./adapter/occt.mjs";
import { opengeometry } from "./adapter/opengeometry.mjs";

const KERNE = { occt, opengeometry };
const nur = process.argv[2];
const zeit = () => performance.now();
const rund = (v, n = 4) => (typeof v === "number" ? +v.toFixed(n) : v);
const relAbw = (ist, soll) => (soll ? Math.abs(ist - soll) / Math.abs(soll) : null);
const zeilen = [];

function eintrag(kern, test, teil, daten) {
  const z = { kern, test, teil, ...daten };
  zeilen.push(z);
  const st = { ok: "✓", abweichung: "≈", fehler: "✗", nicht_unterstuetzt: "–" }[z.status] ?? "?";
  console.log(`${st} [${kern}] ${test} | ${teil} | ${z.ms ?? "-"} ms${z.volumen != null ? " | V " + z.volumen : ""}${z.relAbweichung != null ? " | Δ " + z.relAbweichung : ""}${z.hinweis ? " | " + z.hinweis : ""}`);
}

for (const [id, K] of Object.entries(KERNE)) {
  if (nur && nur !== id) continue;
  const info = K.info();
  let t0 = zeit();
  await K.laden();
  eintrag(id, "0 Laden", info.paket, { status: "ok", ms: rund(zeit() - t0, 1), hinweis: `WASM geladen (Node), Lizenz ${info.lizenz}` });
  const koerper = {};

  for (const f of FAELLE) {
    t0 = zeit();
    let e;
    try { e = f.lauf(K); } catch (err) {
      eintrag(id, f.test, f.teil, { status: err.code === "NICHT_UNTERSTUETZT" ? "nicht_unterstuetzt" : "fehler", ms: rund(zeit() - t0, 1), hinweis: err.message });
      continue;
    }
    const ms = rund(zeit() - t0, 1);
    if (e.wert) { // Schnittkurve
      const d = relAbw(e.wert.laenge, e.erwartetLaenge);
      eintrag(id, f.test, f.teil, { status: d < 1e-6 ? "ok" : "abweichung", ms, hinweis: `${e.wert.kanten} Kante(n), Länge ${rund(e.wert.laenge)} (soll ${rund(e.erwartetLaenge)})`, relAbweichung: rund(d, 9) });
      continue;
    }
    let p = { gueltig: null, geschlossen: null, info: "" };
    try { p = K.pruefen(e.koerper); } catch (err) { p.info = "Prüfung: " + err.message; }
    if (e.flaeche) { eintrag(id, f.test, f.teil, { status: p.gueltig ? "ok" : "fehler", ms, gueltig: p.gueltig, hinweis: p.info }); continue; }
    const V = K.volumen(e.koerper), g = K.grenzen(e.koerper), d = relAbw(V, e.erwartet);
    let bboxOk = true;
    if (e.bbox) bboxOk = [0, 1, 2].every((i) => Math.abs(g.min[i] - e.bbox[0][i]) < 1e-6 && Math.abs(g.max[i] - e.bbox[1][i]) < 1e-6);
    const schranke = K.volumenFehler ? K.volumenFehler(e.koerper) : 0; // OpenGeometry misst Volumen mit Fehlerschranke
    const status = !p.gueltig || !p.geschlossen ? "fehler" : (d > 1e-6 && Math.abs(V - e.erwartet) > schranke * 1.0001) || !bboxOk ? "abweichung" : "ok";
    eintrag(id, f.test, f.teil, {
      status, ms, gueltig: p.gueltig, geschlossen: p.geschlossen, volumen: rund(V), erwartet: rund(e.erwartet), relAbweichung: rund(d, 9),
      bbox: { min: g.min.map((v) => rund(v)), max: g.max.map((v) => rund(v)) }, hinweis: [p.info, schranke ? `Fehlerschranke Kern ±${rund(schranke)} mm³` : "", e.zusatz ? JSON.stringify(Object.fromEntries(Object.entries(e.zusatz).map(([k, v]) => [k, rund(v)]))) : ""].filter(Boolean).join(" · "),
      ...(e.querschnitt ? { abwicklung: { mitteKern: rund(e.querschnitt.mitte), mitteAusVolumen: rund(V / (ZINK.t * BREITE)), zuschnittKern: rund(e.querschnitt.rechnung.zuschnitt), zuschnittAusVolumen: rund(V / (ZINK.t * BREITE) + (ZINK.k - 0.5) * ZINK.t * e.querschnitt.theta) } } : {}),
    });
    koerper[f.teil] = e.koerper;
  }

  // TEST 6 STEP-Austausch (Testkörper: Quader mit Loch)
  const quelle = koerper["Quader − Zylinder (Loch r10 durch)"];
  if (quelle) {
    t0 = zeit();
    let text;
    try {
      text = await K.stepExport(quelle);
      eintrag(id, "6 STEP", "Export Quader mit Loch", { status: /^ISO-10303-21;/.test(text) ? "ok" : "fehler", ms: rund(zeit() - t0, 1), hinweis: `${text.length} Zeichen, ${(text.match(/ADVANCED_FACE|FACE_SURFACE/g) || []).length} Flächen, ${/CYLINDRICAL_SURFACE/.test(text) ? "exakte Zylinderfläche" : "keine Zylinderfläche"}` });
      writeFileSync(new URL(`./ergebnisse/${id}_quader_loch.step`, import.meta.url), text);
    } catch (err) { eintrag(id, "6 STEP", "Export Quader mit Loch", { status: "fehler", hinweis: err.message }); }
    if (text) {
      t0 = zeit();
      try {
        const k2 = await K.stepImport(text), p = K.pruefen(k2), V1 = K.volumen(quelle), V2 = K.volumen(k2), g1 = K.grenzen(quelle), g2 = K.grenzen(k2);
        const dB = Math.max(...[0, 1, 2].flatMap((i) => [Math.abs(g1.min[i] - g2.min[i]), Math.abs(g1.max[i] - g2.max[i])]));
        eintrag(id, "6 STEP", "Re-Import und Vergleich", { status: p.gueltig && relAbw(V2, V1) < 1e-6 && dB < 1e-4 ? "ok" : "abweichung", ms: rund(zeit() - t0, 1), gueltig: p.gueltig, volumen: rund(V2), erwartet: rund(V1), relAbweichung: rund(relAbw(V2, V1), 9), hinweis: `BBox-Abweichung max ${rund(dB, 6)} mm` });
      } catch (err) { eintrag(id, "6 STEP", "Re-Import und Vergleich", { status: err.code === "NICHT_UNTERSTUETZT" ? "nicht_unterstuetzt" : "fehler", hinweis: err.message }); }
    }
  }

  // TEST 7 Three.js-Netz: Lage, Massstab, Normalen, Volumen aus Dreiecken, Flächenzuordnung
  for (const teil of ["Quader − Zylinder (Loch r10 durch)", "Einfach abgekantet (Winkel 40/60, 90°)"]) {
    const k = koerper[teil]; if (!k) continue;
    t0 = zeit();
    try {
      const n = K.netz(k, 0.05), ms = rund(zeit() - t0, 1), P = n.positionen, I = n.indizes;
      let Vn = 0, falsch = 0; const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < P.length; i += 3) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], P[i + a]); max[a] = Math.max(max[a], P[i + a]); }
      for (let i = 0; i < I.length; i += 3) {
        const [a, b, c] = [I[i], I[i + 1], I[i + 2]].map((j) => [P[3 * j], P[3 * j + 1], P[3 * j + 2]]);
        Vn += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
        if (n.normalen) { // Dreiecksnormale vs. Punktnormale
          const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], dn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
          const j = I[i], nn = [n.normalen[3 * j], n.normalen[3 * j + 1], n.normalen[3 * j + 2]];
          if (dn[0] * nn[0] + dn[1] * nn[1] + dn[2] * nn[2] < 0) falsch++;
        }
      }
      const V = K.volumen(k), g = K.grenzen(k), dB = Math.max(...[0, 1, 2].flatMap((i) => [Math.abs(min[i] - g.min[i]), Math.abs(max[i] - g.max[i])]));
      eintrag(id, "7 Three.js", `Netz ${teil}`, { status: falsch === 0 && relAbw(Vn, V) < 0.01 && dB < 0.1 ? "ok" : "abweichung", ms, volumen: rund(Vn), erwartet: rund(V), relAbweichung: rund(relAbw(Vn, V), 6),
        hinweis: `${I.length / 3} Dreiecke, BBox-Abw. ${rund(dB, 4)} mm, Normalen gegen Umlauf: ${falsch}, Flächengruppen: ${n.flaechen.length} (Picking → Fläche ${n.flaechen.length ? "zuordenbar" : "nur über Kern-Picking"})` });
    } catch (err) { eintrag(id, "7 Three.js", `Netz ${teil}`, { status: "fehler", hinweis: err.message }); }
  }
}

// Kreuzprüfung: STEP-Export von OpenGeometry mit OpenCascade einlesen (OpenGeometry kann selbst nicht importieren)
if (!nur) {
  try {
    const { readFileSync } = await import("node:fs");
    const text = readFileSync(new URL("./ergebnisse/opengeometry_quader_loch.step", import.meta.url), "utf8");
    const t0 = zeit(), k = await occt.stepImport(text), p = occt.pruefen(k), V = occt.volumen(k), soll = 100000 - Math.PI * 100 * 20;
    eintrag("opengeometry→occt", "6 STEP", "OpenGeometry-Export in OpenCascade eingelesen", { status: p.gueltig && relAbw(V, soll) < 1e-6 ? "ok" : "abweichung", ms: rund(zeit() - t0, 1), gueltig: p.gueltig, volumen: rund(V), erwartet: rund(soll), relAbweichung: rund(relAbw(V, soll), 9), hinweis: p.info });
  } catch (err) { eintrag("opengeometry→occt", "6 STEP", "OpenGeometry-Export in OpenCascade eingelesen", { status: "fehler", hinweis: err.message }); }
}

mkdirSync(new URL("./ergebnisse/", import.meta.url), { recursive: true });
writeFileSync(new URL("./ergebnisse/messprotokoll.json", import.meta.url), JSON.stringify({ datum: new Date().toISOString(), node: process.version, zeilen }, null, 1));
const sp = ["kern", "test", "teil", "status", "ms", "gueltig", "geschlossen", "volumen", "erwartet", "relAbweichung", "hinweis"];
writeFileSync(new URL("./ergebnisse/messprotokoll.csv", import.meta.url), [sp.join(";"), ...zeilen.map((z) => sp.map((s) => String(z[s] ?? "").replace(/;/g, ",")).join(";"))].join("\n"));
const fehler = zeilen.filter((z) => z.status === "fehler");
console.log(`\n${zeilen.length} Einträge, ${fehler.length} Fehler → ergebnisse/messprotokoll.json/.csv`);
// Automatische Prüfung: bekannte, dokumentierte Grenzen dürfen fehlen; alles andere ist eine Regression
const BEKANNT = [/^opengeometry\|5 Spengler\|Konisches/, /^opengeometry\|5 Spengler\|Gehrung/];
const neu = fehler.filter((z) => !BEKANNT.some((b) => b.test(`${z.kern}|${z.test}|${z.teil}`)));
const abw = zeilen.filter((z) => z.status === "abweichung");
if (neu.length || abw.length) { console.error("Unerwartet:", [...neu, ...abw].map((z) => `${z.kern} ${z.teil}: ${z.hinweis}`)); process.exit(1); }
