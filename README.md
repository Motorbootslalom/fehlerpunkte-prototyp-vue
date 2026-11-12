# Fehlerpunkte - Motorbootslalom (Prototyp)

**Live-Demo:** _(nach Deploy)_ <https://motorbootslalom.github.io/fehlerpunkte-prototyp-vue/>

Interaktiver Konzept-**Prototyp** für die **Eingabemasken der
Wettkampfrichter-Fehlerpunktlisten** (WKR-Listen) beim Motorboot-/Schlauchboot­slalom.
Schwesterprojekt zu *verzahnungs-prototyp*.

Ziel: mit den Fachteams abstimmen, wie eine Eingabemaske für Fehlerpunkte aussehen
kann, und das anderen Entwicklern anschaulich erklären. Kernidee (wie bei der
bisherigen Excel-Lösung): **Eingabe und Ausdruck sind dieselbe Ansicht** - so ist
die Kontrolle der Eintragungen extrem einfach.

Die ausführlichen Anforderungen stehen im **[Lastenheft](./LASTENHEFT.md)**, das Konzept für
einfachere WKR-Positionen und eigene Aufbauten in **[KONZEPT-POSITIONEN.md](./KONZEPT-POSITIONEN.md)**.

Die Startnummern sind Demo-Daten, Namen trägst du für die Ergebnislisten selbst ein. Alle
Eingaben und Namen bleiben ausschließlich **lokal im Browser** (localStorage) und überleben
ein Reload.

## Funktionen

- **Aufbauten (Setups)** für verschiedene Austragungsorte: Alcatraz, Alcatraz-DM26, Frontal,
  Berlin, Baden-Württemberg, Möwe (Oranienburg) und Parallelslalom. Die Positionen stehen in
  **Kurzform** (per YAML, siehe unten): welche Bojen und Aufgaben sie beobachten und von wo
  aus. Spalten, Reihenfolge, Trennlinien, Abblendung im Bild und Drehung folgen aus dem
  Fahrweg.
- **Eigene Aufbauten mit Assistent:** Positionen anlegen, per Klick in der Tabelle oder mit
  einer Freihandlinie im Parcoursbild zuordnen, welche Bojen sie beobachten, die Bögen darunter
  zeigen den Entwurf live. Eigene Aufbauten bleiben im Browser, reisen im Einstellungs-Link mit
  und lassen sich als YAML speichern und laden ([Lastenheft §8h](./LASTENHEFT.md)).
- **WKR-Einteilung:** Namen je Liste einmal für alle Klassen und Läufe eintragen, bei zwei
  Parcours je Parcours mit Aufteilung der Klassen. Ein Name direkt auf einem Bogen geht vor
  ([KONZEPT-NAMEN-FREIHAND.md](./KONZEPT-NAMEN-FREIHAND.md)).
- **Kursvarianten:** eigene Parcoursbilder je Klasse für einen Austragungsort, z. B. der
  Möwe-Parcours mit anders herum laufender Speedrunde.
- **Zeitnahme mit Gerät:** elektronische Zeiterfassung und Stoppuhren je Liste; in der
  Ergebnisliste gilt die elektronische Zeit, ohne sie der Mittelwert der Stoppuhren.
- **WYSIWYG:** Bildschirm-Eingabemaske = Druckansicht. Zellen sind direkt
  beschreibbar.
- **Automatische Summen (Σ):** Bojenberührungen × 5 bzw. Fehlercodes → Punkte
  laut Legende, laufend aufsummiert. Bei Mann-über-Bord/Schikane liegt die
  Σ-Spalte bewusst mittig.
- **Mehrere Regelwerke und Versionen** (DM 2026, UIM 2026), UIM wahlweise englisch
  oder zweisprachig, dazu eine **A4-Legende** aller Codes und Strafen.
- **Disqualifikation verorten:** Codes in der Disq.-Spalte **oder** direkt in
  einer Tor-Spalte (dokumentiert Ort und Grund).
- **Schnelle Zeiteingabe** über das Numpad: eine Zahl mit Komma/Punkt, Regel
  „≥ 20 = Sekunden, < 20 = Minuten“; Enter springt weiter; Anzeige normalisiert
  auf `mm:ss,00 (ss,00)`.
- **Ergebnislisten** nach dem Vorbild der DM: je Lauf nach Startnummer und nach Platz, auf
  Wunsch die Gesamtliste mit Knoten und gestrichenem Lauf ([Lastenheft §8f](./LASTENHEFT.md)).
- **Beispielwerte:** füllt die angezeigten Bögen mit glaubhaften Zufallswerten nach der
  Statistik der DM 2026 oder, nach UIM und im Parallelslalom, der WM 2025, wahlweise mit
  Stoppuhr- oder Lichtschranken-Zeiten
  ([Lastenheft §8g](./LASTENHEFT.md)).
- **Parcoursbilder** (SVG) je Klasse auf den Tor-/Parcours-Bögen, abgeblendet auf das, was die
  Position beobachtet. Für eigene Aufbauten erzeugt sie der Browser mit demselben Code wie der
  Build.
- **QR-Codes** auf jeder Druckseite und jedem Laufzettel (Regelwerk, Aufbau, Klasse,
  Lauf, Position, Seite). Ein Handscanner oder das Feld „Blatt scannen“ zeigt damit
  genau die passenden Listen ([Lastenheft §9](./LASTENHEFT.md)).
- **Export:** Browser-Druck → „Als PDF“ (empfohlen). Zum Vergleich liegen unter „Weitere
  PDF-Wege“ das Raster-PDF (html2canvas + jsPDF), zwei Vektor-PDF-Generatoren (pdfmake und
  jsPDF + autotable) und die **react-pdf-Insel** (`pdf.html`); dort fehlen die Parcoursbilder
  ganz oder teilweise, weil diese Wege die Bilder in einem anderen Format brauchen.
- **Seitenaufteilung:** Große Klassen kommen auf mehrere A4-Seiten, jede mit
  Legende, Unterschrift und „Seite n / X“. Standard („Zeilen / Seite“ = 0) ist
  **automatisch**: Die Vorschau misst, was auf ein Blatt passt (mit 5 mm
  Sicherheitsreserve für den Druck mit Standard-Rändern), und teilt zu große
  Bögen gleichmäßig in 5er-Schritten (24 → 15 + 9, 58 → 20 + 20 + 18); kostet
  das Aufrunden eine Seite, wird nur gleichmäßig geteilt (20 → 7 + 7 + 6).
  Ein fester Wert übersteuert das; „Teilen ab“ teilt dann erst ab einer
  Mindestzahl Starter (z. B. 15 / 25). Ergäbe ein fester Wert eine Seite, die
  nicht aufs Blatt passt, wird automatisch geteilt; ohne Messung warnt die
  Vorschau mit roter Seitenende-Linie.
- **Bögen zusammenstellen:** Listentyp, Klasse und Lauf je Bogen wählen,
  sortieren, hinzufügen/entfernen; Startnummern editierbar. Die
  **Schnellauswahl** legt ganze Gruppen an (kompletter Lauf, eine Position für
  alle Klassen, eine Klasse für alle Listen) - in einer frei wählbaren
  **Klassen-Reihenfolge** (z. B. `1, 3, E, 2, 5, 7, 4, 6`; nicht genannte Klassen
  werden ausgelassen, ↻ hängt sie wieder an) und wahlweise für **alle Läufe**:
  erst Lauf 1 komplett, dann Lauf 2 in derselben Reihenfolge usw.

## Bedienung

Links die Steuerleiste (nur am Bildschirm, im Druck ausgeblendet):

1. Regelwerk, Aufbau und Veranstaltungsnamen setzen. Passt kein Aufbau, mit
   **✏ Eigenen Aufbau anlegen** einen zusammenstellen (Vorlage, Positionen, Blick, Zuordnung).
2. Unter **Bögen** die gewünschten Listen zusammenstellen (Typ/Klasse/Lauf).
3. In den Bögen rechts die Werte eintragen - Σ und Zeiten aktualisieren sich live.
4. **Drucken / Als PDF** (die übrigen PDF-Wege stehen zum Vergleich unter „Weitere PDF-Wege“).
5. Unter **Ergebnislisten** die Listen ansehen und drucken; unter **Listen** die Läufe, die
   Läufe mit Gesamtliste oder nur die Gesamtliste wählen. Namen kommen aus **Namen der
   Starter**, Knoten aus der Knoten-Liste (unter **Bögen** wählbar).

Eigene Aufbauten gibt man per **Einstellungs-Link** oder **Aufbau als YAML speichern** weiter;
**Eigenen Aufbau laden (YAML)** prüft eine Datei, bevor sie übernommen wird. Eine gespeicherte
Datei passt unverändert nach `src/config/aufbauten/` (Eintrag in `aufbauten.yaml`).

Die Eingaben stehen je Disziplin, Klasse, Lauf und Startnummer, unabhängig von der
Bogen-Auswahl. Beim Wechsel von Aufbau oder Regelwerk bleiben sie in den entsprechenden
Feldern; was danach nicht mehr gilt, wird gelöscht. Parallelslalom und Manövrieren haben
getrennte Werte (siehe [Lastenheft §8e](./LASTENHEFT.md)). **Alles zurücksetzen** leert auch
den Speicher im Browser, die eigenen Aufbauten bleiben.

## PDF-Export - vier Wege zum Vergleich

Es gibt **zwei Einstiegspunkte** (Multi-Page-Build): die Vue-Eingabemaske
(`index.html`) und die react-pdf-Insel (`pdf.html`).

| Weg | Seite | Vektor | Parcoursbild | Anmerkung |
| --- | ----- | :----: | :----------: | --------- |
| **Browser-Druck → „Als PDF"** (empfohlen) | `index.html` | ✅ | ✅ | Scharfer, markierbarer Text inkl. QR; Dateiname über `document.title`. WYSIWYG. |
| **Raster-Download** (html2canvas + jsPDF) | `index.html` | ✖ (Bild) | teilweise | Ein-Klick, aber gerastert; QR als Canvas neu gezeichnet. Im Browser erzeugte Bilder ungeprüft. |
| **Vektor-PDF pdfmake** | `index.html` | ✅ | ✖ | Ein-Klick-Download, deklaratives Layout, eingebauter Vektor-QR. Vereinfachtes Layout. |
| **Vektor-PDF jsPDF + autotable** | `index.html` | ✅ | ✖ | Ein-Klick-Download, Tabelle via autotable, Vektor-QR (gezeichnete Rechtecke). Vereinfachtes Layout. |
| **react-pdf-Insel** | `pdf.html` | ✅ | teilweise (PNG) | Live-Vorschau + Ein-Klick-Download, wiederholter Kopf/Spaltenkopf (`fixed`), eingebettete Schrift (korrektes „Σ"). Im Browser erzeugte Bilder per Canvas gerastert, ungeprüft. |

**Vereinfachtes Layout** bei pdfmake/jsPDF heißt: ein Kopf je Blatt-Spalte
(Bojen-Unterspalten als „Tor 1 H R" ausgeschrieben) statt der zweizeiligen
Gruppenköpfe, Querformat, ohne Parcoursbild. Für die pixelgenaue WYSIWYG-Ausgabe
sind **Browser-Druck** oder die **react-pdf-Insel** gedacht.

> **Fazit aus dem Vergleich:** Die beiden clientseitigen Generatoren
> (**pdfmake**, **jsPDF + autotable**) liefern **keine überzeugenden Ergebnisse** -
> das Bogen-Layout müsste man dort mühsam nachbauen und bleibt trotzdem hinter der
> WYSIWYG-Ansicht zurück. Genau dafür ist der Prototyp da: Er zeigt anschaulich,
> dass **Browser-Druck** (empfohlen) und die **react-pdf-Insel** die besseren
> Varianten sind. pdfmake/jsPDF bleiben nur als Anschauungs-/Vergleichsobjekt
> erhalten.

In der Bedienleiste stehen alle Wege außer dem Browser-Druck hinter dem Klapptext „Weitere
PDF-Wege“, mit dem Hinweis auf die fehlenden Parcoursbilder.

Alle Wege speisen sich aus derselben aktuellen Zusammenstellung. pdfmake und
jsPDF teilen sich ein framework-agnostisches, „headless" **Sheet-Modell**
(`src/lib/sheetModel.ts` - dieselbe Spalten-/Zeilen-/Σ-Logik wie die Vue-Ansicht).

### Die react-pdf-Insel (`pdf.html`)

`@react-pdf/renderer` ist React-spezifisch; deshalb läuft dieser Weg als
**Insel**: ein eigener Einstiegspunkt mit eigenem React-Root, gekoppelt an die
Vue-App **nur über den gemeinsamen localStorage** (die Vue-App schreibt den Stand
inkl. eingetragener Werte, die Insel liest ihn beim Laden über denselben
`buildInitialState()`; Änderungen also im Haupt-Prototyp machen, dann `pdf.html`
neu laden). Umgesetzt über Vite-Multi-Page mit **beiden** Plugins
(`@vitejs/plugin-vue` + `@vitejs/plugin-react`, letzteres nur auf `pdf-main.tsx` +
`src/pdf/*` beschränkt) und einen winzigen Read-only-React-Store
(`src/pdf/reactStore.tsx`); `SheetsDocument`/`courseImages`/`Qr` sind unverändert
aus dem React-Prototyp übernommen.

### Ausblick Integration (dmj-ms11)

Bei einer späteren Übernahme in die Vue-Software **dmj-ms11** wäre die Insel nicht
mitzunehmen; dort ist **Puppeteer im Backend** (bereits vorhanden) der saubere
Weg: dieselbe WYSIWYG-Druck-CSS serverseitig zu Vektor-PDF rendern, ohne zweites
Framework und ohne Layout-Duplizierung.

Die Parcoursbilder liegen als **SVG** (Bildschirm/Browser-Druck) und **PNG**
(für die react-pdf-Insel, die kein SVG einbetten kann) vor.
`public/parcours/alcatraz_Parcours` ist eine Kopie aus dem Repository
`Motorbootslalom/Parcours` (`parcours.svg`, per `make` nach `dist/alcatraz_Parcours`
exportiert). Änderungen, auch an IDs, gehören dorthin.

## Konfiguration (Positionen & Fehlerpunkte)

Listen, Spalten und Fehlerpunkte sind **datengetrieben** und liegen als
YAML-Dateien unter `public/config/` (werden zur Laufzeit geladen - Änderung
wirkt nach dem Neuladen der Seite, ohne Neubau). Gepflegt werden sie unter
`src/config/`:

- **`regelwerke.yaml`** - Liste der Regelwerke (Menü-Reihenfolge, der erste ist
  der Standard).
- **`regelwerke/<id>.yaml`** - je **Regelwerk und Version** (z. B. `dm-2026`,
  `uim-2026`) die Disqualifikationen, Fehler-Kataloge, Klassen und Texte aus der
  **Ausschreibung**. Neue Version: Datei kopieren, `id` und `version` anpassen, in
  `regelwerke.yaml` eintragen. Mit `sprachen: [de, en]` lassen sich die Listen
  zusätzlich englisch oder zweisprachig ausgeben; `npm run config:check` meldet
  dann jede fehlende Übersetzung.
- **`aufbauten.yaml`, `aufbauten/*.yaml`, `einstellungen.yaml`, `i18n/*.yaml`** -
  der Build (`npm run config:sync`) führt sie zu einer Datei
  `public/config/positionen.yaml` zusammen. Neuer Austragungsort: Datei unter
  `aufbauten/` anlegen und in `aufbauten.yaml` eintragen. Enthalten sind die
  **orts-/personenabhängigen Positionen** (welche
  Liste, welche Spalten in welcher Reihenfolge, welches Bild/Drehung). Positionen
  binden Kataloge und wiederverwendbare **Hinweise** per Verweis (ID) ein.
  Positionen sind zu **Aufbauten (Setups)** gebündelt (z. B. `Alcatraz`, `Frontal`);
  ein Aufbau enthält alle genutzten Listen. Gemeinsame Listen (Zeit, Knoten, …)
  werden geteilt, nur die Tor-Positionen unterscheiden sich je Aufbau. In der
  Bedienleiste wählt man den Aufbau; das erzeugt dessen Bögen neu, die Eingaben bleiben in
  den entsprechenden Feldern. **Disziplinen** (`disziplinen`, z. B. Manövrieren und
  Parallelslalom) trennen die Eingaben und legen die Spalten der Ergebnislisten fest.

**Kurzform:** Eine Position ohne `spalten` nennt nur, was sie beobachtet und von wo aus
([Konzept §4](./KONZEPT-POSITIONEN.md)):

```yaml
- id: gate135
  titel: "Tor 1 / 3 / 5"
  blick: hinten            # hinten | vorne | rechts | links
  bojen: [StartZiel_unten, Tor1, Tor3, Tor5_unten, Speedboje_unten]
  aufgaben: [tor5]         # zeit | tor5 | mueb | parcours
  bild: alcatraz_I         # Ordner der erzeugten Bilder (Standard: die id)
```

`src/config/kurzform.ts` leitet daraus die ausführliche Form ab; jedes ihrer Felder darf
zusätzlich stehen und gewinnt dann. Kurzformen dürfen auch direkt im Aufbau stehen.
`public/config/positionen.yaml` enthält die Kurzform, App und Bildgenerator schreiben sie beim
Laden aus. Ein Test hält fest, dass die Kurzform dieselben Felder und Bilder ergibt wie die
früher handgeschriebenen Listen. **Kursvarianten** (`kurse`, am Aufbau `kurs`) geben einem
Austragungsort eigene Parcoursbilder je Klasse; **Zeitnahme** über `zeiten` an der Position
oder als Abwandlung im Aufbau (`{ id: zeit, zeiten: [elektronisch] }`).

Wichtige Felder der ausführlichen Form: `spalten` (Reihenfolge/Typen), `katalog`
(Verweis auf einen Fehler-Katalog), `hinweis` (Verweis auf einen Hinweistext),
`disq: alle | keine | <Bereich>` (welche Disqualifikationen auf der Liste stehen;
die Buchstaben nennen im Regelwerk ihre `bereiche`: `vorsteg`, `steg`, `parcours`,
`mueb`; bei querliegendem Bild steht die Liste zweispaltig),
`bild` + `bildDrehung: 0 | 90 | -90 | 180` + `bildBreite` (bei ±90° gedrehtem Bild,
in mm) + `bildNeben` (querliegendes Bild neben der Legende).

**Globale Bojen-Kürzel:** Die Seiten-/Richtungskürzel stehen zentral unter
`bezeichnungen` (Token-Map, z. B. `seiteA: R`, `seiteB: L`). In `sub` und in den
Hinweisen werden die Tokens (`hin`, `rueck`, `seiteA`, `seiteB`) als ganze Wörter
ersetzt - so stellt man von Rechts/Links auf Land/See (`L`/`S`) oder Hafen/Kai
(`H`/`K`) an EINER Stelle um; die Spaltenköpfe und der Hinweis ziehen automatisch nach.
Das gilt für die Bögen: Die Ergebnislisten bleiben immer bei R/L.

**Tor 5 mit Parcoursüberwachung:** Bei Aufbauten, die Tor 5 und eine Parcoursliste
haben, kann eine Person beides übernehmen (Option in der Bedienleiste, gesteuert über
`ersetzt` an der Position). Die extra Parcoursliste entfällt dann.

**Überwachungs-Check:** `npm run config:check` prüft je Aufbau und Klasse, ob jede Boje
und jede Aufgabe des Fahrwegs auf einer Liste steht, auch mit zusammengelegten Listen.
Was verlangt wird, steht wie die Spalten der Ergebnisliste nicht mehr eigens in den Dateien
(`ueberwachung: fahrweg`, `ergebnisspalten: fahrweg`), sondern folgt aus dem Fahrweg in
`src/config/kurzform.ts`: Der Kurs steht genau einmal im Code. Die Prüfung zeigt Lücken als Hinweis, ein Test verlangt,
dass jeder Aufbau lückenlos ist.

**Legende als A4-Blatt:** „Nur Legende drucken / Als PDF“ in der Bedienleiste gibt
alle Fehlercodes, Strafen und Disqualifikationen des gewählten Regelwerks auf einem
Blatt aus.

Die gebündelten Kopien unter `src/config/` dienen als Fallback (offline / falls
die Laufzeit-Datei fehlt oder fehlerhaft ist). Beide Prototypen (Eingabe und
Vektor-PDF) nutzen dieselbe Konfiguration.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Produktions-Build nach dist/
npm run preview  # Build lokal ansehen
```

## Tests

Die Kernlogik (Zeit-Parsing, Punkte-/Disq-Berechnung, QR-Codes lesen und schreiben, Kurzform,
eigene Aufbauten, Assistent, Bilder im Browser) und ein UI-Render-Smoke-Test sind mit **Vitest**
abgedeckt.

```bash
npm test            # alle Tests einmal ausführen
npm run test:watch  # Watch-Modus
npm run check       # Typecheck, Tests, Konfigurations-Prüfung - auch im pre-commit-Hook
```

Die Tests laufen automatisch **lokal bei jedem Commit** (Git-Hook
`.githooks/pre-commit`, aktiviert durch `npm install` via `prepare`; manuell:
`git config core.hooksPath .githooks`; Notausgang: `git commit --no-verify`) und
**in der CI** (`.github/workflows/ci.yml`) sowie vor jedem Pages-Deploy.

## Deployment auf GitHub Pages

1. Repository auf GitHub anlegen und pushen.
2. **Settings → Pages → Build and deployment → Source** = **GitHub Actions**.
3. Bei jedem Push auf `main` baut und deployt
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) nach
   <https://motorbootslalom.github.io/fehlerpunkte-prototyp-vue/>.

Der Vite-`base` ist `./`, daher läuft der Build unter Projekt-Unterpfad **und** lokal.

## Assets

`public/parcours/alcatraz_Parcours` stammt aus `../Parcours/dist/alcatraz_Parcours` (SVG
und PNG je Klasse) und wird nicht direkt angezeigt. Die übrigen Ordner unter
`public/parcours/` erzeugt `npm run parcours:build` daraus. Der Generator entfernt dabei den
gestrichelten Rahmen der Quelle, denn die App zieht selbst einen um das Bild. Positionen mit
`bildImBrowser: true` (eigene Aufbauten) haben keinen Ordner: Der Browser erzeugt ihre Bilder
aus der Quelle mit demselben Code (`src/lib/parcoursbild.ts`).

## Tech-Stack

Vue 3 (Composition API, `<script setup>`) · TypeScript · Vite (Multi-Page) ·
qrcode-generator (QR) · html2canvas + jsPDF (Raster) · pdfmake + jsPDF/autotable
(Vektor-PDF) · @react-pdf/renderer (Insel `pdf.html`). Persistenz via localStorage.

Portiert aus dem React-19-Prototyp: die framework-agnostische Logik (`lib/*`,
`config/*` inkl. YAML, Parcours-Skripte, `styles.css`, Tests) wurde unverändert
übernommen, nur Komponenten/Store/Entry sind neu in Vue. Die react-pdf-Vektor-PDF-
Ausgabe läuft als React-Insel (`pdf.html`) weiter (siehe „PDF-Export").
