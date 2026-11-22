# Quellkarte (erzeugt mit `node tools/karte.mjs --schreibe`) – mit grep durchsuchen, nicht ganz lesen

Format: `Zeile name` (fn = Funktion, § = Abschnitt)

## src/ablage.js
5 KEY
6 lies
7 schreibe
8 MIME
10 fn ablageModul

## src/ansicht.js
6 RICHTUNGEN
12 UNPACK
15 fn umrisse
34 fn rechneAnsicht
86 fn verbinde
91 fn kantenGeometrie

## src/arbeitsbereich.js
3 SCHLUESSEL
4 mitte
5 lies
6 speichere
7 setze
24 leiste

## src/befehlssuche.js
3 SYNONYME
12 GRUPPEN
13 norm
14 fn befehle
30 zusatzBefehle
32 ZUL
33 lesZuletzt
34 merkeZuletzt
35 offen
36 fn oeffneBefehlssuche
64 fn schliesse

## src/cad.js
63 zuWeltK
66 VERSION
67 SPEICHER
69 § Ebenen
71 EBENEN
76 V
77 ebene
78 E_
79 ebenenName
80 basis
81 zu3D
82 ebenenEbene
83 aufEbene
85 § Dokument
86 doc
88 speichern
89 neueId
91 fn entferneFeature
95 fn einfuegen
100 fn bezuegeVon
111 finde
113 paramWerte
114 zahlAus
115 fn wendeAusdrueckeAn
124 fn skizzenAusdruecke
134 teilFinden
135 waehlbar
136 hauptVon
138 vorSk
139 vorDach
140 zeigerAuswahl
142 EINST
143 standardEinst
152 GRUPPEN
154 fn mitStandard
163 einst
166 rastern
168 darstellung
175 neuMaterial
176 SICHERUNG
177 sichLesen
178 sichSchreiben
180 fn sichereEinst
181 einstSpeichern
183 material
184 matOpt
185 auswahl
187 § Szene
188 leinwand
189 renderer
191 szene
192 kamera
193 steuerung
199 drehPivot
219 modellRadius
220 flaechenTreffer
221 fn ziehNahe
236 rollZug
248 licht
249 licht2
250 boden
252 modell
253 skizzenRaster
255 WUERFEL
256 wuerfelSzene
257 wuerfelMat
261 wuerfel
263 wuerfelHit
264 fn wuerfelTreffer
271 fn zeichneWuerfel
278 fn groesse
290 leeren
292 § Skizzengeometrie
295 schrift
296 TEXTE
297 fn textKonturen
310 fn elGeo
326 profilElemente
328 verbunden
329 fn zugPunkte
335 fn schleifen
342 ketten
353 flaeche
354 fn innen
363 REGIONEN
364 fn skizzenRegionen
375 fn gewaehlteRegionen
382 fn exakteProfile
393 fn formen
415 § Blech aus Linienzug
416 fn blechAusKette
417 fn blechOps
436 § Körper erzeugen
437 § Darstellung (wie «Erscheinungsbild» in Fusion): Metalle der Spenglerei, Holz, Beton
438 OBERFLAECHEN
455 oberflaecheFuer
456 farbe
457 TEXTUREN
458 fn textur
471 fn wuerfelUV
482 fn glatteNormalen
500 fn oberflaechenMaterial
508 darstellungVon
509 csg
510 fn koerperMesh
517 fn verknuepfe
525 nurPos
528 fn koerperGeometrie
536 fn drehGeometrie
560 fn zusammen
567 fn nachAussen
575 fn spiegleFlaechen
576 fn stirnMeshes
593 fn stirnAnhaengen
600 fn koerper
606 fn koerperAusGeo
612 konturForm
614 dunkelModus
615 § Layer (2D): Farbe und Linienart je Layer, Elemente verweisen mit el.layer
616 layerListe
617 layerVon
618 fn skizzenObjekt
649 § Konstruktionsebenen: Darstellung und Bezüge
650 EBENEN_ARTEN
655 fn ebenenObjekt
664 grundebenen
666 fn ebenenGroesse
676 zahl3
677 fmt3
678 elementPunkte
680 ELEMENTNAME
681 elementKanten
690 elementPfad
691 skizzeElement
692 welt
693 ACHSEN_EBENE
695 fn bezugEbene
699 fn bezugKante
709 fn bezugPunkt
718 fn bezugZylinder
726 fn bezugPfad
732 fn baueEbene
747 vorher
748 SCHNAPP
749 mitWert
750 ebenenOpt
751 fn kantenListe
757 fn punkteListe
763 fn zylinderListe
771 pfadListe
773 § Auswahl im 3D-Raum (Bezüge in Dialogen, Skizzierebene)
774 aufSchirm
775 abstandStrecke
776 fn koerperKanten
784 fn waehleImRaum
873 aktiveWahl
874 fn zeigeWahl
883 hoverGruppe
884 HOVERFARBE
885 hoverCache
886 fn flaechenRegion
900 waehlGruppe
901 fn regionMesh
908 fn zeichneGewaehlt
913 hoverWartet
914 fn hoverWahl
918 fn hoverLoeschen
919 fn hoverZeichnen
944 fn uebernimmWahl
974 § Ziehpfeile (wie in Fusion): Masse im Dialog zusätzlich mit einem Pfeil in der Ansicht ziehen
975 griffGruppe
976 griffe
978 fn beidseitig
985 fn griffeFuer
1003 regen-Zweig kmuster
1011 regen-Zweig schale
1034 griffLaenge
1035 fn zeichneGriffe
1049 fn griffAn
1071 griffEnde
1075 § Neuaufbau (parametrisch, in Reihenfolge der Zeitleiste)
1076 fn regen
1122 regen-Zweig ebene
1126 regen-Zweig achse
1129 regen-Zweig konpunkt
1132 regen-Zweig skizze
1136 regen-Zweig extrusion
1144 regen-Zweig bild
1147 regen-Zweig import
1151 regen-Zweig detail3d
1159 regen-Zweig kehle
1162 regen-Zweig kanten3d
1168 regen-Zweig kantenrund
1171 regen-Zweig schale
1177 regen-Zweig teilen
1179 regen-Zweig drehung
1184 regen-Zweig sweep
1187 regen-Zweig loft
1191 regen-Zweig blech
1217 regen-Zweig vorlage
1225 regen-Zweig flaeche
1244 regen-Zweig gebaeude
1249 regen-Zweig dach
1264 regen-Zweig dachbleche
1277 regen-Zweig quetschfalte
1283 regen-Zweig profilkante
1286 regen-Zweig eindeckung
1299 regen-Zweig dachelement
1306 regen-Zweig lukarne
1314 regen-Zweig kante
1317 regen-Zweig abwickeln
1324 regen-Zweig falten
1336 regen-Zweig rundblech
1341 regen-Zweig detail
1343 regen-Zweig profil
1367 § Rückgängig / Wiederholen
1369 verlauf
1370 zustand
1371 fn merke
1382 fn springe
1390 fn zeigeVerlauf
1404 fn markiere
1415 richtung
1416 fn zeigeRichtung
1431 richtungSkalieren
1437 § Browser und Zeitleiste
1438 NAMEN
1439 AUGE
1440 fn zeigeBrowser
1465 fn zeigeZeit
1475 gezogen
1485 fn verschiebeFeature
1497 fn abwickelnSchalten
1517 istAbgewickelt
1519 fn featureMenue
1584 fn waehle
1591 § Werkstatt
1592 f1
1593 register
1595 blechteile
1597 rundteile
1601 fn auftrag
1604 f2
1606 bedarf
1607 fn bedarfCsv
1616 fn bedarfHtml
1627 fn zeigeAuftrag
1646 fn dachListeZeilen
1656 fn zeigeDachListe
1665 fn zeigeWerkstatt
1724 fn dupliziere
1734 § Druck: Werkstattblatt je Blechteil (A4)
1735 kopf
1736 fn werkstattblatt
1760 fn stuecklisteBlatt
1776 fn druckeEtiketten
1790 fn drucke
1796 esc
1799 hinweisZeit
1800 fn status
1807 fn kopiere
1810 § Dateien
1812 pc
1813 DATEITYPEN
1814 dateiname
1815 fn herunterladen
1842 § Befehlsdialog
1843 dlg
1845 fn dialog
1870 schrittNamen
1871 fn zeigeSchritt
1886 mitSchritten
1887 werte
1889 fn merkeAusdruecke
1902 fn schliesse
1911 fn featureDialog
1931 bisFelder
1935 fn bisAbstand
1941 wendeBisAn
1942 fn extrusionMitteUV
1946 bisWert
1947 zweiFeld
1948 RICHTUNGEN
1949 LAGEN
1951 fn bearbeite
1986 fn ebeneDialog
2033 fn extrusionDialog
2050 VORGAENGE
2051 vorgangFelder
2056 fn drehAchse
2063 achsenOpt
2065 fn drehungDialog
2078 fn blechDialog
2100 fn vorlageDialog
2130 fn profilDialog
2181 § Rund-/Kegelblech (Zylinder- oder Kegelmantel mit exakter Abwicklung)
2183 rohrNeigung
2185 fn rohrSchnitt
2189 fn rohrSchnittWerkzeug
2193 fn rundMeridian
2202 fn rundGeometrie
2210 fn rundDialog
2233 fn zeigeRund
2253 § Flächenblech: Grundfläche aus der Skizze, Kantenbausteine je Kante
2254 alleBausteine
2255 bausteinFuer
2256 bausteinName
2258 fn bausteinKontur
2270 fn prisma
2284 fn sweepGlatt
2315 boxUeberlappt
2317 fn flachKoerper
2331 fn kantenBeschneiden
2346 fn lochRaender
2351 fn schneideAus
2366 fn blechEbene
2370 fn flaechenKoerper
2411 kantenZeiger
2412 menueKante
2413 kantenLabels
2414 kantenName
2415 fn zeigeKanten
2441 fn profilKanten
2449 profilKanteBelegt
2450 fn zeigeProfilKanten
2459 fn kanteUnterMaus
2471 § Komponenten: Lage (verschieben/drehen als Ganzes) und Kollisionsprüfung
2473 fn lageMatrix
2480 lageVon
2481 fn wendeKomponentenLageAn
2489 fn komponenteDialog
2501 kollisionen
2502 fn pruefeKollision
2523 fn kantenProfil
2529 fn berechneKanten
2539 kantenSchritte
2540 fn setzeKanteRoh
2548 fn setzeKanteVon
2555 werkzeugKante
2556 werkzeugNeu
2558 fn kantenMenue
2581 fn partnerKante
2589 § Dach-Modus (Phase 1): Gebäude-Ansatz + Dach aus Grundriss, Dachform und Aufbau
2590 dachEinst
2591 deckungBasis
2592 aufbauBasis
2593 BLECH_VORLAGE
2595 fn dachPlatte
2604 fn zeigeDachKoerper
2607 DACH_ARTEN
2609 fn dachBoxenGeo
2621 fn dachZiegelGeo
2630 fn dachBoxenKanten
2636 fn skizzenGrundriss
2641 gebaeudeUmriss
2643 deckungVon
2644 aufbauVon
2646 fn ebeneAktuell
2647 weltAkt
2648 dist3
2649 dachKoordinaten
2651 fn skizzenVieleck
2654 fn dachKoppeln
2675 fn lukarneKopplungSetzen
2682 lukarneSkizzenStand
2684 fn lukarneDachNeu
2693 fn lukarneKoppeln
2712 fn lukarneGeo
2724 fn skizzeAusFlaeche
2733 fn lukarneDachZuSkizzen
2742 fn dachAusSkizzen
2755 fn dachZuSkizzen
2762 fn dachErgebnis
2769 dachWelt
2771 fn dachPrisma
2780 fn wandPlatte
2788 fn eindeckungDialog
2795 fn lukarneDialog
2820 fn dachelementDialog
2835 fn dachblecheDialog
2847 fn gebaeudeDialog
2856 AUFBAU_ZAHLEN
2857 DECKUNG_ZAHLEN
2858 dachAufbauFelder
2859 dachDeckungFelder
2860 fn dachMasseUebernehmen
2869 fn dachDialog
2905 § Kanten-Werkzeug: Flansch / Umschlag / Kantenbaustein (erst Blech anklicken, dann die Kante)
2906 kantenWz
2907 kantenWzText
2908 fn kantenBarZeigen
2915 fn endeKantenWz
2916 kHoverWartet
2927 fn stirnErweiterungen
2930 fn profilErweiterungen
2933 istProfil
2934 fn kantenWert
2938 fn wendeProfilKante
2947 § Quetschfalte (Ecke zweier Aufkantungen eines Flächenblechs) ----
2948 quetschWz
2949 fn quetschGeo
2965 fn quetschMesh
2975 quetschEcken
2976 fn zeigeQuetschEcken
2980 fn starteQuetschWz
2985 fn endeQuetschWz
2986 fn quetschKlick
2993 fn quetschDialog
2998 fn starteKantenWz
3007 fn kantenWzKlick
3015 fn wendeKantenWz
3030 fn kanteUmkehren
3037 fn kanteDialog
3062 fn flaecheDialog
3145 fn belegteKanten
3148 fn zeigeFlaechenteil
3168 fn flaechenblatt
3189 § Baustein-Editor: Abkantfolge als Tabelle mit Live-Querschnitt und Zugabe
3190 bEdit
3191 neuerBaustein
3193 fn bZeilen
3197 bText
3198 fn bausteinEditor
3203 fn bVorschau
3212 bFolgeOk
3213 fn zeigeBEditor
3248 bZeilenAusTabelle
3284 § Konstruieren: Achsen und Punkte (wie in Fusion)
3285 ACHSEN_ARTEN
3286 PUNKT_ARTEN
3287 v3n
3288 kreuz3
3289 skal3
3290 fn baueAchse
3305 fn bauePunkt
3318 fn achsenObjekt
3323 fn punktObjekt
3327 fn konstruktionDialog
3352 § Körper: Abrunden/Fasen, Schale, Muster, Spiegeln, Verschieben/Kopieren (wie in Fusion)
3354 fn eckenBearbeiten
3366 fn gerundeteExtrusion
3380 fn schalenWerkzeug
3392 koerperVon
3397 fn transformAus
3413 fn koerperTeilen
3431 fn koerperTransform
3450 koerperOpt
3451 KOERPER_WZ
3454 fn koerperDialog
3488 § Bild / PDF-Plan als Hintergrund (wie «Arbeitsfläche» in Fusion) und DXF in die Skizze
3489 bilder
3490 BILDTEX
3491 fn bildObjekt
3503 fn bildAusQuelle
3509 pdfjs
3510 fn pdfLaden
3517 fn bildEinfuegen
3537 fn bildDialog
3585 § Abrunden / Fasen an angeklickten Kanten (beliebige Volumenkörper, gerade Kanten zwischen ebenen Flächen)
3587 fn kantenInfo
3603 fn kantenWerkzeug
3628 fn kantenBearbeiten
3639 fn skizzenTreffer
3655 fn kanteAmKoerper
3677 fn kantenDialog
3702 § Kehl- und Gratblech zwischen zwei Flächen (gekantet, mit Abwicklung)
3704 fn flaechenEbene
3705 fn flaechenAusdehnung
3718 fn umkehren
3719 fn kehlBlech
3767 norm2
3768 fn schnitt2
3769 fn kehleDialog
3785 fn blechAufFlaeche
3799 fn blechAufFlaecheStart
3806 § Sweep und Loft (wie in Fusion)
3807 v3
3809 fn ringNetz
3820 fn deckel
3824 flaeche2
3825 fn sweepGeometrie
3854 fn loftGeometrie
3876 fn sweepDialog
3887 fn loftDialog
3899 § Parameter ändern (Fusion: Ändern → Parameter ändern)
3900 fn parameterDialog
3944 § Prüfen: Messen und Schnittanalyse (wie in Fusion)
3945 messen
3946 messGruppe
3948 fn messPunkt
3955 fn messMarke
3959 fn messKlick
3969 fn messenUmschalten
3978 schnitt
3981 kappen
3982 schraffur
3983 fn schraffurTextur
3990 fn zeigeKappen
4009 fn wendeSchnittAn
4042 § Planblatt (Zeichnung): Ansichten, Details, Bemassung, Schriftfeld
4044 fn abwicklungPlanAnsicht
4067 fn dachDetails
4074 fn dachDetailSvg
4081 fn dachAufsichtAnsicht
4093 fn skizzenPlanAnsicht
4117 plaene
4144 § Einstellungen: Materialien kalibrieren, Lagerformate
4145 entwurf
4147 PROBE_SKIZZE
4162 probeWerte
4163 meldung
4164 zahlen
4165 einstRegister
4166 EINST_REGISTER
4168 fn einstFeld
4175 fn zeigeEinst
4313 fn etikettenPruefen
4317 fn probe
4344 fn einstWert
4354 fn einstLaden
4440 § Hilfe
4441 hilfe
4456 § Ansichten
4457 fn fitte
4464 alleBox
4465 fn ansicht
4473 § Skizzieren
4474 skizze
4476 WERKZEUGE
4520 ABH_NAME
4522 GLYPHE
4523 GRUND
4524 KNOPF_MENUE
4533 braucheEingabe
4534 fn eingabeBeschriften
4538 fn setzeWerkzeug
4552 fn loescheSkizzenAuswahl
4559 fn hilfslinieUmschalten
4564 fn starteSkizze
4588 § 2D-Modus: nur Skizzen/Zeichnung, Körper ausgeblendet, Layer-Leiste, DXF-Ausgabe
4589 modus2d
4590 fn layerZeigen
4622 fn zeichnungObjekte
4634 fn schalte2D
4647 fn beendeSkizze
4665 strahl
4666 fn ndc
4667 fn bildschirm
4668 fn fangPunkte
4672 FANGNAME
4673 kantenCache
4674 fn koerperKantenCache
4679 fn koerperFang
4692 fn skizzenFang
4706 FANGGLYPHE
4708 fangArtZuletzt
4709 fn fangZeigen
4716 fn ebenenPunkt
4733 abst
4734 abstandZurGeraden
4735 rechteckMitte
4736 rechteckEl
4737 rechteckM
4738 rechteck3Bed
4739 polygonBed
4741 fn erstelle
4757 fn klick
4827 § Ändern: Abrunden, Versatz, Spiegeln, Stutzen
4828 zuLinienzug
4834 fn trefferEcke
4842 fn abrunden
4852 fn versatzVorschau
4885 fn versatzKlick
4895 fn trefferStrecke
4900 fn spiegelnKlick
4912 schneidKanten
4913 fn stutzen
4919 fn stutzeLinie
4944 fn stutzeBogen
4966 § Dehnen, Trennen, Verschieben/Kopieren/Drehen, Muster, Projizieren
4967 REF_FELDER
4968 refsVon
4970 lageGebunden
4972 fn transformiere
4977 fn bewege
4996 dreher
4997 fertigMehr
4998 fn verschiebeUm
5004 fn dreheUm
5006 fn mehrfachKlick
5019 fn musterDialog
5040 fn aufBogen
5041 fn dehnen
5063 fn trennen
5107 umschaltAn
5109 fn flaechenRand
5119 fn teileAnEcken
5132 fn projizieren
5176 fn abschliessenLinie
5183 fn eingabeAnwenden
5225 § Bemassung und Auswahl
5226 gleich
5227 drehung
5233 RAD
5234 grad
5235 fgText
5237 fn uebernimm
5242 fn entferneBed
5248 fn massAendern
5268 fn bezuege
5285 projektion
5286 mitte
5288 fn waehleGeo
5313 fn wahlKlick
5327 fn abhAusWahl
5349 fn massFuerWahl
5401 fn massEingabe
5421 fn zugZiele
5427 fn segmente
5431 fn trefferElement
5441 fn trefferPunkt
5458 labels
5459 fgCache
5460 fn analyseGecacht
5469 fn zeichneLive
5575 fn zeigeLabels
5594 § Maus und Tastatur
5595 runter
5598 planUV
5599 smPos
5682 § Werkzeugleiste
5683 fn neueSkizze
5705 umformLetzt
5706 umformWerte
5707 fn umformDialog
5742 § Werkzeugleiste: Klappmenüs (fest positioniert, die Leiste rollt seitlich)
5743 leiste
5744 fn klappZu
5769 fn leisteZustand
5804 letzteVariante
5819 projektPfad
5821 ZULETZT
5822 zuletzt
5823 fn merkeDatei
5828 fn titel
5832 fn projektSpeichern
5838 fn ladeProjekt
5846 fn projektOeffnen
5853 § Konto & Cloud (Spengler-Digital-App)
5854 fn setzeAuftrag
5855 cloud
5868 projekte
5871 ablage
5874 fn auftragAnzeige
5883 § 3D-Detailvorlagen (STEP-Körper mit Ankerkante, ersetzen die .f3d-Vorlagen des Add-ins)
5884 DETAILMESH
5885 fn detail3dDialog
5902 fn detailAusDatei
5915 § Exakter CAD-Kern (Beta): OpenCascade im Web Worker (kern/cad)
5918 cadK
5919 kernAn
5920 fn kern
5928 fn kernAnzeige
5932 kernFehlerText
5934 fn exaktKoerper
5940 fn stepExakt
5945 fn pruefe3D
5961 exaktLauf
5963 regenStand
5964 exaktPlanen
5967 planAus
5968 fn exakteAnsicht
6000 fn ersetzeNetz
6009 fn exaktesModell
6038 regen-Zweig extrusion
6051 regen-Zweig kanten3d
6057 regen-Zweig schale
6065 regen-Zweig teilen
6082 regen-Zweig flaeche
6090 regen-Zweig rundblech
6099 regen-Zweig detail3d
6151 fn zeigeEigenschaften
6169 § Austausch: STEP/STL exportieren, STEP/STL importieren
6170 fn sichtbareKoerper
6177 dateiBasis
6178 fn exportiere
6184 occt
6185 fn occtLaden
6195 fn importFeature
6203 fn importiereDatei
6259 neuBestaetigt
6266 § Start
6309 neueVersionGemeldet
6310 fn pruefeNeueVersion

## src/cloud.js
7 KEY
8 lies
9 schreibe
11 fn cloudModul

## src/kontext.js
5 api
6 knopf
7 KOERPER
8 BLECH
10 A
11 F
12 fest
14 fn aktionenFuer
59 fn symbol
60 fn verfuegbar
62 fn zeichne
76 fn initKontext
80 kontextAktionen

## src/meldungen.js
3 box
4 fn zeigeMeldung

## src/plan.js
6 FORMATE
7 PLAN_MASSSTAEBE
8 z
9 esc
12 § Schnitt: Körper an der Ebene d·p = lage abschneiden (Blick von +d), Schnittflächen
13 csg
14 nurPos
15 fn geschnitten
31 fn schnittFlaechen
57 fn imKreis
65 fn planModul

## src/projekte.js
5 fn projekteModul

## kern/abwicklungRund.js
6 RAD
9 fn zylinderAbwicklung
17 fn kegelAbwicklung
29 fn abwickelbarkeit
39 fn rundblechAbwicklung
66 fn rundblechSvg
83 fn rohrSchraeg

## kern/auftrag.js
4 fn stueckliste
26 fn stuecklisteCsv

## kern/ausdruck.js
7 FUNK
12 EINHEIT
13 NAME
15 fn zerlege
32 fn rechne
72 istZahl
73 fn namenIn
76 fn parameterWerte

## kern/bedingungen.js
5 dx
6 lang
7 kreuz
8 skal
9 wickel
11 abstandGerade
12 winkelZwischen
14 GL

## kern/cad/ansichtExakt.js
8 kreuz
9 norm
10 dot
11 fn kameraAchsen
17 segmente
20 fn abstand
26 fn ohneDeckungsgleiche
31 fn ansichtAusProjektion
58 fn kettenAusKanten
78 fn kreiseAusLinienzuegen

## kern/cad/blech.js
6 fn blechQuerschnitt
28 fn verschiebeProfil
32 profilGrenzen
38 blechExtrusion
40 zuschnittAusVolumen

## kern/cad/featureBau.js
12 kreuz
13 dot
16 fn kernEbene
24 fn blechTeilKommando
36 fn extrusionKommandos
43 fn rotationKommandos
53 fn extrusionsHoehen
60 fn extrusionsKanten
67 fn extrusionsFlaechen
72 matrixZeilen
74 § Flächenblech mit Kantenbausteinen (exakt)
77 fn bausteinQuerschnitt
89 mal
94 basisMatrix
99 fn flaechenblechPlan
127 fn baueFlaechenblech

## kern/cad/klient.js
8 fn cadKlient

## kern/cad/occt.js
8 fehl
9 norm
10 kreuz
11 vec
14 fn kreisMitte
20 fn occtKern

## kern/cad/schnittstelle.js
50 SCHNITTSTELLE_VERSION
52 CODES
75 TOLERANZ
77 zahl
78 punkt
79 fehler
82 fn pruefeKommando

## kern/cad/skizzeProfile.js
9 auf
10 gleich
13 fn linienzug
39 fn splineSegmente
53 fn elementPfad
62 fn elementProfil
81 fn kettenProfil
99 fn profilPolygon
121 flaeche
122 fn innen
130 fn skizzenProfile

## kern/cad/topologie.js
8 r
9 rp
10 abst
13 fn flaechenSignatur
16 fn kantenSignatur
25 fn abweichung
43 fn aufloesen

## kern/cad/worker.js
7 laden
10 fn puffer

## kern/cloud/abgleich.js
6 PRAEFIX
7 fn sha256
11 sortiert
13 pruefsumme
14 schl
15 kurz
19 fn abgleichen

## kern/cloud/ablage.js
3 HAUPT
4 SCHLECHT
5 ordnerName
6 dateiName
8 projektOrdnerName
9 fn ordnerPlan
14 fn findeProjektOrdner
22 fn zuordnung
28 fn baum
34 modellDateiName

## kern/cloud/appformat.js
4 fn zeilenAusSchenkel
7 fn schenkelAusZeilen
9 fn teilFuerApp

## kern/cloud/client.js
3 URL_STANDARD
4 SCHLUESSEL_STANDARD

## kern/cloud/projekte.js
2 STATUS
3 norm
6 fn pruefeProjekt
16 fn suche
21 modellFelder
23 geaendert

## kern/cloud/spiegel.js
7 leererSpiegel
8 norm
9 gleichB
10 gleichM
13 fn einstInSpiegel
39 fn loescheImSpiegel
46 fn spiegelInEinst
65 fn spiegelSpeicher

## kern/dach/bleche.js
4 sub
5 cross
6 BLECHARTEN
9 fn kantenListe
15 fn ueberlapp
21 punktBei
23 fn querWinkel
28 fn verschmelze
45 fn dachSegmente
74 fn dachBleche

## kern/dach/detail.js
4 FARBEN
5 z
6 DETAILARTEN
9 klippX
12 fn dachSchnitt
58 fn dachSchnittSvg

## kern/dach/eindeckung.js
7 sub
9 fn abziehenKlein
14 ccw
17 fn eindeckung
43 fn ziegelPrisma

## kern/dach/elemente.js
6 VELUX_BREITEN
7 VELUX_HOEHEN
8 BESTAETIGT
9 veluxListe
10 ELEMENTARTEN
12 innenPunkt
14 fn elementRechteck
20 fn elementKoerper
29 elementFlaeche
31 fn kaminBleche

## kern/dach/flaechen.js
5 sub
6 area2
7 links
10 fn zerlegeKonvex
46 fn flaecheAus
62 fn dachAusFlaechen

## kern/dach/fluegel.js
5 EPS
7 GRUNDFORMEN
9 fn grundrissForm
18 ebeneVon
19 hoehe
20 flaechePoly
21 gleich
23 kantenEbenen
24 inHuelle
26 fn abziehen
36 fn kantenHaupt
37 fn kantenQuer
39 fn fluegelDach
86 gegenUhrzeiger
87 fn konvex
88 fn polygonDach

## kern/dach/form.js
5 rad
6 flaecheVon
7 gegenUhr
10 fn beschneide
19 schnittGerade
25 fn dachFlaechen
66 fn waende
79 fn rechteckDach
88 DACHFORMEN

## kern/dach/koerper.js
4 sub
5 cross
6 norm
9 fn flaechenSystem
20 fn intervall
29 spanne
30 flaecheEbene
33 fn flaechenRahmen
38 fn flaechenKoerper
99 fn dachMengen

## kern/dach/lukarne.js
6 rad
7 LUKARNENARTEN
8 innenPunkt
11 fn lukarne

## kern/dach/lukarneAufmass.js
7 rad
8 sub
9 cross
10 innenPunkt
12 fn ebene3
16 hull
21 fn rahmen
26 fn aufmassAusPunkt
31 fn lukarneAufmass

## kern/dach/vorlagen.js
3 DECKUNGEN_STANDARD
8 AUFBAU_STANDARD
12 grundeinstellung
14 fn schichten
28 fn pruefeDach
34 lattenAnzahl

## kern/details.js
8 § Abkantfolge als Kurzschrift
11 fn folge
31 folgeText
39 Z
40 rechteck
41 rad
42 teil
43 holz
44 mass
46 § Vorlagen
48 ROLLEN
50 DETAILS
181 DETAIL
182 detailStandard
183 rollenVon
187 fn baueDetail
204 teilKontur

## kern/dxf.js
8 fn teil
37 fn abwicklungDxf
45 fn flaeche
54 fn flaecheDxf
62 fn abwicklungenDxf
70 fn ascii
76 fn rundblechDxf

## kern/dxflesen.js
4 FAKTOR
7 fn paare
13 fn objekte
21 wert
22 alle
25 fn bulgeBogen
34 fn polylinie
48 fn bspline
63 fn dxfLesen

## kern/ebenen.js
7 plus
8 minus
9 mal
10 punkt
11 kreuz
12 laenge
13 einheit
14 rad
15 vek
18 fn drehe
24 fn ebeneAus
36 BASIS
41 ACHSEN
43 zuWelt
44 zuLokal
47 versetzt
50 fn unterWinkel
59 fn mittelebene
71 fn zweiKanten
84 fn dreiPunkte
91 fn tangential
100 fn entlangPfad
113 aufFlaeche

## kern/flaechenblech.js
14 BAUSTEINE_STANDARD
34 X
35 fn bausteinProfil
51 fn profilLage
66 xBei
70 fn eckFaktor
74 innenPoly
77 fn intervalle
83 fn streifenSchnitt
94 fn treffer
112 fn schraegSchnitt
132 UEB
133 fn eckSchnitt
148 knick
149 richtung
150 fn eckFaktoren
161 sub
162 len
163 flaeche
164 gegenUhrzeiger
167 fn kantenGruppen
185 schnitt
189 fn lappenLinie
198 fn abwicklung
225 fn plattenUmriss
234 fn flaechenblech
240 § -
243 fn profilPunkt
263 fn faltePunkt
281 fn ausschnittWerkzeug
329 fn ausschnittKante

## kern/flansch.js
4 zahl
5 fn werkzeugAuf
12 flanschStandard
13 werkzeugName
17 fn folgeUmkehren
25 folgeAnhaengen

## kern/geometrie.js
15 rad
17 fn rueckversatz
25 fn berechne
96 fn polylinie
116 fn versatzLinie
129 fn grenzen
137 fn kontur

## kern/loeser.js
6 rest
7 quadsumme
8 groesster
11 fn jacobi
29 fn lgs
42 fn loese
73 fn freiheitsgrade

## kern/materialien.js
5 MATERIALIEN
15 TAFELN
16 COIL
17 SPALTBAENDER
19 LAGER
22 fn quelle
33 fn kFaktorAusProbe

## kern/profile.js
5 L
6 B
7 HEM
8 ARC
10 fn traufe
21 fn ortgang
35 fn first
45 fn wandanschluss
54 fn kappleiste
63 fn abdeckung
73 fn haengerinne
79 fn kastenrinne
91 fn kehle
101 fn fensterbank
114 VORLAGEN
150 VORLAGE
152 fn standardwerte
158 fn freiesProfil
171 fn alsZeilen
189 bend
191 erweiterungsOps
192 fn profilErweitern

## kern/quetschfalte.js
7 D
8 sk
9 kreuz
10 betrag
11 norm
12 winkel
14 fn eckeGeometrie
29 fn quetschZuschnitt
47 fn rot
48 fn faltenPruefen
56 fn quetschDreieck
62 fn quetschDxf

## kern/regionen.js
4 EPS
5 kreuz2
6 flaecheVon
7 punktInPolygon
16 inRegion
19 fn innenpunkt
38 fn regionen

## kern/richtung.js
2 rueckVersatz
5 zweiseitig
11 laengeVon

## kern/selbsttest.js
12 M
13 fn selbsttest

## kern/sicherung.js
2 kopie
3 gleich
6 fn sichere
11 fn geloeschte
15 fn inPapierkorb
20 fn zurueckholen
26 einspielen

## kern/skizze.js
5 abst
6 winkelVon
7 norm2pi
8 auf
11 fn kreisDurch3
20 fn bogenDaten
26 fn bogenPunkte
33 fn bogenAusMitte
38 kreisPunkte
41 fn polygonPunkte
46 fn rechteck3
52 fn langlochPunkte
60 fn abrundung
79 fn rundePolylinie
91 fn versatzPolylinie
108 fn spiegelPunkt
115 fn schnittStrecken
123 fn schnittStreckeKreis
133 fn verbindeStuecke
163 fn splinePunkte
183 fn ellipsePunkte

## kern/skizzenloeser.js
11 ABH
12 IST_MASS
15 fn sichereIds
20 neueElementId
23 fn vorbereiten
39 rechteckBedingungen
42 fn punkte
55 kantenZahl
58 fn modell
93 fn gleichung
106 fn uebersetze
139 fn festeVariablen
147 fn bereinige
154 fn system
163 fn schreibe
187 fn loeseSkizze
215 fn analyse
225 fn fuegeHinzu

## kern/step.js
6 zahl
7 text
9 vek
10 kreuz
11 punkt3
12 norm
14 fn brep
79 fn stepDatei
124 fn stlDatei
141 fn stlLesen

## kern/stirnflansch.js
9 hyp
12 fn schenkelBereiche
28 fn gehrungVersatz
34 fn laschenHoehe
40 laschenStart
41 laschenEnde
43 verschiebe
47 fn stirnLaschen
68 stuetz
69 fn abwicklungUmriss
88 fn laschenBiegelinien

## kern/umformung.js
6 VERFAHREN
7 rad
9 fn tangentialeDehnung
13 fn scheibeMitRand
19 fn kragen
26 fn kegelstumpf
33 fn beurteilen
55 fn zuschnitt
72 fn zuschnittDxf

## kern/vorlagen/detail3d.js
6 norm
7 kreuz
11 fn kantenLage
21 anwenden
24 fn detailAusStep
32 fn pruefeDetail
43 meshAusVorlage

## kern/vorlagen/kurzschrift.js
6 WINKEL
7 zahlOderAusdruck
10 fn zerlege
26 txt
27 negativ
29 fn alsText
37 fn aufloesen

## kern/vorlagen/modelle.js
5 SCHEMA
6 KATEGORIE_OHNE
7 TYPEN
9 jetzt
10 hex
11 neueId
12 kopie
14 parameter
16 operation
18 fn neueKantenvorlage
28 fn neueDetailvorlage
39 fn neuesMaterialprofil

## kern/vorlagen/parameter.js
6 ZAHL_TOKEN
7 hatAusdruck
8 RESERVIERT
11 fn bausteinWerte
17 fn bausteinFolge
22 fn pruefeEignung
38 fn parameterText
39 fn parameterAusText

## kern/vorlagen/wandler.js
10 fn bausteinZuVorlage
21 fn vorlageZuBaustein
30 fn materialZuProfil
39 profilZuMaterial

## kern/zeichnung.js
5 z
6 esc
9 fn profilSvg
69 fn abwicklungSvg
96 svgNr
99 MASSSTAEBE
100 fn passenderMassstab
104 fn detailSvg
148 fn zuschnittSvg
172 fn bausteinPunkte
178 bausteinGrenzen
180 fn bausteinSvg

## kern/zeichnung2d.js
3 FARBEN
7 LINIENARTEN
11 farbeHex
12 standardLayer
13 ascii
14 lname
18 fn skizzenDxf

## kern/zuschnitt.js
8 fn tafelnBelegen
25 fn materialbedarf
