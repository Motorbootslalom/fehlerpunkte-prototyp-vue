# Konzept: UIM-Wettkampf (Formula Future)

Stand: 07.11.2026. **Noch nicht umgesetzt.** Die Entscheidungen in §3 sind abgestimmt, §12 nennt
die Annahmen.

Das Dokument beschreibt, wie das Fehlerpunkte-Tool einen Wettkampf nach dem UIM Circuit Rulebook
2026, Regel 960 „Formula Future“, abbildet: WKR-Listen, Eingabe, Wertung und Ergebnislisten. Dazu
kommen zwei Änderungen im Schwester-Tool `../verzahnung-prototyp-vue`.

## 1. Abgrenzung

- Die Vorlage für alle Listen ist das PDF der WM 2025 in `private/`, die Regeln stehen im Rulebook
  im selben Ordner. Beide bleiben außerhalb von Git. **Echte Namen und einzelne Ergebnisse gehören
  nicht in Tests, Doku oder Commits.**
- Die DM-Wertung bleibt, wie sie ist. Dort fehlen noch der Stichentscheid nach Reglement C5 (bei
  Punktgleichheit entscheidet der schnellste gewertete Lauf) und die Mannschaftswertung. Das ist
  ein eigenes Thema.
- Der nationale Modus des Parallelslaloms in der Verzahnung bleibt vorerst bestehen, liefert aber
  keinen Startplan an das Fehlerpunkte-Tool.

## 2. Begriffe

| Begriff | Bedeutung |
|---|---|
| Stufe | Manövrieren (Stage 2) oder Parallelslalom (Stage 3); jede ist eine eigene Wertung. |
| Runde | Vorlauf, Halbfinale, kleines Finale oder Finale des Parallelslaloms. |
| Parcours | A oder B. Beim Parallelslalom fährt je Start auf jedem Parcours ein Boot. |
| Paar | Zwei Starter, die gegeneinander fahren und dabei Parcours und Boot tauschen. |
| Start | Ein gleichzeitiger Start auf A und B. Jedes Paar hat zwei Starts. |
| Block | Die Starts, die zusammengehören: 4 Starts (kleines Paar, großes Paar, beide getauscht) oder 2 Starts, wenn ein Bootstyp aufgebraucht ist. |
| Versuch | Attempt im Rulebook: die erste oder zweite Fahrt eines Starters in einer Runde. |
| Dummy | Fahrer außer Wertung, der ein Paar auffüllt; in der Regel ein Erwachsener. |

## 3. Entscheidungen

| Thema | Entscheidung | Grund |
|---|---|---|
| Parallelslalom | Nur wählbar, wenn das Regelwerk UIM gewählt ist. | Nur dort wird er gefahren. |
| Reihenfolge der WKR-Listen | Je Parcours klassenübergreifend in Startreihenfolge; so wird auch eingetragen. | So sieht der WKR die Starter wirklich. |
| Besetzung (Alcatraz) | Je Parcours ein WKR für die Bojen, eine Zeitnahme, ein Stegpersonal. Kein Vorsteg. Das ergibt 6 Listen je Runde. | Vorgabe des Wettkampfs; der Aufbau `parallel` kann für andere Orte abweichen. |
| Seitentrennung | Gilt auch für die Parallel-Listen. | Fertige Seiten lassen sich schon im laufenden Slalom eintragen. |
| Versuche | Echte Versuche statt „Parcours A = 1. Attempt“, abgeleitet aus dem Startplan. | Das Rulebook verlangt Versuche; die alte Excel-Liste konnte das nicht. |
| Detailseite | Gegliedert nach „1. Attempt“ und „2. Attempt“ mit Spalte „Course“, Platz je Versuch wird gezeigt. | Wie im Rulebook. Der Platz mischt A und B und ist bei unterschiedlich schnellen Parcours nur begrenzt aussagekräftig. |
| Gliederung der Parallel-Ergebnisse | Checkbox „Ergebnisse nach Parcours“ schaltet zwischen Attempt 1/2 und Parcours A/B um. **Standard: aus** (Attempts). Sie lässt sich jederzeit umstellen, auch nach dem Eintragen. | Das Rulebook verlangt Attempts. Je Parcours fährt aber ein eigenes Boot, ein anderer Motor kann die Zeiten verschieben. Nach Parcours sieht man das direkt. |
| Klassen im Paar | Neue Checkbox in der Verzahnung für die strenge Auslegung von Pkt. 4.4 (nur gleiche Klasse). **Standard: aus.** Gemischt wird dann nur ein übriger Starter mit der nächsten Klasse im gleichen Boot, auch bei „Reihenfolge nach Startnummer“. | Streng braucht öfter einen Dummy. Der ist meist ein Erwachsener und deutlich schwerer als ein Kind; die nächste Klasse passt besser. Bei den Klassengrößen der WM 2025 wären es 3 Dummys statt 1. |
| Weniger als 4 gewertete Starter | Bei 3 ein Halbfinale mit Dummy, bei 2 direkt das Finale. | Das Rulebook regelt den Fall nicht. |
| Disq. im Halbfinale oder Finale | Letzter der Runde, die Punkte dieses Platzes bleiben. Sind mehrere betroffen, entscheidet der gültige Versuch; wer keinen hat, steht zuletzt. | Die Regel sagt hier „ranked last“ und streicht nicht wie im Vorlauf die ganze Stufe. |
| Disq. in den Listen | Steht als `disq.`, ohne Ersatzzahl. Die Reihenfolge wird direkt aus dem Status gebildet. | Die 999,00 waren eine Krücke, um Excel richtig sortieren zu lassen. |
| NKB | Der Parallelslalom läuft wie bei der WM 2025. | Die getrennten „Wertungsläufe“ im Ablaufplan der Ausschreibung sind nur missverständlich formuliert. |
| Manövrier-Versuche | Checkbox „Versuche direkt nacheinander“. **Standard: aus** (Pause mit Aushang zwischen den Läufen). | International üblich und in Pkt. 4.3.2 so beschrieben. National gibt es die Pause, weil sonst Fehler, die zur Disqualifikation führten, ohne diese Information wiederholt werden. |

## 4. Regeln im Überblick

Alle Angaben aus Regel 960. Zeiten und Strafen zählen als Sekunden, der Wert eines Versuchs ist
Zeit plus Strafen. Ein disqualifizierter Versuch hat keinen Wert und steht als `disq.` in der Liste.

| Stufe / Runde | Gefahren wird | Es zählt | Disqualifikation |
|---|---|---|---|
| Manövrieren (4.3) | Knoten, 2 Versuche auf demselben Parcours | besserer Versuch plus Knotenstrafen | trifft nur den Versuch; beide disq. = keine Punkte (5.2.1) |
| Vorlauf (4.4) | 2 Versuche, Parcours und Boot getauscht | Summe beider; die besten 4 je Klasse kommen weiter | ganze Stufe disq., keine Punkte (5.2.2) |
| Halbfinale (4.4) | die 4, Paare nach Startnummer | Summe; 1./2. ins Finale, 3./4. ins kleine Finale | Letzter der Runde (5.2.2) |
| Finale, kleines Finale | je 2 Starter | Plätze 1 und 2 bzw. 3 und 4 | Letzter der Runde (5.2.2) |

**UIM-Punkte (5.1):** 400, 300, 225, 169, 127, 95, 71, 53, 40, 30, 22, 17, 13, 9, 7, 5, 4, 3, 2, 1
für die Plätze 1 bis 20, danach 0. Wer die Stufe nicht beendet, wird dort nicht gewertet.

**Einzelwertung:** Summe der Punkte beider Stufen je Klasse. **Länderwertung:** die besten 5 eines
Landes, das mindestens 5 Fahrer stellen muss (5.1).

**Gleichstände (5.2.6):**

- Manövrieren: Die bessere Summe beider Versuche entscheidet; wer nur einen gültigen Versuch hat,
  steht dahinter.
- Parallelslalom: Der bessere Einzelversuch entscheidet. Bleibt es gleich und hängt das Weiterkommen
  daran, werden beide Versuche wiederholt, und nur die Wiederholung zählt.
- Einzelwertung: Die bessere Summe aus bestem Manövrier-Versuch und beiden Parallel-Versuchen
  entscheidet.
- Länderwertung: Die Punkte der 1. Plätze entscheiden, dann die der 2. Plätze usw.
- Gibt es danach keine Entscheidung, bleibt es beim Gleichstand.

**Vorgaben für die Listen (5.2, 3.4):** Sie tragen die Aushangzeit und die Unterschrift des O.O.D.;
Amtssprache ist Englisch.

## 5. Was die Listen der WM 2025 zeigen

Geprüft im Scratchpad gegen das PDF:

- `buildParallelPlan` aus der Verzahnung ergibt die Listen A und B **in allen vier Runden Zeile für
  Zeile** (Vergleich ohne Dummy-Zeilen). Die Runden nach dem Vorlauf brauchen also keine neue Logik.
- Im Vorlauf ist „1. Attempt“ **in jeder Zeile mit Zeit Parcours A**. Die Plätze waren dadurch nicht
  falsch, weil Summe und bester Einzelversuch nicht von der Reihenfolge abhängen.
- Disqualifizierte stehen im Vorlauf hinter allen anderen und bekommen keine Punkte. Die Excel-Liste
  rechnet dafür 999,00 je disqualifiziertem Versuch ein. Die Reihenfolge ergibt sich genauso, wenn der
  gültige Versuch entscheidet und zuletzt steht, wer keinen hat. Das neue Tool schreibt `disq.`.
- Im Manövrieren teilen sich alle, die in beiden Versuchen disqualifiziert sind, den letzten Platz.
- Kleine Boote waren auf Parcours A rund 6 bis 7 Sekunden langsamer als auf B, große kaum. Das muss
  nicht am Parcours liegen: Je Parcours fährt ein eigenes Boot, schon ein etwas anderer Motor kann das
  erklären. Deshalb lassen sich die Ergebnisse auch nach Parcours zeigen (§7.5).
- Für eine Disqualifikation im Halbfinale oder Finale gibt es kein Beispiel; es gilt nur der
  Regeltext.
- In den Manövrier-Listen von Dolphin und Klasse 2 stehen Fehler beim Anlegen unter „Pon. dep.“: Die
  Codes daneben sind Anlege-Codes. Das neue Tool führt sie unter dem Anlegen.
- Bei **4 von 5 Punktgleichheiten** der Einzelwertung steht der Starter mit der schlechteren
  Summenzeit vorn, entgegen 5.2.6. Das neue Tool folgt der Regel und platziert hier anders; die
  Punkte bleiben gleich. Beim Abgleich ist das eine erwartete Abweichung.

## 6. Startplan

### 6.1 Verzahnung: strenge Klassentrennung

Neue Checkbox in `src/components/ParallelView.vue`: „Paare nur innerhalb einer Klasse (strenge
Auslegung UIM 4.4)“. Zustand `parallelStrictClass`, Standard `false`.

`buildParallelPlan` (`src/lib/parallel.ts`) bekommt die Option `strictClass`:

- **Aus:** Ein übriger Starter einer Klasse fährt gegen den ersten der nächsten Klasse im gleichen
  Boot. Ein Dummy nur, wenn der Pool des Bootstyps ungerade ist.
- **An:** Jede ungerade Klasse bekommt am Ende einen eigenen Dummy.

In beiden Fällen bleiben die Klassen zusammen. „Reihenfolge nach Startnummer“ ordnet die Klassen nach
ihrer kleinsten Nummer und innerhalb der Klasse nach Nummer. **Das ändert die Paarung gegenüber heute**,
wenn Nummern verschiedener Klassen abwechselnd liegen: Bisher wurde der Pool dann nur nach Nummer
sortiert und mehrfach gemischt.

Die Verzahnung der Blöcke ändert sich nicht. Anzupassen sind außerdem:

- `parallelOrderIds` in `src/lib/running.ts` muss die Option mitgeben, sonst passen die klassischen
  Nummern nicht zum Plan.
- `kleinDummy`/`grossDummy` werden zu Anzahlen, auch im Text-Export und in der Anzeige.
- Lastenheft: LH-31, LH-32a und LH-33 anpassen, ein Akzeptanzkriterium und Tests dazu.

### 6.2 Verzahnung: Plan im Einstellungs-Link

`src/lib/fehlerpunkteLink.ts` schickt im internationalen Modus zusätzlich den Vorlauf-Plan. Das
Feld `q` enthält je Runde die Blöcke, jeder Block seine Starts als `A-B`, ein Dummy ist `*`:

```json
{ "q": { "v": ["E01-E02,401-402,E02-E01,402-401", "E03-*,*-E03"] }, "qk": "E123" }
```

- Die Nummern sind dieselben wie in `n` (klassisch, wenn aktiv).
- `qk` nennt die Klassen im kleinen Boot, damit das Fehlerpunkte-Tool die weiteren Runden bilden
  kann (Klasse 4 kann ausnahmsweise klein fahren).
- Namen bleiben wie bisher außerhalb des Links.

### 6.3 Fehlerpunkte-Tool: Pläne je Runde

- **Vorlauf:** aus dem Link. Fehlt er, wird der Plan aus den Startnummern je Klasse gebildet (nach
  Klasse, nicht streng).
- **Halbfinale und Finals:** Dieselbe Logik wie `buildParallelPlan` wird als `src/lib/parallelPlan.ts`
  übernommen, mit denselben Testfällen in beiden Projekten. Innerhalb einer Klasse zählt die
  Startnummer: Die Paare entstehen aufsteigend (1. gegen 2., 3. gegen 4.), die kleinere Nummer
  beginnt auf A. So war es 2025 in allen drei Runden.
- **Festschreiben:** Halbfinale und Finals entstehen per Knopf und werden gespeichert. Ändert ein
  Protest später die Qualifikation, zeigt das Tool eine Warnung und ändert keine bereits gedruckten
  Listen von selbst. Neu erzeugen ist möglich, solange die Runde keine Eingaben hat, danach nur nach
  Rückfrage.
- **Voraussetzung:** Weil die Listen klassenübergreifend sind, geht der Knopf erst, wenn der Vorlauf
  aller Klassen vollständig ist. Das Tool nennt, wer noch fehlt.

## 7. WKR-Listen im Parallelslalom

### 7.1 Aufbau

Je Runde, Parcours und Position ein Blatt, also 6 Blätter je Runde mit Zeit, Steg und Fahrweg aus
`aufbauten/parallel.yaml`. Die Spalten bleiben, vorne kommen Start, Klasse und Attempt hinzu:

```
Vorlauf · Parcours A                  Vorlauf · Parcours B
Start  Nr.  Klasse  Attempt           Start  Nr.  Klasse  Attempt
1      E01  Dolphin 1                 1      E02  Dolphin 1
2      401  4       1                 2      402  4       1
3      E02  Dolphin 2                 3      E01  Dolphin 2
4      402  4       2                 4      401  4       2
- - - - - - - - - - - - -             - - - - - - - - - - - - -
5      E03  Dolphin 1                 5      Dummy
6      Dummy                          6      E03  Dolphin 2
```

- **Zeile n auf A und B ist derselbe Start**, auf allen sechs Listen.
- **Blockende:** gestrichelte Linie, dazu jede zweite Zeile grau, wie 2025.
- **Dummy:** graue Zeile ohne Eingabe, damit die Zeilen deckungsgleich bleiben. Die Eingabe überspringt
  sie.
- **Keine Leerzeilen:** Jede Zeile ist ein fester Start. Änderungen laufen über den Plan.
- **Kopf:** Veranstaltung, Runde, Parcours, Listentyp, Seite. Die Klasse steht je Zeile.
- **QR-Code:** `bogenPayload` nennt Runde und Parcours statt Klasse und Lauf.

### 7.2 Seitentrennung

Die Einstellungen „Zeilen/Seite“ und „Teilen ab“ gelten weiter, ebenso die automatische Aufteilung:

- Eine Seite endet **nur am Blockende**. So stehen beide Versuche eines Paars auf derselben Seite.
- Alle sechs Listen einer Runde teilen **dieselben Seiten**: Seite 1 umfasst überall dieselben Starts.
  Bei automatischer Aufteilung gilt deshalb die kleinste Kapazität der Listen dieser Runde.
- Der Laufzettel (`lib/laufzettel.ts`) entsteht je Runde statt je Klasse und Lauf, mit einer Checkbox
  je Parcours, Liste und Seite. Daran sieht man, welche Seiten schon zurück sind.

### 7.3 Eingabe im laufenden Wettkampf

Die Eingabemaske bleibt `SheetPage`; Enter geht in der Startreihenfolge weiter. Sobald eine Seite
eingetragen ist, zeigen die Ergebnislisten den Stand: Wer beide Versuche hat, bekommt einen Platz, wer
noch einen offenen Versuch hat, steht ohne Platz am Ende. Eine Disqualifikation wirkt sofort.

### 7.4 Echte Versuche

Gespeichert wird je Runde, Parcours und Startnummer, also das, was auf dem Blatt steht. **Der frühere
Start eines Starters im Plan ist sein 1. Versuch.** Das gilt für jede Reihenfolge. Ändert sich der
Plan, bleiben die Werte gültig und nur die Zuordnung der Versuche wird neu berechnet.

### 7.5 Ergebnisse nach Attempt oder nach Parcours

Die Checkbox „Ergebnisse nach Parcours“ (`ergebnisNachParcours`, Standard aus, im Einstellungs-Link)
ändert nur die Darstellung der Parallel-Ergebnisse in allen Runden:

| | Aus (Standard) | An |
|---|---|---|
| Gruppen | 1. Attempt, 2. Attempt | Racecourse A, Racecourse B |
| Zusatzspalte | Course | Attempt |
| Platz auf der Detailseite | je Versuch, mischt A und B | je Parcours |

- **Jederzeit umstellbar:** Gespeichert wird immer je Runde, Parcours und Startnummer (§7.4). Beim
  Umschalten wird nichts umgerechnet oder verschoben, Zeiten und Fehlerpunkte erscheinen nur in der
  anderen Gruppe. Hin und zurück ergibt wieder dieselbe Liste.
- **Keine Wirkung auf die Wertung:** Summe, Platz und Punkte hängen nicht von der Gliederung ab, auch
  nicht der bessere Einzelversuch bei Gleichstand.
- **Nicht betroffen:** die WKR-Listen (immer je Parcours mit Spalte Attempt) und das Manövrieren (nur
  ein Parcours).

## 8. Manövrieren

Bleibt in der bestehenden Struktur: je Klasse die Listen des Aufbaus. Bei UIM gibt es nur Lauf 1
und 2, beschriftet als „Attempt“ (deutsch „Versuch“). Die Checkbox „Schon ab zwei Läufen streichen“
gilt nur für die DM und entfällt hier.

**Checkbox „Versuche direkt nacheinander“** (`versucheNacheinander`, nur bei UIM sichtbar, Standard
aus, im Einstellungs-Link):

- **Aus:** wie heute je Klasse und Versuch ein Blatt; zwischen den Versuchen hängt der Aushang.
- **An:** je Klasse ein Blatt mit zwei Zeilen je Starter:

  ```
  Nr.  Attempt
  401  1
  401  2
  - - - - - -
  402  1
  402  2
  ```

Die Werte stehen in beiden Fällen unter demselben Lauf, das Umschalten verliert also nichts. Die
Bogen-Auswahl fasst die Läufe zusammen, ähnlich wie `withoutLaufRepeats`. Eine Seite trennt nie die
zwei Zeilen eines Starters. Knoten bleiben einmal je Starter. Die Ergebnislisten bleiben gleich, nur
der Zwischenaushang entfällt. Die Startreihenfolge in der Verzahnung ändert sich nicht.

## 9. Wertung

Das Regelwerk wählt die Wertung (`wertung: uim` in `regelwerke/uim-2026.yaml`, dort auch die
Punkteskala). Alle Punkte bleiben ganze Hundertstel wie in `lib/ergebnis.ts`.

**Manövrieren:**

1. Ergebnis = besserer gültiger Versuch plus Knotenstrafen.
2. Sortiert nach Ergebnis, bei Gleichstand nach der Summe beider Versuche. Wer nur einen gültigen
   Versuch hat, steht dahinter.
3. Beide disqualifiziert: `disq.`, gemeinsamer letzter Platz, keine Punkte.

**Vorlauf:**

1. **Gewertet** (beide Versuche gültig) nach Summe, bei Gleichstand nach dem besseren Einzelversuch.
2. Dahinter **Disqualifizierte** nach ihrem gültigen Versuch, zuletzt die ohne gültigen Versuch, mit
   fortlaufenden Plätzen und ohne Punkte. Der Versuch und die Summe stehen als `disq.` in der Liste.
   „Nicht gestartet“ (X) zählt wie eine Disqualifikation.
3. Zuletzt **Offene** ohne Platz.
4. Die besten 4 Gewerteten je Klasse bekommen „Qualified“ und ihre Punkte erst aus den Finals. Ab Platz
   5 gelten die Punkte des Vorlaufs.

**Weiterkommen nach der Zahl der gewerteten Starter:**

| Gewertet | Ablauf |
|---|---|
| 4 oder mehr | Halbfinale mit 4, dann Finale und kleines Finale |
| 3 | Halbfinale mit Dummy, 1./2. ins Finale, der Dritte hat Platz 3 ohne kleines Finale |
| 2 | direkt ins Finale |
| 1 | Platz 1 aus dem Vorlauf |

**Halbfinale und Finals:** Sortiert nach Summe, bei Gleichstand nach dem besseren Einzelversuch.
Disqualifizierte stehen als Letzte der Runde dahinter, untereinander nach ihrem gültigen Versuch, und
behalten die Punkte des Platzes. Wer im Halbfinale disqualifiziert wird, fährt als Letzter der
Runde im kleinen Finale.

**Stechen:** Bleibt nach 5.2.6 ein Gleichstand an einer Grenze zum Weiterkommen, sperrt das Tool den
Knopf und meldet es. Das Stechen ist eine weitere Runde mit demselben Listenmechanismus; es zählt nur
seine Zeit. Im Finale oder ab Platz 5 bleibt ein Gleichstand stehen.

**Stufenergebnis Parallelslalom:** Plätze aus den Finals, danach der Vorlauf. Als Zeit zählt die Summe
der Runde, die den Platz bestimmt hat, bei einer Disqualifikation steht dort `disq.`.

**Einzelwertung:** Summe der Punkte; Gleichstand nach 5.2.6 mit den Zeiten aus dem Stufenergebnis. Wer
in einer Stufe `disq.` hat, steht bei Punktgleichheit hinter denen mit beiden Zeiten.

**Länderwertung:** Je Land mit mindestens 5 Fahrern die 5 besten Punktzahlen; Gleichstand nach 5.2.6.

## 10. Ergebnislisten

In dieser Reihenfolge, wie im PDF der WM 2025. Alle Bezeichnungen laufen über `config/sprache.ts`
und folgen der gewählten Sprache; für internationale Wettkämpfe ist das Englisch. Jede Liste trägt den
Stand und eine Unterschriftszeile für den O.O.D.

| Liste | Je | Spalten |
|---|---|---|
| Result (Länder) | Land | Class, Place, No., Surname, Forename, Country, Points, Top 5, Summe, Country Place |
| Result (Einzel) | Klasse | Place, No., Surname, Forename, Country; Manoeuvring: Time, Place, Points; Parallel slalom: Time, Place, Points; Points. Eine Disqualifikation steht als `disq.` in der Spalte Time. |
| Legende | Regelwerk | besteht schon |
| Pilots | Wettkampf | No., Surname, Forename, Country, Birthday, Class |
| Manoeuvring: 1. und 2. Attempt | Klasse | nach Platz; Place, No., Name, Country, Time, Points, die Fehlerspalten, disq., total points, Error Code |
| Manoeuvring: Result | Klasse | Place, UIM, No., Name, Country; je Attempt Time, Penalties, Total, Place; Total, Knots, Total |
| Racecourse A und B | Runde | Startlisten: No., Surname, Forename, Country, Class, Ballast; Blockende markiert, Dummy sichtbar |
| Parallel slalom: Attempts (§7.5: oder Racecourse A/B) | Runde und Klasse | zwei Tabellen „1. Attempt“ und „2. Attempt“, nach Startnummer; Place, No., Surname, Forename, Country, **Course**, Time, Points, Pon. dep., Start, B1 bis B5 bis B1, Finish, Pon. arr., disq., total errors, total points, Error Code |
| Parallel slalom: Result (§7.5: oder Racecourse A/B) | Runde und Klasse | Place, UIM, No., Surname, Forename, Country; je Attempt **Course**, Time, Time points, Penalties, Total points; total points; Hinweis (Qualified, 1st & 2nd, 3rd & 4th, 1st bis 4th) |

Die alten Listen enthalten Excel-Reste, die neu entfallen: die 999,00 samt Summen darüber und ihrer
Fußnote, „Gesamt“, „gef. Zeit“, „Ergebnis“, „Seite 1 von 2“ in englischen Listen und Zeiten mit „0,00“.

## 11. Daten und Code

**Zustand (`AppState`):**

```ts
type Runde = 'vorlauf' | 'halbfinale' | 'kleinesFinale' | 'finale' | 'stechen'
type Parcours = 'A' | 'B'

interface ParallelStart { a: string | null; b: string | null } // null = Dummy
type ParallelPlan = ParallelStart[][]                          // Blöcke mit ihren Starts

parallelPlaene: Partial<Record<Runde, ParallelPlan>>
kleinBootKlassen: ClassId[]
versucheNacheinander: boolean
ergebnisNachParcours: boolean
```

**Eingaben:** Der Lauf-Schlüssel wird für den Parallelslalom zu `parallel/<runde>/<parcours>`, die Zeile
bleibt die Startnummer. `zerlegeLauf`, `bereinigeEingaben` und `listenUmziehen` müssen beide Formen
kennen. Alte Werte unter `parallel/<klasse>/<lauf>` lassen sich keinem Parcours zuordnen und werden
nicht übernommen.

**Bögen:** `Bogen` bekommt eine zweite Form mit `runde` und `parcours` statt `klasse` und `lauf`. Rund
25 Dateien lesen heute `klasse` oder `lauf`; dort entscheidet der Typ, was gilt. Auch der
Bogen-Teil des Einstellungs-Links (`typeId:klasse:lauf`) braucht eine zweite Form.

**Zeilen eines Bogens:** Eine neue Funktion `bogenZeilen(state, bogen)` liefert die Zeilen samt
Startnummer, Klasse, Versuch, Blockende und Dummy-Kennung. `SheetPage`, `sheetModel` und die
PDF-Wege nutzen sie, statt `numbers[klasse]` direkt zu lesen. Weil eine Zeile bei
`versucheNacheinander` zu ihrem eigenen Lauf gehört, liest und schreibt `bogenLeser` je Zeile. Beide
neuen Listenformen hängen an dieser Funktion.

**Seiten:** `pageChunks` bekommt Gruppen (Block oder Starter), die nie getrennt werden.

**Prüfen:** Die Spalten der Parallel-Listen dürfen nicht von der Klasse abhängen, weil ein Blatt alle
Klassen enthält (`defFuerKlasse`, `columnsForClass`). Das gehört in `config/validate.ts`.

**Starterdaten:** `Starter` bekommt `land`, `ballast` und optional `geburtsdatum`. Die Namensliste
(`parseStarter`) nimmt sie als weitere Spalten: `Nr; Name; Vorname; Land; Ballast; Geburtsdatum`. Die
Trennung nur mit Leerzeichen bleibt bei drei Spalten. Die Daten bleiben lokal und kommen nicht in den Link.

**Nur bei UIM:** Das Regelwerk nennt seine Disziplinen (`disziplinen: [manoevrieren, parallel]`, DM nur
`manoevrieren`). Bei einem Wechsel zur DM springt ein gewählter Parallel-Aufbau auf den Standard, die
Werte bleiben gespeichert. Bestehende Tests, die `parallel` unter der DM nutzen, ziehen auf UIM um.

**Neue Module:**

- `lib/parallelPlan.ts`: Paare, Blöcke und die Pläne der weiteren Runden
- `lib/uimWertung.ts`: Stufen, Einzel- und Länderwertung
- Vue-Komponenten für die Listen aus §10; die vorhandenen `Ergebnis*`-Komponenten dienen als Vorbild
- Ein Bereich „Parallelslalom“ in `ControlPanel`: Herkunft des Plans, Stand je Runde, Knöpfe, Warnungen

**Einstellungs-Link:** neue Felder `q` (Pläne je Runde), `qk`, `v` (`versucheNacheinander`) und `pa`
(`ergebnisNachParcours`).

**Beispielwerte:** `lib/beispielwerte.ts` nutzt schon eigene Kennzahlen der WM 2025 für das Manövrieren
nach UIM und den Parallelslalom. Es füllt heute aber Bögen je Klasse und Lauf. Mit den neuen Listen muss
es je Runde und Parcours füllen. Dann lässt sich auch der Unterschied zwischen A und B aus §5 abbilden.

## 12. Annahmen

Diese Punkte lassen sich leicht ändern:

1. Bleibt ein Gleichstand bestehen, teilen sich die Starter den Platz, jeder bekommt die vollen Punkte
   dieses Platzes, der nächste Platz entfällt. Das Rulebook nennt nur das „dead-heat result“.
2. Bei Gleichstand in der Einzelwertung zählen für Finalisten die Zeiten der Runde, die ihren Platz
   bestimmt hat. Das Rulebook sagt nur „both attempts“. In den fünf Fällen von 2025 ändert das nichts.
3. Fehlercodes und Disq-Buchstaben bleiben wie in `regelwerke/uim-2026.yaml`, obwohl die Legende von 2025
   abweicht (4. Versuch dort B, hier D; Bumping dort 7, hier 9).
4. Wer im Halbfinale disqualifiziert wird, fährt im kleinen Finale (§9). Bei 3 Gewerteten hat der Dritte
   Platz 3 ohne kleines Finale, bei 1 Gewertetem gilt Platz 1 aus dem Vorlauf. Das folgt aus den
   Entscheidungen in §3, steht aber nicht im Rulebook.
5. Die Checkbox „Versuche direkt nacheinander“ ändert nur die WKR-Listen, nicht die Ergebnislisten (§8).

## 13. Umsetzung in Schritten

Jeder Schritt ist einzeln nutzbar und endet mit Tests auf erfundenen Daten.

1. **Verzahnung:** strenge Klassentrennung (§6.1), Plan im Link (§6.2).
2. **Manövrieren nach UIM:** Wertung und Punkte, Result-Liste, nur zwei Versuche, Checkbox „Versuche
   direkt nacheinander“, Parallelslalom nur bei UIM, Starterdaten.
3. **Startplan und WKR-Listen des Vorlaufs:** Pläne im Zustand, `bogenZeilen`, Seitentrennung,
   Laufzettel, Eingabe, Startlisten, Beispielwerte je Runde und Parcours.
4. **Vorlauf-Ergebnis:** echte Versuche, Attempts- und Result-Liste, Checkbox „Ergebnisse nach Parcours“
   samt Test, dass Umschalten hin und zurück dieselben Werte zeigt, Disqualifikation, Qualifikation.
5. **Halbfinale und Finals:** Knöpfe, Festschreiben, Warnungen, weniger als 4 Starter, Stechen.
6. **Gesamt:** Einzel- und Länderwertung, Pilots-Liste, Unterschriftszeile.

**Abnahme:** Nach den Schritten 2, 4, 5 und 6 wird die WM 2025 im Scratchpad nachgerechnet und mit dem
PDF verglichen; die Kopien werden danach gelöscht. Erwartete Abweichungen: die Versuchs-Zuordnung im
Parallelslalom, die Reihenfolge bei den Gleichständen und die Spalte der Anlegefehler aus §5 sowie die
Excel-Reste aus §10.

**Zum Schluss:** Lastenheft dieses Projekts (§8f, §12: der Hinweis auf den fehlenden Regeltext entfällt)
und der Verzahnung sowie die READMEs nachziehen.
