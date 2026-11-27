// Tests: Genauigkeitsstatus je Feature (kern/genauigkeit.js) – Klassifizierung und Weitergabe an abgeleitete Features
import { bewerteGenauigkeit, modellStatus, abhaengigkeiten, schlechter } from "../kern/genauigkeit.js";

let fehler = 0;
const ok = (b, t) => { if (!b) { fehler++; console.error("✗", t); } else console.log("✓", t); };
const sk = { id: "sk", typ: "skizze", name: "Skizze" }, ex = { id: "ex", typ: "extrusion", name: "Extrusion", skizze: "sk" };

// 1 Kern aus: jeder Körper ist Näherung, Skizze bleibt exakte Rechnung
{
  const e = bewerteGenauigkeit({ features: [sk, ex], kernAn: false });
  ok(e.get("sk").klasse === "exact" && e.get("ex").klasse === "mesh", "Kern aus: Skizze exact, Extrusion mesh");
  ok(modellStatus(e, [sk, ex]).gesamt === "mesh", "Kern aus: Gesamtmodell nicht exakt");
}
// 2 Kern an, Körper ersetzt: exakt
{
  const e = bewerteGenauigkeit({ features: [sk, ex], kernAn: true, exakt: new Set(["ex"]) });
  ok(e.get("ex").klasse === "exact" && modellStatus(e, [sk, ex]).gesamt === "exact", "Kern an, exakter Körper: exact");
}
// 3 Kern meldet «nicht exakt» → mesh mit Grund; ohne Meldung und ohne exakten Körper wird nicht «exakt» behauptet
{
  const e = bewerteGenauigkeit({ features: [sk, ex], kernAn: true, nicht: new Map([["ex", "Abrunden: nicht unterstützt"]]) });
  ok(e.get("ex").klasse === "mesh" && /Abrunden/.test(e.get("ex").grund), "gemeldeter Grund bleibt erhalten");
  const e2 = bewerteGenauigkeit({ features: [sk, ex], kernAn: true });
  ok(e2.get("ex").klasse === "mesh", "kein exakter Körper vorhanden → nicht als exakt geführt");
}
// 4 Weitergabe: abgeleitetes Feature erbt die ungenauere Klasse
{
  const sw = { id: "sw", typ: "sweep", name: "Sweep", skizze: "sk", pfad: "sk" };
  const sub = { id: "su", typ: "extrusion", name: "Schnitt", ziel: "sw", skizze: "sk" };
  const e = bewerteGenauigkeit({ features: [sk, sw, sub], kernAn: true, exakt: new Set(["su"]) });
  ok(e.get("sw").klasse === "mesh", "Sweep: mesh");
  ok(e.get("su").klasse === "hybrid" && e.get("su").von.includes("sw"), "exakter Schnitt an einem Sweep: hybrid, Abhängigkeit genannt");
}
// 5 Quetschfalte (nur Netz) macht ihr exaktes Flächenblech zu «hybrid»
{
  const fl = { id: "fl", typ: "flaeche", name: "Blech", skizze: "sk" }, q = { id: "q", typ: "quetschfalte", name: "Falte", ziel: "fl" };
  const e = bewerteGenauigkeit({ features: [sk, fl, q], kernAn: true, exakt: new Set(["fl:0"]) });
  ok(e.get("fl").klasse === "hybrid" && e.get("q").klasse === "mesh", "Flächenblech mit Quetschfalte: hybrid, Falte mesh");
  const e2 = bewerteGenauigkeit({ features: [sk, fl, { ...q, _aus: true }], kernAn: true, exakt: new Set(["fl:0"]) });
  ok(e2.get("fl").klasse === "exact", "ausgeschaltete Quetschfalte zählt nicht");
}
// 6 Fehler und Sonderfälle
{
  const bad = { id: "b", typ: "extrusion", name: "Fehler", skizze: "sk", _fehler: "Profil nicht geschlossen" }, folge = { id: "f", typ: "extrusion", name: "Folge", ziel: "b" };
  const e = bewerteGenauigkeit({ features: [sk, bad, folge], kernAn: true, exakt: new Set(["b", "f"]) });
  ok(e.get("b").klasse === "failed" && e.get("f").klasse === "failed", "Fehler wird an Abhängige weitergegeben");
  const a = { id: "a", typ: "extrusion", name: "A", ziel: "c" }, c = { id: "c", typ: "extrusion", name: "C", ziel: "a" };
  const z = bewerteGenauigkeit({ features: [a, c], kernAn: true, exakt: new Set(["a", "c"]) });
  ok([...z.values()].some((r) => r.klasse === "failed"), "zyklische Abhängigkeit wird als failed gemeldet statt zu hängen");
  ok(schlechter("mesh", "exact") === "mesh" && schlechter("exact", "failed") === "failed", "Rangfolge der Klassen");
  ok(abhaengigkeiten({ id: "x", ziel: "alle", skizze: "sk:1" }).join() === "sk", "«alle» ist keine Abhängigkeit, Bezüge «id:k» werden auf die Feature-ID gekürzt");
  const v = { ...ex, versteckt: true };
  ok(modellStatus(bewerteGenauigkeit({ features: [sk, v], kernAn: false }), [sk, v]).gesamt === "exact", "verborgene Körper zählen nicht zum Gesamtstatus");
}
if (fehler) { console.error(`${fehler} Fehler`); process.exit(1); }
console.log("Genauigkeitsstatus: alle Tests bestanden");
