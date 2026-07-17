# Fehlerpunkte - Motorbootslalom (Prototyp)

**Live-Demo:** _(nach Deploy)_ <https://motorbootslalom.github.io/fehlerpunkte-prototyp/>

Interaktiver Konzept-**Prototyp** für die **Eingabemasken der
Wettkampfrichter-Fehlerpunktlisten** (WKR-Listen) beim Motorboot-/Schlauchboot­slalom.
Schwesterprojekt zu *verzahnungs-prototyp*.

Ziel: mit den Fachteams abstimmen, wie eine Eingabemaske für Fehlerpunkte aussehen
kann, und das anderen Entwicklern anschaulich erklären. Kernidee (wie bei der
bisherigen Excel-Lösung): **Eingabe und Ausdruck sind dieselbe Ansicht** - so ist
die Kontrolle der Eintragungen extrem einfach.

Die ausführlichen Anforderungen stehen im **[Lastenheft](./LASTENHEFT.md)**.

Es werden **keine echten personenbezogenen Daten** verarbeitet; alle Eingaben
bleiben ausschließlich **lokal im Browser** (localStorage) und überleben ein Reload.

## Funktionen

- **Konfigurierbare Positionen** (per YAML, siehe unten): mitgeliefert sind die
  Alcatraz-Listen (Tore 1/3/5, Tore 2/4/5, Tor 5, Mann-über-Bord/Schikane, Steg,
  Zeit, Knoten, Parcours einfach) plus Beispiel-Positionen. Eigene Positionen mit
  anderer Spaltenreihenfolge/Blickrichtung lassen sich frei ergänzen.
- **WYSIWYG:** Bildschirm-Eingabemaske = Druckansicht. Zellen sind direkt
  beschreibbar.
- **Automatische Summen (Σ):** Bojenberührungen × 5 bzw. Fehlercodes → Punkte
  laut Legende, laufend aufsummiert. Bei Mann-über-Bord/Schikane liegt die
  Σ-Spalte bewusst mittig.
- **Disqualifikation verorten:** Codes A-X in der Disq.-Spalte **oder** direkt in
  einer Tor-Spalte (dokumentiert Ort und Grund).
- **Schnelle Zeiteingabe** über das Numpad: eine Zahl mit Komma/Punkt, Regel
  „> 20 = Sekunden, ≤ 20 = Minuten“; Enter springt weiter; Anzeige normalisiert
  auf `mm:ss,00 (ss,00)`.
- **Parcoursbilder** (SVG) je Klasse auf den Tor-/Parcours-Bögen.
- **QR-Code** je Bogen für die spätere automatische Scanner-Zuordnung
  (Listentyp/Klasse/Lauf).
- **Zwei Export-Wege** (siehe unten): Browser-Druck (Vektor) und Raster-PDF
  (html2canvas + jsPDF). Der frühere dritte Weg - ein echtes Vektor-PDF via
  `@react-pdf/renderer` (`pdf.html`) - ist in der Vue-Portierung **noch nicht
  enthalten** (offene Entscheidung, siehe unten).
- **Bögen zusammenstellen:** Listentyp, Klasse und Lauf je Bogen wählen,
  sortieren, hinzufügen/entfernen; Startnummern editierbar.

## Bedienung

Links die Steuerleiste (nur am Bildschirm, im Druck ausgeblendet):

1. Veranstaltungsnamen setzen.
2. Unter **Bögen** die gewünschten Listen zusammenstellen (Typ/Klasse/Lauf).
3. In den Bögen rechts die Werte eintragen - Σ und Zeiten aktualisieren sich live.
4. **Drucken / Als PDF (Browser)** oder **PDF herunterladen (JS)**.

## PDF-Export

In der Vue-Portierung gibt es **einen Einstiegspunkt** (`index.html`) mit **zwei**
Export-Wegen:

- **Browser-Druck → „Als PDF speichern"** (empfohlen): scharfer, markierbarer
  Text inkl. QR-Codes, echtes Vektor-PDF. Dateiname wird über `document.title`
  vorgeschlagen (mit Zeitstempel und - falls eindeutig - Position/Klasse/Lauf).
- **Raster-Download** (html2canvas + jsPDF): Ein-Klick-Download, aber gerastert
  (unschärfer). QR-Codes werden dafür als Canvas neu gezeichnet.

### Offene Entscheidung: Vektor-PDF mit Ein-Klick-Download

Der React-Prototyp hatte einen **dritten** Weg: eine eigene Seite `pdf.html` mit
einem echten Vektor-PDF via `@react-pdf/renderer` - Live-Vorschau, Ein-Klick-
Download, auf jeder Seite wiederholter Kopf/Spaltenkopf (react-pdf `fixed`),
Vektor-QR, eingebettete Schrift (korrektes „Σ") und das Parcoursbild als PNG.
Dieser Weg ist **noch nicht portiert**, weil `@react-pdf/renderer` React-spezifisch
ist. Die Optionen (bewusst als offene Entscheidung dokumentiert):

| Option | Vektor/scharf | Aufwand | Anmerkung |
| ------ | :-----------: | ------- | --------- |
| **Browser-Druck „Als PDF"** | ✅ | 0 (läuft schon) | Empfohlener Primärweg. Kein Ein-Klick, keine Live-Vorschau, Layout hängt an der Browser-Druck-Engine. |
| **react-pdf als Insel behalten** | ✅ | **gering** (nur Build-Config) | Kein Layout-Neubau: `pdf.html` bleibt als kleine React-Insel, die 495 Zeilen `SheetsDocument.tsx` unverändert. |
| **pdfmake** | ✅ | mittel-hoch | Deklarativ, framework-frei - dem react-pdf am nächsten. Sheet-Layout muss im pdfmake-Modell **neu** gebaut werden. |
| **jsPDF + jspdf-autotable** | ✅ | mittel-hoch | jsPDF ist schon Dependency; echtes Vektor-PDF durch Zeichnen statt Rastern. Imperativer, Layout-Neubau nötig. |
| **Server-Puppeteer** | ✅ | (braucht Backend) | Rendert die **exakte Druck-HTML/CSS** zu Vektor-PDF. Das Zielsystem **dmj-ms11 nutzt Puppeteer bereits** - kein Client-PDF-Lib, keine Layout-Duplizierung. |

Eine ausgereifte **Vue-native** Entsprechung zu `@react-pdf/renderer` existiert
nicht; der „Vue-Weg" wäre praktisch pdfmake (echter Neubau).

**Wichtiger Befund für die Insel-Option:** Das react-pdf-Modul ist schon heute
eine **Insel** - eigener Einstiegspunkt mit eigenem Root, gekoppelt nur über den
**gemeinsamen localStorage** (die Vue-App schreibt den Stand inkl. eingetragener
Werte, die Insel liest ihn beim Laden). Es teilt keinen UI-Code, nur die
framework-agnostischen libs (`config`, `storage`, `print`). Eine Übernahme hieße
daher: Vite als Multi-Page mit **beiden** Plugins (`@vitejs/plugin-vue` +
`@vitejs/plugin-react`; jedes verarbeitet nur seine Dateien), ein winziger
Read-only-Store für `pdf.html` (nur `loadState()` + `readShareConfig()`, kein
Reducer), `SheetsDocument`/`courseImages`/`Qr` unverändert.

**Empfehlung nach Zeithorizont:**

- **Eigenständiger Vue-Prototyp jetzt:** die **react-pdf-Insel übernehmen** -
  gering im Aufwand, spart den kompletten Neubau der Vektor-Layout-Logik.
- **Spätere Integration in dmj-ms11:** die Insel **nicht** mitnehmen, sondern
  **Puppeteer im Backend** (schon vorhanden) nutzen - dieselbe WYSIWYG-CSS
  serverseitig zu Vektor-PDF rendern, kein zweites Framework.

Die Parcoursbilder liegen als **SVG** (Bildschirm/Browser-Druck) und **PNG**
(für ein etwaiges Vektor-PDF, das kein SVG einbetten kann) vor.

## Konfiguration (Positionen & Fehlerpunkte)

Listen, Spalten und Fehlerpunkte sind **datengetrieben** und liegen in zwei
YAML-Dateien unter `public/config/` (werden zur Laufzeit geladen - Änderung
wirkt nach dem Neuladen der Seite, ohne Neubau):

- **`fehlerpunkte.yaml`** - Disqualifikationen und Fehler-Kataloge. Kommen aus
  der **Ausschreibung** und sind i. d. R. für alle gleich.
- **`positionen.yaml`** - die **orts-/personenabhängigen Positionen** (welche
  Liste, welche Spalten in welcher Reihenfolge, welches Bild/Drehung). Positionen
  binden Kataloge und wiederverwendbare **Hinweise** per Verweis (ID) ein.
  Positionen sind zu **Aufbauten (Setups)** gebündelt (z. B. `Alcatraz`, `Frontal`);
  ein Aufbau enthält alle genutzten Listen. Gemeinsame Listen (Zeit, Knoten, …)
  werden geteilt, nur die Tor-Positionen unterscheiden sich je Aufbau. In der
  Bedienleiste wählt man den Aufbau; das erzeugt dessen Bögen neu.

Wichtige Felder einer Position: `spalten` (Reihenfolge/Typen), `katalog`
(Verweis auf einen Fehler-Katalog), `hinweis` (Verweis auf einen Hinweistext),
`disq: alle | keine | [A, B, …]` (nicht relevante Disqualifikationen ausblenden),
`bild` + `bildDrehung: 0 | 90 | -90 | 180`.

**Globale Bojen-Kürzel:** Die Seiten-/Richtungskürzel stehen zentral unter
`bezeichnungen` (Token-Map, z. B. `seiteA: R`, `seiteB: L`). In `sub` und in den
Hinweisen werden die Tokens (`hin`, `rueck`, `seiteA`, `seiteB`) als ganze Wörter
ersetzt - so stellt man von Rechts/Links auf Land/See (`L`/`S`) oder Hafen/Kai
(`H`/`K`) an EINER Stelle um; die Spaltenköpfe und der Hinweis ziehen automatisch nach.

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

Die Kernlogik (Zeit-Parsing, Punkte-/Disq-Berechnung, QR-Payload) und ein
UI-Render-Smoke-Test sind mit **Vitest** abgedeckt.

```bash
npm test            # alle Tests einmal ausführen
npm run test:watch  # Watch-Modus
npm run check       # Typecheck (vue-tsc) + Tests - auch im pre-commit-Hook
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
   <https://motorbootslalom.github.io/fehlerpunkte-prototyp/>.

Der Vite-`base` ist `./`, daher läuft der Build unter Projekt-Unterpfad **und** lokal.

## Assets

Die Parcoursbilder unter `public/parcours/` stammen aus `../Parcours/dist/`
(Verzeichnisse `alcatraz_I`, `alcatraz_II`, `alcatraz_Parcours`, SVG je Klasse).

## Tech-Stack

Vue 3 (Composition API, `<script setup>`) · TypeScript · Vite · qrcode-generator
(QR) · html2canvas + jsPDF (Raster-Variante). Persistenz via localStorage.

Portiert aus dem React-19-Prototyp: die framework-agnostische Logik (`lib/*`,
`config/*` inkl. YAML, Parcours-Skripte, `styles.css`, Tests) wurde unverändert
übernommen, nur Komponenten/Store/Entry sind neu in Vue. Der react-pdf-Vektor-PDF-
Vergleich ist noch nicht mitportiert (siehe „PDF-Export").
