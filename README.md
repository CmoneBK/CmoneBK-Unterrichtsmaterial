# 🎓 Interaktive Unterrichts-Mediathek

Dieses Repository dient als automatisches Archiv und Hosting-Plattform für interaktive Unterrichtswerkzeuge, die in **[CodePen](https://codepen.io)** erstellt wurden. Dank einer **[Make.com](https://www.make.com)**-Automation werden Pens mit nur einem Klick direkt hierher übertragen, automatisch kategorisiert und veröffentlicht.

## ⚡ Schnellstart & Anleitungen
Möchten Sie dieses System für Ihren eigenen Unterricht nachbauen? Hier sind die fertigen Vorlagen und Schritt-für-Schritt-Anleitungen:

* 🚀 **[Make.com Szenario mit einem Klick importieren](https://eu1.make.com/public/shared-scenario/Eghpa8gJd8q/codepen-to-github)** – Kopiert die fertige Automatisierung direkt in Ihren Account.
* ⚙️ **[Make.com Einrichtung im Detail](Make.com-Anleitung.md)** – So passen Sie das importierte Szenario an Ihren GitHub-Account an.
* 🔖 **[Lesezeichen (Bookmarklet) erstellen](Lesezeichen%20Erstellen.md)** – So richten Sie den Button in Ihrem Browser ein.

## 🚀 Der Workflow

Der Prozess ist vollständig automatisiert und besteht aus vier Komponenten:

1. **[CodePen](https://codepen.io) (Quelle):** Hier werden die HTML/CSS-Tools entwickelt.
2. **Bookmarklet (Trigger):** Ein spezielles Browser-Lesezeichen extrahiert den Code und Titel und sendet ein JSON-Paket an Make.com.
3. **[Make.com](https://www.make.com) (Brücke):** - Empfängt die Daten über einen Webhook.
   - Prüft via GitHub-API (GET), ob die Datei bereits existiert.
   - Falls ja, wird der `sha`-Wert ausgelesen, um die Datei zu überschreiben.
   - Speichert die Datei (PUT) im Unterordner `/tools/`.
4. **GitHub Pages (Ziel):** Die `index.html` nutzt Jekyll-Logik, um automatisch eine Übersichtskarte aller Tools im Web zu generieren.

## 📂 Ordnerstruktur

* `/tools/` – Enthält alle exportierten HTML-Dateien aus CodePen.
* `index.html` – Die dynamische Startseite (Jekyll), die Tools nach Fachbereichen gruppiert.
* `_includes/back-nav.html` – Der Rücklink „← Übersicht“, der in jedes Tool eingefügt wird.
* `_layouts/tool.html` – Fügt diesen Rücklink beim GitHub-Pages-Build in jedes Tool ein.
* `_config.yml` – Weist allen Dateien unter `/tools/` automatisch das Layout `tool` zu.
* `_data/kategorien.csv` – Legt die Reihenfolge der Bereiche und Unterkategorien fest.
* `Make.com-Anleitung.md` – Setup-Anleitung für die Make.com-Schnittstelle.
* `Lesezeichen Erstellen.md` – Setup-Anleitung für das Browser-Bookmarklet.
* `README.md` – Diese Dokumentation.

## 🛠 Automatisierung & Konventionen

### Namensgebung: Bereich, Unterkategorie, Name

Beide Übersichten – GitHub Pages und t-bk.de – gruppieren allein anhand des Titels. Er folgt diesem Muster:

`Bereich: Unterkategorie - Name des Tools`

**Beispiele:**
- `Fertigungstechnik: Messmittel - Messuhr` → Bereich „Fertigungstechnik“, Kategorie „Messmittel“, Karte „Messuhr“
- `Maschinenelemente: Schrauben - Gewindearten` → Bereich „Maschinenelemente“, Kategorie „Schrauben“
- `Fertigungstechnik: ISO-Toleranzen und Passungen` → ohne Unterkategorie, steht direkt unter dem Bereich

**Zwei Regeln, die man kennen muss:**

1. Getrennt wird am ` - ` **mit Leerzeichen davor und dahinter**. Deshalb stören Bindestriche im Text nicht: `Form- und Lagetoleranzen`, `Wellen-CAD-Software` und `Vorschub <-> Rautiefe` werden korrekt erkannt.
2. Ohne ` - ` gibt es keine Unterkategorie. Ein Titel wie `Messmittel Sinuslineal` (Bindestrich vergessen) landet also **nicht** unter „Messmittel“. Mehrfache Leerzeichen werden dagegen automatisch zusammengezogen.

### Reihenfolge der Kategorien

`_data/kategorien.csv` bestimmt, in welcher Reihenfolge Bereiche und Unterkategorien erscheinen – nützlich überall dort, wo alphabetisch fachlich falsch wäre (z. B. Instandhaltung nach DIN 31051: Wartung, Inspektion, Instandsetzung, Verbesserung).

```csv
bereich,unterkategorie
Fertigungstechnik,Messmittel
Instandhaltung,Wartung
```

Beide Generatoren lesen dieselbe Datei. Was dort **nicht** steht, wird alphabetisch hinten angehängt – ein neues Werkzeug erscheint also auch ohne Pflege der CSV, nur eben nicht an der gewünschten Position. Kommata sind in den Werten nicht erlaubt.

### Bookmarklet-Logik
Das verwendete JavaScript-Bookmarklet führt folgende Schritte aus:
1. Es liest den `<title>` aus dem HTML-Gerüst.
2. Es bereinigt den Titel für den Dateinamen (Kleinbuchstaben, keine Sonderzeichen).
3. Es fügt ein YAML Front Matter (`--- title: "..." ---`) oben in den Code ein, damit GitHub Pages den Namen inklusive Doppelpunkt erkennt.
4. Es sendet den Code per POST-Request an den Make-Webhook.

## ↩️ Rücklink zur Übersicht

Jedes Tool bekommt oben links eine schwebende Schaltfläche **„← Übersicht“** (auf schmalen Displays nur den Pfeil). Sie zeigt immer auf `../` und trifft damit ohne Fallunterscheidung die jeweils richtige Übersicht:

| Umgebung | Tool-URL | Ziel von `../` |
| --- | --- | --- |
| GitHub Pages | `…/CmoneBK-Unterrichtsmaterial/tools/x.html` | `…/CmoneBK-Unterrichtsmaterial/` |
| t-bk.de | `t-bk.de/werkzeuge/tools/x.html` | `t-bk.de/werkzeuge/` |

**Wichtig:** Die Dateien in `/tools/` werden *nicht* verändert – der Link wird erst beim Ausspielen direkt vor dem schliessenden `body`-Tag eingefügt. Ein automatischer CodePen-Upload kann ihn deshalb nicht überschreiben, und in CodePen selbst muss nichts mitgepflegt werden.

* **GitHub Pages:** `_config.yml` weist `/tools/` das Layout `_layouts/tool.html` zu, das `_includes/back-nav.html` einfügt.
* **t-bk.de:** `deploy.sh` (Repo `tbk-webseite`) liest **dieselbe** Datei `_includes/back-nav.html` aus diesem Repo und fügt sie beim Deploy ein.

Aussehen oder Ziel des Links ändert man also ausschliesslich in `_includes/back-nav.html` – beide Ausspielwege übernehmen die Änderung automatisch. Der Block verwendet eine eigene ID (`#tbk-back`) und `!important`, damit ihn die sehr unterschiedlichen Tool-Designs (helle wie dunkle) nicht überschreiben.

## 🌐 Live-Ansicht
Die Mediathek ist für Schüler und Kollegen erreichbar unter:
👉 **[https://cmonebk.github.io/CmoneBK-Unterrichtsmaterial/](https://cmonebk.github.io/CmoneBK-Unterrichtsmaterial/)**

## 🔧 Fehlerbehebung
- **Titel wird nicht korrekt angezeigt:** Prüfen Sie, ob das Tool im HTML-Code ganz oben die `---` Striche mit dem Titel-Eintrag enthält.
- **Datei wird nicht aktualisiert:** Prüfen Sie in Make.com, ob der "Spion" (HTTP GET) einen gültigen `sha`-Wert zurückgibt. Ohne diesen Wert verweigert GitHub das Überschreiben existierender Dateien.
