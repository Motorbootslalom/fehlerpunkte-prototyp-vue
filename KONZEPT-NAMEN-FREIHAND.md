# Konzept: Namen je Position und Auswahl mit Freihandlinie

Stand 12.11.2026, nach der Vorstellung des Prototyps. **Umgesetzt am 12.11.2026** mit den
Vorschlägen aus §4, weil die Fragen dort noch offen waren. Abweichungen stehen bei den Abschnitten.
Behoben ist außerdem, dass die Bedienleiste bei der Vorlage „leer“ verschwand (§3).

## 1. Namen je Position

### 1.1 Was verstanden wurde

- Vor dem Wettkampf steht fest, wer an welcher Position sitzt. Die Namen sollen einmal eingetragen
  werden und dann auf allen Listen dieser Position stehen.
- Mit einem Parcours gibt es je Position einen Namen.
- Mit zwei Parcours fährt jede Klasse auf einem von beiden. Jeder Parcours hat eigene WKR, je Position
  also zwei Namen. Welcher Name auf eine Liste kommt, folgt aus ihrer Klasse.

Heute steht das WKR-Feld im Kopf jedes Bogens und gilt je Liste, Klasse und Lauf
(`wkr["manoevrieren/4/1/steg"]`). Bei 8 Klassen und 3 Läufen steht derselbe Name bis zu 24-mal da und
muss so oft getippt werden.

### 1.2 Die WKR-Einteilung

Ein Knopf „WKR-Einteilung“ in der Bedienleiste, unter dem Aufbau, öffnet wie der Assistent einen
Bereich über den Bögen:

```text
WKR-Einteilung                                          [x] Zwei Parcours

Klassen        Parcours 1:  E  1  2  3        Parcours 2:  4  5  6  7
               (ein Klick auf eine Klasse schiebt sie auf den anderen Parcours)

Liste                    Parcours 1            Parcours 2
Zeit                     [Meier         ]      [Schulz        ]
Steg                     [Huber         ]      [Huber         ]
Tor 1 / 3 / 5            [              ]      [              ]
Tor 2 / 4 / 5            [              ]      [              ]
Mann-über-Bord           –                     [Kraus         ]
Knoten                   [              ]      [              ]
```

- Die Zeilen sind die Listen des gewählten Aufbaus in seiner Reihenfolge. Darunter stehen die
  weiteren Listen aus der Schnellauswahl (Knoten, Varianten ohne Start/Ziel), denn auch sie
  lassen sich drucken.
- Ohne Haken gibt es eine Spalte „Name“ und keine Klassenzeile.
- Mit Haken kommen die zweite Spalte und die Zuordnung der Klassen dazu. Am Anfang stehen alle Klassen
  auf Parcours 1.
- Ein Strich statt Feld: Keine Klasse dieses Parcours hat die Liste, im Beispiel MüB (ab Klasse 4).

### 1.3 Wirkung auf die Bögen

- Das WKR-Feld zeigt den Namen aus der Einteilung: Klasse, dann Parcours, dann Name der Liste. Im
  Druck steht er wie ein eingetippter Name, am Bildschirm ist er blau.
- Wer auf einem Bogen etwas anderes einträgt, etwa eine Vertretung im 2. Lauf, ändert nur diesen
  Bogen. Wird das Feld dort wieder geleert, gilt wieder die Einteilung.
- Mit zwei Parcours steht der Parcours im Kopf der Liste unter Klasse und Lauf, damit die Stapel
  nicht durcheinandergeraten (siehe Frage 2), auch in der react-pdf-Insel.

### 1.4 Speichern

- Die Einteilung gehört zur Veranstaltung, nicht zum Aufbau. Sie liegt im Browser wie heute die
  WKR-Namen. Sie steht nicht im Aufbau, nicht in dessen YAML-Datei und nicht im Einstellungs-Link. So
  bleibt es bei KONZEPT-POSITIONEN.md §1: Der Assistent speichert keine Personennamen.
- „Alles zurücksetzen“ löscht sie mit den übrigen Eingaben.
- Die Namen hängen an der Liste. Nach einem Wechsel des Aufbaus gelten sie für die Listen, die es dort
  auch gibt (Zeit, Steg, Knoten …). Die übrigen bleiben gespeichert und gelten wieder, sobald man
  zurückwechselt.
- Beide Parcours nutzen denselben Aufbau. Zwei Parcours mit verschiedenen Aufbauten deckt das nicht ab.

### 1.5 Technik

- Neu im Zustand: `einteilung` mit der Zahl der Parcours, der Zuordnung Klasse → Parcours und je
  Parcours den Namen je Liste.
- `wkrVon` liefert erst den Namen des Bogens, sonst den aus der Einteilung. Die Vorschau und die
  react-pdf-Insel lesen den Namen nur dort und bekommen ihn so ohne weitere Änderung.
- Tests für `wkrVon` mit einem und zwei Parcours, mit überschriebenem Bogen und mit Listen, die eine
  Klasse nicht hat.

## 2. Bojen mit einer Freihandlinie zuordnen

### 2.1 Was verstanden wurde

Im Assistenten sollen sich die Bojen einer Position auch im Parcoursbild wählen lassen: eine Linie um
die Bojen ziehen, statt Zellen anzuklicken. Die Tabelle bleibt, beide Wege ändern denselben Entwurf.
Das ist die „Ausbaustufe“ aus KONZEPT-POSITIONEN.md §7.

### 2.2 Bedienung

Über der Tabelle steht ein Umschalter „Zuordnen: Tabelle | Im Bild“. Die Wahl merkt sich der Browser.

```text
Zeichnen für:  (●) Tor 1/3/5   ( ) Tor 2/4/5   ( ) Zeit   ( ) Parcours     [+ Position]  [↶ Rückgängig]

┌──────────────────────────────────────────────────────────────────────────┐
│  Parcoursbild, groß                                                      │
│  Jede Boje trägt einen Punkt in der Farbe ihrer Position,                │
│  rot umrandet, solange keine Position sie beobachtet.                    │
└──────────────────────────────────────────────────────────────────────────┘

Tor 1/3/5:  Blick [von hinten ▾]   Zeit [keine ▾]   [ ] Bild klein
            [ ] Fehler Tor 5   [ ] Mann-über-Bord   [ ] Parcoursüberwachung
```

- Oben wählt man die Position, für die man zeichnet. Jede Position hat eine Farbe, die auch im
  Spaltenkopf der Tabelle erscheint.
- Mit Maus, Finger oder Stift eine Linie ziehen. Was sie umkreist oder überstreicht, beobachtet danach
  die gewählte Position.
- Hatte eine Boje schon eine andere Position, wechselt sie zur gewählten. Eine Boje auf zwei Listen ist
  selten gewollt (gelbe Warnung); das geht weiter über die Tabelle.
- Ein Klick auf eine einzelne Boje schaltet sie für die gewählte Position an oder aus. So lässt sich
  ein Fehlgriff korrigieren, ohne neu zu zeichnen. „Rückgängig“ nimmt die letzte Linie zurück.
- Unter dem Bild stehen die Einstellungen der gewählten Position: Blick, Zeitnahme, „Bild klein“ und
  die Aufgaben ohne Boje (Fehler Tor 5, MüB, Parcoursüberwachung).
- Prüfung (rot, gelb, grün) und die Bögen darunter bleiben wie bei der Tabelle.

### 2.3 Das Bild

- Das Quellbild von Klasse 7, denn es zeigt alle Bojen, auch Speed 2. Bei einer Kursvariante wie Möwe
  deren Bild.
- Ungedreht, wie in der Tabelle beschrieben: Die rechte Seite der Hinfahrt liegt im Bild unten.
- Wählbar sind die 14 Einzelbojen der Tabelle: Start/Ziel und Tor 5 je zwei, Tor 1 bis 4 je innen und
  außen, Speed 1 und Speed 2.

### 2.4 Technik

- Das SVG wird eingebettet statt als Bild geladen. So sind die Bojen über ihre IDs (`Tor1_innen` …)
  erreichbar, und `getBBox()` liefert ihre Mittelpunkte.
- Die Linie ist eine Punktliste in Bildkoordinaten. Eine reine Funktion in `lib/assistent.ts`
  entscheidet, ob eine Boje in der geschlossenen Linie oder nah an ihr liegt. Sie ist ohne Browser
  testbar.
- `touch-action: none` auf dem Bild, damit Zeichnen auf dem Tablet die Seite nicht verschiebt.
- Neue Komponente `ZuordnungImBild.vue`. Der Assistent bekommt nur den Umschalter.
- Fehlt eine Boje im Bild (z. B. Tonne 8 in einer Kursvariante), steht sie unter dem Bild zum
  Anhaken.

## 3. Behoben: Bedienleiste verschwand bei der Vorlage „leer“

Der Entwurf behält im Assistenten seine ID, während sich seine Positionen ändern. Die Bedienleiste
merkte sich die Positionen des Aufbaus über diese ID und fragte nach dem Wechsel auf „leer“ nach einer
Position, die es nicht mehr gab. Der Fehler brach ihre Anzeige ab. Dasselbe passierte beim Entfernen
einer Spalte. Jetzt rechnen Bedienleiste und App die Positionen nach jeder Änderung der Konfiguration
neu (`konfigStand`).

## 4. Offene Fragen

Umgesetzt ist jeweils der Vorschlag: Klasse fest auf einem Parcours, Parcours im Kopf, Einteilung nur
im Browser, Boje wechselt zur gewählten Position, erst die Einteilung. Andere Antworten lassen sich
nachziehen.

1. **Zwei Parcours:** Bleibt eine Klasse die ganze Veranstaltung auf demselben Parcours, oder kann das
   je Lauf wechseln?
2. **Kopf der Liste:** Soll der Parcours dort stehen, wenn es zwei gibt?
3. **Weitergabe:** Die Einteilung nur im Browser wie die WKR-Namen heute, oder auch im
   Einstellungs-Link? Dann stünden Personennamen in jeder geteilten Adresse.
4. **Freihandlinie:** Wechselt eine Boje beim Zeichnen zur gewählten Position (Vorschlag), oder kommt
   sie zusätzlich dazu?
5. **Reihenfolge:** Erst die Einteilung, dann die Freihandlinie? Beide hängen nicht voneinander ab.
