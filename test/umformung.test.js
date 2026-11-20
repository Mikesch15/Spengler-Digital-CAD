// Tests: Umformung (Werte aus tests/test_forming.py des Fusion-Add-ins)
import { scheibeMitRand, kragen, kegelstumpf, beurteilen, zuschnitt } from "../kern/umformung.js";
let fehler = 0; const ok = (b, t) => { if (!b) { fehler++; console.error("✗", t); } else console.log("✓", t); };
const nah = (a, b, t = 1e-9) => Math.abs(a - b) < t, wirft = (f) => { try { f(); return false; } catch { return true; } };
const e = scheibeMitRand(100, 20);
ok(e.art === "stauchen" && nah(e.dehnungRand, -20 / 120) && e.rohlingDurchmesser === 240 && !e.abwickelbar, "Scheibe mit Rand: stauchen, −16.7 %, Rohling Ø240");
const k = kragen(50, 10); ok(k.art === "strecken" && nah(k.dehnungRand, 10 / 40) && kragen(10, 15).fehler, "Kragen: strecken +25 %, zu hoher Kragen = Fehler");
const g = kegelstumpf(100, 50, 100), s = Math.hypot(50, 100);
ok(nah(g.rAussen - g.rInnen, s) && nah((g.oeffnungswinkel / 360) * 2 * Math.PI * g.rAussen, 2 * Math.PI * 100) && g.abwickelbar && kegelstumpf(80, 80, 50).zylinder, "Kegelstumpf: Mantellinie, Bogenlänge = Umfang, Zylinder erkannt");
const ohne = beurteilen(e, "auto", {}); ok(ohne.herstellbar === null && ohne.hinweise.some((h) => /nicht beurteilbar/.test(h)), "Ohne eigenen Grenzwert: «nicht beurteilbar» (nie geraten)");
const m = { umform: { schrumpfMaxProzent: 20, streckMaxProzent: 10, quelle: "Probe Werkstatt" } };
ok(beurteilen(e, "stauchen", m).herstellbar === true, "Grenzwert 20 % ≥ 16.7 % → herstellbar");
ok(beurteilen(e, "stauchen", { umform: { ...m.umform, schrumpfMaxProzent: 10 } }).herstellbar === false, "Grenzwert 10 % < 16.7 % → nicht herstellbar");
ok(beurteilen(e, "strecken", m).herstellbar === false && beurteilen(e, "manuell", m).herstellbar === null, "Falsches Verfahren nicht herstellbar; manuell nicht beurteilbar");
const kb = beurteilen(kragen(10, 15), "auto", {}); ok(kb.herstellbar === false && kb.hinweise.some((h) => /nicht erlaubt/.test(h)), "Kragen zu hoch: nicht herstellbar, keine Einschnitte");
ok(beurteilen(g, "auto", {}).herstellbar === true, "Kegel: abwickelbar, herstellbar ohne Umformung");
const z = zuschnitt(e); ok(z.kontur[0][3] === 120 && z.biegelinien[0][3] === 100 && z.grenzen[2] === 120, "Zuschnitt Scheibe: Rohling R120, Biegelinie R100");
ok(zuschnitt(g).kontur.length === 4 && wirft(() => zuschnitt(kragen(10, 15))) && zuschnitt(kegelstumpf(100, 0, 100)).kontur.length === 3 && wirft(() => zuschnitt({ ...g, mehrteiligNoetig: true })), "Zuschnitt Kegel (Sektor, Spitze ohne Innenbogen), Kragen-Fehler und Mantel über 360° werfen");
if (fehler) { console.error(fehler + " Fehler"); process.exit(1); } else console.log("Umformung: alle Tests bestanden");
