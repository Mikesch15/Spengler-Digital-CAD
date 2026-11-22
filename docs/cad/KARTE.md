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
194 FOV_NORMAL
195 perspUpdate
196 fn orthoUpdate
201 fn orthoSetzen
209 steuerung
215 drehPivot
235 modellRadius
236 flaechenTreffer
237 fn ziehNahe
252 rollZug
264 licht
265 licht2
266 boden
268 modell
269 skizzenRaster
271 WUERFEL
272 wuerfelSzene
273 wuerfelMat
277 wuerfel
279 wuerfelHit
280 fn wuerfelTreffer
287 fn zeichneWuerfel
294 fn groesse
306 leeren
308 § Skizzengeometrie
311 schrift
312 TEXTE
313 fn textKonturen
326 fn elGeo
342 profilElemente
344 verbunden
345 fn zugPunkte
351 fn schleifen
358 ketten
369 flaeche
370 fn innen
379 REGIONEN
380 fn skizzenRegionen
391 fn gewaehlteRegionen
398 fn exakteProfile
409 fn formen
431 § Blech aus Linienzug
432 fn blechAusKette
433 fn blechOps
452 § Körper erzeugen
453 § Darstellung (wie «Erscheinungsbild» in Fusion): Metalle der Spenglerei, Holz, Beton
454 OBERFLAECHEN
471 oberflaecheFuer
472 farbe
473 TEXTUREN
474 fn textur
487 fn wuerfelUV
498 fn glatteNormalen
516 fn oberflaechenMaterial
524 darstellungVon
525 csg
526 fn koerperMesh
533 fn verknuepfe
541 nurPos
545 fn konischGeometrie
557 fn koerperGeometrie
565 fn drehGeometrie
589 fn zusammen
596 fn nachAussen
604 fn spiegleFlaechen
605 fn stirnMeshes
624 fn stirnAnhaengen
631 fn koerper
637 fn koerperAusGeo
643 konturForm
645 dunkelModus
646 § Layer (2D): Farbe und Linienart je Layer, Elemente verweisen mit el.layer
647 layerListe
648 layerVon
649 fn skizzenObjekt
680 § Konstruktionsebenen: Darstellung und Bezüge
681 EBENEN_ARTEN
686 fn ebenenObjekt
695 grundebenen
697 fn ebenenGroesse
707 zahl3
708 fmt3
709 elementPunkte
711 ELEMENTNAME
712 elementKanten
721 elementPfad
722 skizzeElement
723 welt
724 ACHSEN_EBENE
726 fn bezugEbene
730 fn bezugKante
740 fn bezugPunkt
749 fn bezugZylinder
757 fn bezugPfad
763 fn baueEbene
778 vorher
779 SCHNAPP
780 mitWert
781 ebenenOpt
782 fn kantenListe
788 fn punkteListe
794 fn zylinderListe
802 pfadListe
804 § Auswahl im 3D-Raum (Bezüge in Dialogen, Skizzierebene)
805 aufSchirm
806 abstandStrecke
807 fn koerperKanten
815 fn waehleImRaum
904 aktiveWahl
905 fn zeigeWahl
914 hoverGruppe
915 HOVERFARBE
916 hoverCache
917 fn flaechenRegion
948 waehlGruppe
949 fn regionMesh
956 fn zeichneGewaehlt
961 hoverWartet
962 fn hoverWahl
966 fn hoverLoeschen
967 fn hoverZeichnen
992 fn uebernimmWahl
1022 § Ziehpfeile (wie in Fusion): Masse im Dialog zusätzlich mit einem Pfeil in der Ansicht ziehen
1023 griffGruppe
1024 griffe
1026 fn beidseitig
1034 fn griffeKante
1068 fn griffeDrehung
1076 fn griffeFuer
1094 regen-Zweig kmuster
1102 regen-Zweig schale
1131 GRIFFFARBE
1132 griffLaenge
1134 griffInput
1135 vorschauFeature
1136 fn zeichneGriffe
1150 fn griffAn
1172 griffEnde
1176 § Neuaufbau (parametrisch, in Reihenfolge der Zeitleiste)
1177 simulation
1178 fn regen
1224 regen-Zweig ebene
1228 regen-Zweig achse
1231 regen-Zweig konpunkt
1234 regen-Zweig skizze
1238 regen-Zweig extrusion
1246 regen-Zweig bild
1249 regen-Zweig import
1253 regen-Zweig detail3d
1261 regen-Zweig kehle
1264 regen-Zweig kanten3d
1270 regen-Zweig kantenrund
1273 regen-Zweig schale
1279 regen-Zweig bohrung
1281 regen-Zweig biegung
1283 regen-Zweig rip
1285 regen-Zweig rohr
1287 regen-Zweig spirale
1289 regen-Zweig rippe
1291 regen-Zweig teilen
1293 regen-Zweig drehung
1298 regen-Zweig sweep
1301 regen-Zweig loft
1305 regen-Zweig blech
1331 regen-Zweig vorlage
1339 regen-Zweig flaeche
1359 regen-Zweig loftflansch
1363 regen-Zweig gebaeude
1368 regen-Zweig dach
1383 regen-Zweig dachbleche
1396 regen-Zweig quetschfalte
1402 regen-Zweig profilkante
1405 regen-Zweig eindeckung
1418 regen-Zweig dachelement
1425 regen-Zweig lukarne
1433 regen-Zweig kante
1436 regen-Zweig abwickeln
1443 regen-Zweig falten
1455 regen-Zweig rundblech
1460 regen-Zweig detail
1462 regen-Zweig profil
1487 § Rückgängig / Wiederholen
1489 verlauf
1490 zustand
1491 fn merke
1502 fn springe
1510 fn zeigeVerlauf
1524 fn markiere
1535 richtung
1536 fn zeigeRichtung
1551 richtungSkalieren
1557 § Browser und Zeitleiste
1558 NAMEN
1559 AUGE
1560 fn zeigeBrowser
1586 ZEIT_ICON
1593 zeitIcon
1595 projektHinweisGezeigt
1596 fn projektHinweis
1600 fn zeigeZeit
1609 zeitTip
1614 gezogen
1624 fn verschiebeFeature
1636 fn abwickelnSchalten
1656 istAbgewickelt
1658 fn featureMenue
1723 fn waehle
1730 § Werkstatt
1731 f1
1732 register
1734 blechteile
1736 rundteile
1740 fn auftrag
1743 f2
1745 bedarf
1746 fn bedarfCsv
1755 fn bedarfHtml
1766 fn zeigeAuftrag
1785 fn dachListeZeilen
1795 fn zeigeDachListe
1804 fn zeigeWerkstatt
1863 fn dupliziere
1873 § Druck: Werkstattblatt je Blechteil (A4)
1874 kopf
1875 fn werkstattblatt
1899 fn stuecklisteBlatt
1915 fn druckeEtiketten
1929 fn drucke
1935 esc
1938 hinweisZeit
1939 fn status
1946 fn kopiere
1949 § Dateien
1951 pc
1952 DATEITYPEN
1953 dateiname
1954 fn herunterladen
1981 § Befehlsdialog
1982 dlg
1984 fn dialog
2009 schrittNamen
2010 fn zeigeSchritt
2025 mitSchritten
2026 werte
2028 fn merkeAusdruecke
2041 fn schliesse
2050 fn featureDialog
2070 bisFelder
2074 fn bisAbstand
2080 wendeBisAn
2081 fn extrusionMitteUV
2085 bisWert
2086 zweiFeld
2087 RICHTUNGEN
2088 LAGEN
2090 fn bearbeite
2129 fn ebeneDialog
2176 fn extrusionDialog
2194 VORGAENGE
2195 vorgangFelder
2200 fn drehAchse
2207 achsenOpt
2209 fn drehungDialog
2222 fn blechDialog
2244 fn vorlageDialog
2274 fn profilDialog
2325 § Rund-/Kegelblech (Zylinder- oder Kegelmantel mit exakter Abwicklung)
2327 rohrNeigung
2329 fn rohrSchnitt
2333 fn rohrSchnittWerkzeug
2337 fn rundMeridian
2346 fn rundGeometrie
2354 fn rundDialog
2377 fn zeigeRund
2397 § Flächenblech: Grundfläche aus der Skizze, Kantenbausteine je Kante
2398 alleBausteine
2399 bausteinFuer
2400 bausteinName
2402 fn bausteinKontur
2416 fn prisma
2433 fn sweepGlatt
2464 boxUeberlappt
2466 fn flachKoerper
2480 fn kantenBeschneiden
2495 fn lochRaender
2500 fn schneideAus
2515 fn blechEbene
2519 fn flaechenKoerper
2565 kantenZeiger
2566 menueKante
2567 kantenLabels
2568 kantenName
2569 fn zeigeKanten
2595 fn profilKanten
2603 profilKanteBelegt
2604 fn zeigeProfilKanten
2613 fn kanteUnterMaus
2625 § Komponenten: Lage (verschieben/drehen als Ganzes) und Kollisionsprüfung
2627 fn lageMatrix
2634 lageVon
2635 fn wendeKomponentenLageAn
2643 fn komponenteDialog
2655 kollisionen
2656 fn pruefeKollision
2677 fn kantenProfil
2683 fn berechneKanten
2693 kantenSchritte
2694 fn setzeKanteRoh
2702 fn setzeKanteVon
2709 werkzeugKante
2710 werkzeugNeu
2712 fn kantenMenue
2735 fn partnerKante
2743 § Dach-Modus (Phase 1): Gebäude-Ansatz + Dach aus Grundriss, Dachform und Aufbau
2744 dachEinst
2745 deckungBasis
2746 aufbauBasis
2747 BLECH_VORLAGE
2749 fn dachPlatte
2758 fn zeigeDachKoerper
2761 DACH_ARTEN
2763 fn dachBoxenGeo
2775 fn dachZiegelGeo
2784 fn dachBoxenKanten
2790 fn skizzenGrundriss
2795 gebaeudeUmriss
2797 deckungVon
2798 aufbauVon
2800 fn ebeneAktuell
2801 weltAkt
2802 dist3
2803 dachKoordinaten
2805 fn skizzenVieleck
2808 fn dachKoppeln
2829 fn lukarneKopplungSetzen
2836 lukarneSkizzenStand
2838 fn lukarneDachNeu
2847 fn lukarneKoppeln
2866 fn lukarneGeo
2878 fn skizzeAusFlaeche
2887 fn lukarneDachZuSkizzen
2896 fn dachAusSkizzen
2909 fn dachZuSkizzen
2916 fn dachErgebnis
2923 dachWelt
2925 fn dachPrisma
2934 fn wandPlatte
2942 fn eindeckungDialog
2949 fn lukarneDialog
2974 fn dachelementDialog
2989 fn dachblecheDialog
3001 fn gebaeudeDialog
3010 AUFBAU_ZAHLEN
3011 DECKUNG_ZAHLEN
3012 dachAufbauFelder
3013 dachDeckungFelder
3014 fn dachMasseUebernehmen
3023 fn dachDialog
3059 § Kanten-Werkzeug: Flansch / Umschlag / Kantenbaustein (erst Blech anklicken, dann die Kante)
3060 kantenWz
3061 kantenWzText
3062 fn kantenBarZeigen
3070 fn endeKantenWz
3071 kHoverWartet
3082 fn stirnErweiterungen
3085 fn profilErweiterungen
3088 istProfil
3089 fn kantenWert
3093 fn wendeProfilKante
3102 § Quetschfalte (Ecke zweier Aufkantungen eines Flächenblechs) ----
3103 quetschWz
3105 fn eckenEntlastung
3121 fn quetschFlansch3D
3127 fn quetschEcke3D
3132 fn quetschGeo
3143 fn quetschMeshes
3163 quetschEcken
3164 fn zeigeQuetschEcken
3169 wkAbbruch
3170 fn wkZeigen
3171 fn wkZu
3174 fn starteQuetschWz
3179 fn endeQuetschWz
3180 fn quetschKlick
3187 fn quetschDialog
3192 fn starteKantenWz
3201 fn kantenWzKlick
3210 fn waehleKante
3217 fn vorschauFeatures
3218 fn vorschauVerwerfen
3219 fn uebernehmeKanten
3225 fn vorschauAktualisieren
3230 fn wendeKantenWz
3245 fn kanteUmkehren
3252 fn kanteDialog
3288 fn flaecheDialog
3375 fn belegteKanten
3378 fn zeigeFlaechenteil
3398 fn flaechenblatt
3419 § Baustein-Editor: Abkantfolge als Tabelle mit Live-Querschnitt und Zugabe
3420 bEdit
3421 neuerBaustein
3423 fn bZeilen
3427 bText
3428 fn bausteinEditor
3433 fn bVorschau
3442 bFolgeOk
3443 fn zeigeBEditor
3478 bZeilenAusTabelle
3514 § Konstruieren: Achsen und Punkte (wie in Fusion)
3515 ACHSEN_ARTEN
3516 PUNKT_ARTEN
3517 v3n
3518 kreuz3
3519 skal3
3520 fn baueAchse
3535 fn bauePunkt
3548 fn achsenObjekt
3553 fn punktObjekt
3557 fn konstruktionDialog
3582 § Körper: Abrunden/Fasen, Schale, Muster, Spiegeln, Verschieben/Kopieren (wie in Fusion)
3584 fn eckenBearbeiten
3596 fn gerundeteExtrusion
3610 fn schalenWerkzeug
3622 § Weitere Körperwerkzeuge (wie in Fusion): Skalieren, Bohrung, Rohr, Spirale, Rippe ----
3623 § Biegung an frei gezeichneter Linie (Flächenblech): Blech entlang einer Skizzenlinie um einen Winkel biegen ----
3624 BLECH_WZ
3625 polyKlipp
3629 fn unterteile
3636 fn biegungOp
3664 fn ripOp
3674 § Lofted Flange: Blechfläche zwischen zwei offenen Profilen (Linienzügen), Dicke aus dem Material, mit genäherter Abwicklung ----
3675 fn loftflanschBau
3709 KOERPER_WZ2
3710 csgGeo
3711 vereinigeGeos
3712 fn zylinderZwischen
3716 fn bohrungOp
3732 fn rohrGeometrie
3738 fn mergeGeos
3742 fn spiraleGeometrie
3751 fn rippeGeometrie
3761 koerperVon
3766 fn transformAus
3788 fn koerperTeilen
3806 fn koerperTransform
3825 koerperOpt
3826 KOERPER_WZ
3829 fn biegungDialog
3838 fn ripDialog
3846 fn loftflanschDialog
3856 fn koerper2Dialog
3884 fn koerperDialog
3919 § Bild / PDF-Plan als Hintergrund (wie «Arbeitsfläche» in Fusion) und DXF in die Skizze
3920 bilder
3921 BILDTEX
3922 fn bildObjekt
3934 fn bildAusQuelle
3940 pdfjs
3941 fn pdfLaden
3948 fn bildEinfuegen
3968 fn bildDialog
4016 § Abrunden / Fasen an angeklickten Kanten (beliebige Volumenkörper, gerade Kanten zwischen ebenen Flächen)
4018 fn kantenInfo
4034 fn kantenWerkzeug
4059 fn kantenBearbeiten
4070 fn skizzenTreffer
4086 fn kanteAmKoerper
4108 fn kantenDialog
4133 § Kehl- und Gratblech zwischen zwei Flächen (gekantet, mit Abwicklung)
4135 fn flaechenEbene
4136 fn flaechenAusdehnung
4149 fn umkehren
4150 fn kehlBlech
4198 norm2
4199 fn schnitt2
4200 fn kehleDialog
4216 fn blechAufFlaeche
4230 fn blechAufFlaecheStart
4237 § Sweep und Loft (wie in Fusion)
4238 v3
4240 fn ringNetz
4251 fn deckel
4255 flaeche2
4256 fn sweepGeometrie
4285 fn loftGeometrie
4307 fn sweepDialog
4318 fn loftDialog
4330 § Parameter ändern (Fusion: Ändern → Parameter ändern)
4331 fn parameterDialog
4375 § Prüfen: Messen und Schnittanalyse (wie in Fusion)
4376 messen
4377 messGruppe
4379 fn messPunkt
4386 fn messMarke
4390 fn messKlick
4400 fn messenUmschalten
4409 § Simulation (Tragfähigkeit von Blechen, Richtwert – src/simulation.js, kern/fem/)
4411 fn femQuellen
4431 simStart
4437 schnitt
4440 kappen
4441 schraffur
4442 fn schraffurTextur
4449 fn zeigeKappen
4468 fn wendeSchnittAn
4501 § Planblatt (Zeichnung): Ansichten, Details, Bemassung, Schriftfeld
4503 fn abwicklungPlanAnsicht
4526 fn dachDetails
4533 fn dachDetailSvg
4540 fn dachAufsichtAnsicht
4552 fn skizzenPlanAnsicht
4576 plaene
4611 § Einstellungen: Materialien kalibrieren, Lagerformate
4612 entwurf
4614 PROBE_SKIZZE
4629 probeWerte
4630 meldung
4631 zahlen
4632 einstRegister
4633 EINST_REGISTER
4635 fn einstFeld
4642 fn zeigeEinst
4780 fn etikettenPruefen
4784 fn probe
4811 fn einstWert
4821 fn einstLaden
4907 § Hilfe
4908 hilfe
4923 § Ansichten
4924 fn fitte
4931 alleBox
4932 fn ansicht
4941 § Skizzieren
4942 skizze
4944 WERKZEUGE
4990 ABH_NAME
4992 GLYPHE
4993 GRUND
4994 KNOPF_MENUE
5003 braucheEingabe
5004 fn eingabeBeschriften
5008 fn setzeWerkzeug
5024 fn loescheSkizzenAuswahl
5031 fn hilfslinieUmschalten
5037 fn starteSkizze
5062 § 2D-Modus: nur Skizzen/Zeichnung, Körper ausgeblendet, Layer-Leiste, DXF-Ausgabe
5063 modus2d
5064 fn layerZeigen
5096 fn zeichnungObjekte
5108 fn schalte2D
5121 fn beendeSkizze
5141 strahl
5142 fn ndc
5143 fn bildschirm
5144 fn fangPunkte
5148 FANGNAME
5149 kantenCache
5150 fn koerperKantenCache
5155 fn koerperFang
5168 fn skizzenFang
5182 FANGGLYPHE
5184 fangArtZuletzt
5185 fn fangZeigen
5192 fn ebenenPunkt
5209 abst
5210 abstandZurGeraden
5211 rechteckMitte
5212 rechteckEl
5213 rechteckM
5214 rechteck3Bed
5215 polygonBed
5217 fn erstelle
5233 fn klick
5305 § Ändern: Abrunden, Versatz, Spiegeln, Stutzen
5306 zuLinienzug
5312 fn trefferEcke
5321 fn fase
5332 fn skizzeSkalieren
5341 fn schnittMitKoerpern
5359 fn abrunden
5369 fn versatzVorschau
5402 fn versatzKlick
5412 fn trefferStrecke
5417 fn spiegelnKlick
5429 schneidKanten
5430 fn stutzen
5436 fn stutzeLinie
5461 fn stutzeBogen
5483 § Dehnen, Trennen, Verschieben/Kopieren/Drehen, Muster, Projizieren
5484 REF_FELDER
5485 refsVon
5487 lageGebunden
5489 fn transformiere
5494 fn bewege
5513 dreher
5514 fertigMehr
5515 fn verschiebeUm
5521 fn dreheUm
5523 fn mehrfachKlick
5536 fn musterDialog
5557 fn aufBogen
5558 fn dehnen
5580 fn trennen
5624 umschaltAn
5626 fn flaechenRand
5636 fn teileAnEcken
5649 § Projizieren: Kanten, Flächen und Skizzenlinien wählen (leuchten orange); erst «OK» (Enter) projiziert ----
5650 projGruppe
5651 projLinienSchluessel
5652 fn projKandidat
5675 e_projRadius
5676 fn projZeichnen
5685 projHoverWartet
5687 fn projHover
5691 fn projBarZeigen
5696 fn projWahlLeeren
5697 fn projizieren
5702 fn projizierenBestaetigen
5726 fn abschliessenLinie
5733 fn eingabeAnwenden
5775 § Bemassung und Auswahl
5776 gleich
5777 drehung
5783 RAD
5784 grad
5785 fgText
5787 fn uebernimm
5792 fn entferneBed
5798 fn massAendern
5818 fn bezuege
5835 projektion
5836 mitte
5838 fn waehleGeo
5863 fn wahlKlick
5877 fn abhAusWahl
5899 fn massFuerWahl
5951 fn massEingabe
5971 fn zugZiele
5977 fn segmente
5981 fn trefferElement
5991 fn trefferPunkt
6008 labels
6009 fgCache
6010 fn analyseGecacht
6019 fn zeichneLive
6125 fn zeigeLabels
6144 § Maus und Tastatur
6145 runter
6148 planUV
6149 smPos
6238 § Werkzeugleiste
6239 fn neueSkizze
6262 § Werkzeugleiste: Klappmenüs (fest positioniert, die Leiste rollt seitlich)
6263 leiste
6265 bandAn
6266 aktTab
6267 fn klappZu
6302 fn leisteZustand
6337 letzteVariante
6352 projektPfad
6354 ZULETZT
6355 zuletzt
6356 fn merkeDatei
6361 fn titel
6365 fn projektSpeichern
6371 fn ladeProjekt
6379 fn projektOeffnen
6386 § Konto & Cloud (Spengler-Digital-App)
6387 fn setzeAuftrag
6388 cloud
6401 projekte
6404 ablage
6407 fn auftragAnzeige
6416 § 3D-Detailvorlagen (STEP-Körper mit Ankerkante, ersetzen die .f3d-Vorlagen des Add-ins)
6417 DETAILMESH
6418 fn detail3dDialog
6435 fn detailAusDatei
6448 § Exakter CAD-Kern (Beta): OpenCascade im Web Worker (kern/cad)
6451 cadK
6452 kernAn
6453 fn kern
6461 fn kernAnzeige
6465 kernFehlerText
6467 fn exaktKoerper
6473 fn stepExakt
6478 fn pruefe3D
6494 exaktLauf
6496 regenStand
6497 exaktPlanen
6500 planAus
6501 fn exakteAnsicht
6533 fn ersetzeNetz
6542 fn exaktesModell
6571 regen-Zweig extrusion
6584 regen-Zweig kanten3d
6590 regen-Zweig schale
6598 regen-Zweig teilen
6615 regen-Zweig flaeche
6623 regen-Zweig rundblech
6632 regen-Zweig detail3d
6684 fn zeigeEigenschaften
6702 § Austausch: STEP/STL exportieren, STEP/STL importieren
6703 fn sichtbareKoerper
6710 dateiBasis
6711 fn exportiere
6717 occt
6718 fn occtLaden
6728 fn importFeature
6736 fn importiereDatei
6792 neuBestaetigt
6799 § Start
6808 fn skizzeSenkrecht
6847 neueVersionGemeldet
6848 fn pruefeNeueVersion

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
66 fn tabGroesse
70 fn planModul

## src/projekte.js
5 fn projekteModul

## src/simulation.js
11 LAGERARTEN
12 FESTE
13 RICHT
14 AUSWAHLEN
15 WAHLNAME
16 ANZEIGEN
17 PALETTE
18 farbe
19 z
20 neueId
21 achse
22 richtungVon
24 fn simModul
125 regen-Zweig lastfall
171 regen-Zweig lager

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

## kern/fem/bericht.js
2 esc
3 z
5 HINWEIS
7 fn lagerText
8 fn lastText
18 fn berichtHtml

## kern/fem/beulen.js
6 fn jacobi
20 fn beulen

## kern/fem/blechmodell.js
5 X_START
9 fn profilQuelle
16 fn flaechenQuelle
38 fn groesse
44 fn baueModell

## kern/fem/loeser.js
5 fn rcm
19 fn system
66 fn loese

## kern/fem/netz.js
5 fn delaunay
22 flaecheVon
23 fn inPolygon
24 abstandSeg
27 teilungen
28 fn randPunkte
31 fn flaechenNetz
50 auf3D
52 fn plattenAdd
59 fn streifenAdd

## kern/fem/normen.js
4 kNm2
7 fn schneelast
12 fn windlast
14 personenlast
16 BEIWERTE
19 fn kombinationen

## kern/fem/schale.js
4 BSIGN
5 sub
6 kreuz
7 norm
10 fn lokal
17 Dmembran
18 Dbiegung
21 fn BMembran
28 fn BDKT
50 mulBtDB
56 fn elementSteifigkeit
80 fn elementSpannung
90 Dm0
93 fn elementGeoSteifigkeit

## kern/fem/studie.js
6 sub
7 kreuz
8 dot
9 len
10 nrm
13 fn analyse
24 abstSeg
27 fn auswahl
59 fn lagerAnwenden
67 LAGER_ARTEN
70 fn lastVektor
93 fn auswerten
105 fn rechneStudie

## kern/fem/werkstoff.js
3 TAB
10 fn werkstoff

## kern/flaechenblech.js
15 BAUSTEINE_STANDARD
39 X
40 fn bausteinProfil
56 fn profilLage
71 xBei
75 fn eckFaktor
79 innenPoly
82 fn intervalle
88 fn streifenSchnitt
99 fn treffer
117 fn schraegSchnitt
137 UEB
138 fn eckSchnitt
153 knick
154 richtung
155 fn eckFaktoren
175 sub
176 len
177 flaeche
178 gegenUhrzeiger
181 fn kantenGruppen
199 schnitt
203 fn lappenLinie
212 fn abwicklung
241 fn plattenUmriss
250 fn quetschEcke
261 fn flaechenblech
271 § -
274 fn profilPunkt
294 fn faltePunkt
312 fn ausschnittWerkzeug
360 fn ausschnittKante

## kern/flansch.js
4 zahl
8 fn werkzeugAuf
23 flanschStandard
24 BEZUEGE
25 BIEGEPOS
26 SAUMARTEN
27 werkzeugName
31 fn folgeUmkehren
39 folgeAnhaengen

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
33 fn quetschZuschnitt
53 fn rot
54 fn faltenPruefen
62 fn quetschDreieck
68 fn quetschDxf
83 fn eckSchnitt2
88 fn quetschEckeFlach

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
37 fn laschenHoehe
43 laschenStart
44 laschenEnde
46 verschiebe
50 fn stirnLaschen
71 stuetz
72 fn abwicklungUmriss
91 fn laschenBiegelinien

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
