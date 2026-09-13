# 🎓 Interaktive Unterrichts-Mediathek

Dieses Repository dient als automatisches Archiv und Hosting-Plattform für interaktive Unterrichtsseiten, die in **[CodePen](https://codepen.io)** erstellt wurden. Dank einer **[Make.com](https://www.make.com)**-Automation werden Pens mit nur einem Klick direkt hierher übertragen, automatisch kategorisiert und veröffentlicht.

## ⚡ Schnellstart & Anleitungen
Möchten Sie dieses System für Ihren eigenen Unterricht nachbauen? Hier sind die fertigen Vorlagen und Schritt-für-Schritt-Anleitungen:

* 🚀 **[Make.com Szenario mit einem Klick importieren](https://eu1.make.com/public/shared-scenario/Eghpa8gJd8q/codepen-to-github)** – Kopiert die fertige Automatisierung direkt in Ihren Account.
* ⚙️ **[Make.com Einrichtung im Detail](Make.com-Anleitung.md)** – So passen Sie das importierte Szenario an Ihren GitHub-Account an.
* 🔖 **[Lesezeichen (Bookmarklet) erstellen](Lesezeichen%20Erstellen.md)** – So richten Sie den Button in Ihrem Browser ein.

## 🚀 Der Workflow

1. **[CodePen](https://codepen.io) (Quelle):** Hier werden die HTML/CSS-Seiten entwickelt.
2. **Bookmarklet (Trigger):** Ein spezielles Browser-Lesezeichen extrahiert den Code und Titel und sendet ein JSON-Paket an Make.com.
3. **[Make.com](https://www.make.com) (Brücke):**
   - Empfängt die Daten über einen Webhook.
   - Prüft via GitHub-API (GET), ob die Datei bereits existiert.
   - Falls ja, wird der `sha`-Wert ausgelesen, um die Datei zu überschreiben.
   - Speichert die Datei (PUT) im Unterordner `/tools/`.
4. **Build (Nachbereitung):** `node build/build.mjs` bringt die neue Datei in Ordnung und
   schreibt die Übersicht neu. Ohne diesen Schritt fehlt die Seite in der Übersicht.

### Nach jedem Upload: `node build/build.mjs`

Das Skript braucht nur Node 18 und keine Abhängigkeiten. Es tut drei Dinge:

1. **Front Matter entfernen.** Das Bookmarklet setzt `--- title: "…" ---` an den
   Dateianfang. Das stammt aus der Jekyll-Zeit; ohne Jekyll stünde es als Text
   auf der Seite.
2. **Bausteine eintragen**, falls sie fehlen: `assets/thema-werkzeug.css` und
   `assets/thema.js` in den `head`, `assets/back-nav.js` vor `</body>`. Eine
   Lektion bekommt zusätzlich `bildungsgang.js`, `qr.js`, `pdf.js` und
   `lektion.js` — in dieser Reihenfolge, weil `lektion.js` die drei anderen
   nutzt.
3. **`index.html` neu schreiben** – die Übersicht mit beiden Reitern.

`node build/build.mjs --check` prüft nur und endet mit Exit-Code 1, wenn etwas
offen ist. Praktisch vor dem Commit.

> **Warum kein Jekyll mehr?** Die Seiten sind vollständige HTML-Dokumente, keine
> Fragmente. Jekyll hat nur ein Layout darübergelegt, das den Rücklink einfügt –
> und das auch nur auf GitHub Pages; auf t-bk.de tat dasselbe das `deploy.sh` ein
> zweites Mal. Zwei Wege für dieselbe Zeile, und lokal per Doppelklick
> funktionierte keiner davon. Jetzt steht alles in den Dateien selbst: GitHub
> Pages, t-bk.de und der lokale Doppelklick zeigen dieselbe Seite.

## 📂 Ordnerstruktur

* `/tools/` – Alle exportierten HTML-Dateien aus CodePen.
* `/tools/assets/` – Die gemeinsamen Bausteine (Rücklink, Umschalter hell/dunkel,
  für Lektionen zusätzlich Anpassen und Herunterladen).
* `index.html` – Die Übersicht. **Erzeugt** – nicht von Hand bearbeiten.
* `build/build.mjs` – Erzeugt sie.
* `build/uebersicht-vorlage.html` – Das Gerüst dafür (Design, Reiter, Suche).
* `daten/kategorien.csv` – Legt die Reihenfolge der Bereiche und Unterkategorien fest.
* `.nojekyll` – Sagt GitHub Pages, dass es die Dateien unverändert ausliefern soll.
* `Make.com-Anleitung.md`, `Lesezeichen Erstellen.md` – Setup-Anleitungen.

## 🛠 Konventionen

### Zwei Arten von Seiten

Die Übersicht trennt sie in zwei Haupt-Reiter, weil einen bei ihnen etwas ganz
Unterschiedliches erwartet:

| Art | Was es ist | `<meta name="art" content="…">` |
| --- | --- | --- |
| **Simulation** | Etwas einstellen, ablesen, ausprobieren – rechnet und zeichnet mit | `simulation` |
| **Lektion** | Ein Thema von vorn bis hinten, in Kapiteln – zum Lesen und Vorführen | `lektion` |

Das Merkmal steht als `<meta>` im `head` der Seite:

```html
<meta name="art" content="lektion">
```

Fehlt es, gilt die Seite als Simulation und der Build sagt es beim Durchlauf.
Frisch aus CodePen hochgeladene Seiten sind damit von allein richtig
einsortiert; nur bei einer Lektion trägt man die Zeile nach.

Optional ist `<meta name="description" content="…">`: Der Text erscheint als
zweite Zeile auf der Karte.

### Namensgebung: Bereich, Unterkategorie, Name

Gruppiert wird allein anhand des Titels. Er folgt diesem Muster:

`Bereich: Unterkategorie - Name der Seite`

**Beispiele:**
- `Fertigungstechnik: Messmittel - Messuhr` → Bereich „Fertigungstechnik“, Kategorie „Messmittel“, Karte „Messuhr“
- `Maschinenelemente: Schrauben - Schraubverbindungen` → Bereich „Maschinenelemente“, Kategorie „Schrauben“
- `Fertigungstechnik: ISO-Toleranzen und Passungen` → ohne Unterkategorie, steht direkt unter dem Bereich

**Zwei Regeln, die man kennen muss:**

1. Getrennt wird am ` - ` **mit Leerzeichen davor und dahinter**. Deshalb stören Bindestriche im Text nicht: `Form- und Lagetoleranzen`, `Wellen-CAD-Software` und `Vorschub <-> Rautiefe` werden korrekt erkannt.
2. Ohne ` - ` gibt es keine Unterkategorie. Ein Titel wie `Messmittel Sinuslineal` (Bindestrich vergessen) landet also **nicht** unter „Messmittel“. Mehrfache Leerzeichen werden dagegen automatisch zusammengezogen.

### Reihenfolge der Kategorien

`daten/kategorien.csv` bestimmt, in welcher Reihenfolge Bereiche und Unterkategorien erscheinen – nützlich überall dort, wo alphabetisch fachlich falsch wäre (z. B. Instandhaltung nach DIN 31051: Wartung, Inspektion, Instandsetzung, Verbesserung).

```csv
bereich,unterkategorie
Fertigungstechnik,Messmittel
Instandhaltung,Wartung
```

Was dort **nicht** steht, wird alphabetisch hinten angehängt – eine neue Seite
erscheint also auch ohne Pflege der CSV, nur eben nicht an der gewünschten
Position. Kommata sind in den Werten nicht erlaubt.

## ✂️ Lektion anpassen und herunterladen

Jede Lektion trägt unten rechts dieselbe Leiste wie die Übungen im
Materialbereich &ndash; `tools/assets/lektion.js` baut sie auf:

* **Lektion anpassen** &ndash; Kapitel (die Reiter) und einzelne Karten
  abwählen. Daraus entsteht ein Link samt QR-Code, der die Lektion genau so
  öffnet; die Datei bleibt unverändert. Der Zuschnitt steckt als `?ohne=…` in
  der Adresse, die Kennungen darin sind Streuwerte über die Beschriftungen.
  Wird eine Überschrift umformuliert, greift ein alter Link dort nicht mehr
  &ndash; dann erscheint das Kapitel wieder, statt dass das falsche verschwindet.
* **Herunterladen** &ndash; als PDF (über den Druckdialog oder als fertige Datei)
  oder als Word-Dokument. Auf Papier gibt es keine Reiter: Aus jedem Kapitel
  wird ein Abschnitt, jedes beginnt auf einer neuen Seite. Wahlweise die ganze
  Lektion oder nur das offene Kapitel.

Damit das greift, braucht die Seite drei Dinge, die alle Lektionen ohnehin
haben: die Reiterleiste (`.tabs` mit `button[data-tab]`), je Reiter einen
`<section class="panel" id="p-…">` und ein `<main>` um das Ganze.

Drei Kennzeichnungen steuern die Ausgabe:

| Attribut | Wirkung auf Papier |
| --- | --- |
| `data-druck="weg"` | Das Element kommt nicht mit (Bedienleisten, Regler). |
| `data-druck="text"` | Die Beschriftung einer Schaltfläche ist selbst der Inhalt. |
| `data-druck="ankreuzen"` | Ein Auswahlfeld wird zu Kästchen zum Ankreuzen. |

## 🎓 Zuschnitt nach Bildungsgang

Oben im Fenster „Lektion anpassen“ und auf der Übersicht steht die Wahl des
Bildungsgangs. Sie setzt die Häkchen auf das, was der Bildungsplan hergibt —
mehr nicht: Danach lässt sich alles wieder ändern. Gemerkt wird sie im
`localStorage` (`tbk-bildungsgang`) und gilt für die ganze Seite t-bk.de,
Unterrichtsmaterial eingeschlossen; weitergeben lässt sie sich als `?bg=…`.

Ein Kapitel oder eine Karte, die nicht überall hingehört, sagt das selbst — am
Reiter oder an der Überschrift:

```html
<button role="tab" data-tab="berechnungen" data-bg-ohne="bfs-hs10 bfs-mr">…</button>
<h2 data-bg-ohne="bfs-hs10">Verzug und Eigenspannungen</h2>
```

Eine ganze Seite nimmt sich im `head` aus und verschwindet dann aus der
Übersicht:

```html
<meta name="bg-ohne" content="bfs-hs10 bfs-mr">
```

**Kein Attribut heißt: gehört überall dazu.** Neue Seiten erscheinen also erst
einmal für alle.

Die sieben Schlüssel sind `bfs-hs10`, `bfs-mr`, `hbfs-c2`, `fos-c3`, `im`, `zm`
und `tech` (Berufsfachschule mit HS10 bzw. Mittlerer Reife, Höhere
Berufsfachschule C2, Fachoberschule C3, Industriemechaniker,
Zerspanungsmechaniker, Techniker). Welcher Inhalt zu welchem Bildungsgang
gehört und warum, steht mitsamt den NRW-Bildungsplänen im Material-Repo unter
`bildungsgaenge/` — dort und nicht hier, weil die Zuordnung beide Bereiche
betrifft.

## ↩️ Rücklink zur Übersicht

Jede Seite bekommt oben links eine schwebende Schaltfläche **„← Übersicht“** (auf schmalen Displays nur den Pfeil). Sie zeigt immer auf `../` und trifft damit ohne Fallunterscheidung die jeweils richtige Übersicht:

| Umgebung | Seiten-URL | Ziel von `../` |
| --- | --- | --- |
| GitHub Pages | `…/CmoneBK-Unterrichtsmaterial/tools/x.html` | `…/CmoneBK-Unterrichtsmaterial/` |
| t-bk.de | `t-bk.de/werkzeuge/tools/x.html` | `t-bk.de/werkzeuge/` |

Eingebunden wird sie als `<script src="assets/back-nav.js" data-ziel="../"></script>`
direkt vor `</body>`; der Build trägt die Zeile nach, wenn sie fehlt. Aussehen
und Ziel ändert man ausschliesslich in `tools/assets/back-nav.js`. Der Block
verwendet eine eigene ID (`#tbk-back`) und `!important`, damit ihn die sehr
unterschiedlichen Designs (helle wie dunkle) nicht überschreiben.

## 🌓 Hell oder dunkel

Oben rechts sitzt ein Umschalter mit drei Zuständen: **System** (Vorgabe),
**Hell**, **Dunkel**. Die Wahl liegt im `localStorage` unter `tbk-thema` und gilt
für die ganze Seite t-bk.de – Startseite, Werkzeuge und Unterrichtsmaterial
ziehen mit. Es wird nichts übertragen.

Die Seiten in `/tools/` sind einzeln entstanden, jede mit eigenem Design und
vielen fest eingetragenen Farben. Statt über zwanzig Designs von Hand umzufärben
kehrt `tools/assets/thema-werkzeug.css` die Seite als Ganzes um und dreht den
Farbton zurück: Aus Schwarz auf Weiß wird Weiß auf Schwarz, ein Rot bleibt rot.
Für technische Zeichnungen ist das genau richtig.

Zwei Sonderfälle, die man kennen muss:

* **Von Haus aus dunkel gebaut** (Gesamtrundlauf Radial, Sinuslineal): Die Seite
  trägt `<html data-basis="dunkel">` und wird umgekehrt behandelt.
* **Farbe trägt die Aussage** (Farbmuster, Ampel): Ein `class="thema-echt"` am
  Element schützt es vor der Umkehrung. Fotos und Videos sind ohnehin
  ausgenommen.

Die Übersicht (`index.html`) bindet dieses Stylesheet **nicht** ein – sie bringt
eigene dunkle Farben mit.

## 🌐 Live-Ansicht
Die Mediathek ist erreichbar unter:
👉 **[https://t-bk.de/werkzeuge/](https://t-bk.de/werkzeuge/)**
(Spiegel: [cmonebk.github.io/CmoneBK-Unterrichtsmaterial](https://cmonebk.github.io/CmoneBK-Unterrichtsmaterial/))

## 🔧 Fehlerbehebung
- **Seite fehlt in der Übersicht:** `node build/build.mjs` laufen lassen und `index.html` mitcommitten.
- **`--- title: … ---` steht als Text auf der Seite:** dasselbe – der Build entfernt es.
- **Seite steht im falschen Reiter:** `<meta name="art" content="lektion">` im `head` ergänzen, dann neu bauen.
- **Karte trägt den Dateinamen statt eines Namens:** Der Seite fehlt ein `<title>`.
- **Karte hängt unter dem falschen Bereich:** Titel-Muster prüfen – ` - ` mit Leerzeichen.
- **Eine Lektion zeigt die beiden Knöpfe nicht:** Es fehlt das `<main>`, die Reiterleiste oder `<meta name="art" content="lektion">`.
- **Auf Papier steht Bedienung:** Das Element mit `data-druck="weg"` kennzeichnen.
- **Datei wird nicht aktualisiert:** In Make.com prüfen, ob der "Spion" (HTTP GET) einen gültigen `sha`-Wert zurückgibt. Ohne diesen Wert verweigert GitHub das Überschreiben existierender Dateien.
