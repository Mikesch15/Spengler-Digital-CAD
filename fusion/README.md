# Spengler Digital – Add-in für Fusion (Probe 0.1)

Kante eines Blechkörpers anklicken, Kantenbaustein wählen (Kurzschrift wie in der App, z. B. «90 25 U+ 7»).
Das Add-in erzeugt je Schritt eine Lasche an der jeweils neuen Aussenkante; Ecken, Abwicklung und Pläne macht Fusion.

## Installieren (Windows)
1. Ordner `fusion/SpenglerDigital` auf den PC kopieren (z. B. aus dem GitHub-Repo als ZIP herunterladen).
2. Fusion → **Dienstprogramme → Add-Ins → Skripte und Add-Ins** (Shift+S) → Register **Add-Ins** → **+** (bzw. «Mein Add-In verknüpfen») → den Ordner `SpenglerDigital` wählen → **Ausführen**.
3. Im Arbeitsbereich **Blech** erscheint unter **Erstellen** der Befehl **Kantenbaustein**.

## Erster Test
1. Blech-Arbeitsbereich: Rechteck skizzieren → **Lasche** (Grundlasche) erzeugen.
2. **Kantenbaustein** → obere Aussenkante anklicken → «Ortgang: Aufkantung (90 25)» → OK.
3. Danach «Doppelstehfalz – Unterfalz (90 25 U+ 7)» an einer anderen Kante.

Die Blech-Programmierschnittstelle von Fusion ist noch «Preview». Das Add-in schreibt jeden Schritt in
`spengler_protokoll.txt` im Add-in-Ordner – diese Datei bitte schicken, falls etwas nicht klappt.

Test der Kurzschrift ohne Fusion: `python3 fusion/test_kurzschrift.py`
