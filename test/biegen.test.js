// Kern-Test Biegesimulation: Profil → Folge, Kollisionen, Maschinendaten, Übernahme aus dem CAD-Profil
import { test } from "node:test"; import assert from "node:assert/strict";
import { bgaProfil, bgaFolgeSuchen, bgaFolgeAnalysieren, bgaSchrittPruefen, bgaTeilLaengePruefen, bgaMitWerkzeug, bgaWerkzeugWaehlen, bgaMaschineFehler, bgaPunkte } from "../kern/biegen/biegekern.js";
import { VORLAGE_SCHROEDER, VORLAGE_JORNS, maschineAusVorlage, werkzeugeAlsText, werkzeugeAusText, maschineFehlt, schenkelAusProfil } from "../kern/biegen/maschinen.js";
import { berechne } from "../kern/geometrie.js";
const B = (w, ri = null) => ({ typ: "biegung", winkel: +w, ri, modus: "sharp" }), HEM = (vz, m, ri = null) => ({ typ: "biegung", winkel: 180 * vz, ri: ri ?? m.t, modus: "hem" });

const M = maschineAusVorlage(VORLAGE_SCHROEDER), t = 0.7;
test("Schröder-Vorlage: Daten vom Typenschild", () => { assert.equal(M.laenge_mm, 3200); assert.equal(M.max_blech_mm, 3); assert.equal(M.geprueft, false); assert.deepEqual(maschineFehlt(M), []); });
test("Jorns-Vorlage: Werkzeuge fehlen und werden gemeldet", () => { const j = maschineAusVorlage(VORLAGE_JORNS); assert.equal(j.laenge_mm, 6000); assert.deepEqual(maschineFehlt(j), ["Unterwange fehlt", "Oberwange fehlt", "Biegewange fehlt"]); assert.ok(bgaMaschineFehler(j).length >= 3); });
test("Werkzeuge als Text und zurück", () => {
  const r = werkzeugeAusText(werkzeugeAlsText(M)); assert.ok(r.werte); assert.deepEqual(r.werte.unterwange, M.unterwange); assert.equal(r.werte.oberwange_werkzeuge.length, 2);
  assert.match(werkzeugeAusText("{").fehler, /JSON/); assert.match(werkzeugeAusText('{"unterwange":[[[0,0],[1,1]]]}').fehler, /mindestens 3/);
});
test("Einfaches Winkelprofil (zwei Schenkel, 90°) ist auf der Schröder machbar", () => {
  const p = bgaProfil([{ laenge: 50, winkel: 0 }, { laenge: 30, winkel: 90 }]), r = bgaFolgeSuchen(p, bgaMitWerkzeug(M, 0), t);
  assert.ok(r.ok, "machbar"); assert.equal(r.schritte.length, 1);
});
test("Zu kurzer geklemmter Schenkel wird erkannt (Mindest-Klemmbreite)", () => {
  const p = bgaProfil([{ laenge: 4, winkel: 0 }, { laenge: 30, winkel: 90 }]);
  const alle = [0, 1, 2, 3].map((ci) => bgaSchrittPruefen(p, new Set(), 1, [{ klemm: "links", flip: false }, { klemm: "rechts", flip: false }, { klemm: "links", flip: true }, { klemm: "rechts", flip: true }][ci], bgaMitWerkzeug(M, 0), t));
  assert.ok(alle.some((r) => r.probleme.some((x) => x.art === "klemmung")), "Klemmbreite");
});
test("Winkel über dem Maximum der Maschine wird gemeldet", () => {
  const m = { ...M, max_winkel_auf: 60 }; const p = bgaProfil([{ laenge: 50, winkel: 0 }, { laenge: 30, winkel: 90 }]);
  const KF = [{ klemm: "links", flip: false }, { klemm: "rechts", flip: false }, { klemm: "links", flip: true }, { klemm: "rechts", flip: true }];
  assert.ok(KF.some((c) => bgaSchrittPruefen(p, new Set(), 1, c, bgaMitWerkzeug(m, 0), t).probleme.some((x) => x.art === "winkel")), "Winkelgrenze");
});
test("Tiefes U-Profil: Folge wird gefunden oder die beste Folge mit Problemen geliefert", () => {
  const p = bgaProfil([{ laenge: 100, winkel: 0 }, { laenge: 40, winkel: 90 }, { laenge: 100, winkel: 90 }, { laenge: 40, winkel: 90 }]);
  const w = bgaWerkzeugWaehlen(p, M, t); assert.ok(w.ergebnis.schritte.length === 3); assert.equal(typeof w.ergebnis.ok, "boolean");
  const a = bgaFolgeAnalysieren(p, bgaMitWerkzeug(M, w.nr), t, w.ergebnis.schritte.map((s) => ({ k: s.k, klemm: s.cfg.klemm, flip: s.cfg.flip }))); assert.equal(a.schritte.length, 3);
});
test("Geschlossener Kasten: das Blech trifft sich selbst (Gegenprobe)", () => {
  const p = bgaProfil([{ laenge: 100, winkel: 0 }, { laenge: 40, winkel: 90 }, { laenge: 100, winkel: 90 }, { laenge: 40, winkel: 90 }, { laenge: 100, winkel: 90 }]);
  const r = bgaFolgeSuchen(p, bgaMitWerkzeug(M, 0), t); assert.equal(r.ok, false);
});
test("Teillänge gegen Maschinenlänge", () => { assert.match(bgaTeilLaengePruefen(M, 4000), /länger/); assert.equal(bgaTeilLaengePruefen(M, 3000), ""); });
test("Übernahme aus dem CAD-Profil: Schenkel und Vorzeichen", () => {
  // CAD: erster Schenkel 50, Biegung +90° (gegen den Uhrzeigersinn), zweiter Schenkel 30
  const res = berechne(0, [{ typ: "schenkel", L: 50 }, B(90, 0.7), { typ: "schenkel", L: 30 }], t, 1, 0.4);
  const s = schenkelAusProfil(res); assert.equal(s.schenkel.length, 2); assert.equal(s.schenkel[0].laenge, 50); assert.equal(s.schenkel[1].winkel, -90);
  const pts = bgaPunkte(bgaProfil(s.schenkel), new Set([1])); assert.ok(Math.abs(pts[2][0] - 50) < 1e-6 && pts[2][1] > 29, "Endpunkt liegt nach oben (gegen den Uhrzeigersinn)");
});
test("Umschlag (180°) wird übernommen", () => { const res = berechne(0, [{ typ: "schenkel", L: 50 }, HEM(1, { t }, null), { typ: "schenkel", L: 10 }], t, 1, 0.4); const s = schenkelAusProfil(res); assert.equal(Math.abs(s.schenkel[1].winkel), 180); });
