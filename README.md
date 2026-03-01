# 🎓 Interaktive Unterrichts-Mediathek

Dieses Repository dient als automatisches Archiv und Hosting-Plattform für interaktive Unterrichtswerkzeuge, die in **CodePen** erstellt wurden. Dank einer Make.com-Automation werden Pens mit nur einem Klick direkt hierher übertragen, automatisch kategorisiert und veröffentlicht.

## 🚀 Der Workflow

Der Prozess ist vollständig automatisiert und besteht aus vier Komponenten:

1. **CodePen (Quelle):** Hier werden die HTML/CSS-Tools entwickelt.
2. **Bookmarklet (Trigger):** Ein spezielles Browser-Lesezeichen extrahiert den Code und Titel und sendet ein JSON-Paket an Make.com.
3. **Make.com (Brücke):** - Empfängt die Daten über einen Webhook.
   - Prüft via GitHub-API (GET), ob die Datei bereits existiert.
   - Falls ja, wird der `sha`-Wert ausgelesen, um die Datei zu überschreiben.
   - Speichert die Datei (PUT) im Unterordner `/tools/`.
4. **GitHub Pages (Ziel):** Die `index.html` nutzt Jekyll-Logik, um automatisch eine Übersichtskarte aller Tools im Web zu generieren.

## 📂 Ordnerstruktur

* `/tools/` – Enthält alle exportierten HTML-Dateien aus CodePen.
* `index.html` – Die dynamische Startseite (Jekyll), die Tools nach Fachbereichen gruppiert.
* `README.md` – Diese Dokumentation.

## 🛠 Automatisierung & Konventionen

### Namensgebung für automatische Kategorien
Die Startseite nutzt den Titel der HTML-Datei zur Gruppierung. Um ein Tool korrekt einzuordnen, muss der Titel in CodePen folgendem Muster entsprechen:

`Kategorie: Name des Tools`

**Beispiele:**
- `Fertigungstechnik: Prüftechnik Einführung` -> Erscheint in der Sektion "Fertigungstechnik".
- `Mathematik: Bruchrechnen` -> Erscheint in der Sektion "Mathematik".

### Bookmarklet-Logik
Das verwendete JavaScript-Bookmarklet führt folgende Schritte aus:
1. Es liest den `<title>` aus dem HTML-Gerüst.
2. Es bereinigt den Titel für den Dateinamen (Kleinbuchstaben, keine Sonderzeichen).
3. Es fügt ein YAML Front Matter (`--- title: "..." ---`) oben in den Code ein, damit GitHub Pages den Namen inklusive Doppelpunkt erkennt.
4. Es sendet den Code per POST-Request an den Make-Webhook.

## 🌐 Live-Ansicht
Die Mediathek ist für Schüler und Kollegen erreichbar unter:
👉 **[https://CmoneBK.github.io/CmoneBK-Unterrichtsmaterial/](https://CmoneBK.github.io/CmoneBK-Unterrichtsmaterial/)**

## 🔧 Fehlerbehebung
- **Titel wird nicht korrekt angezeigt:** Prüfen Sie, ob das Tool im HTML-Code ganz oben die `---` Striche mit dem Titel-Eintrag enthält.
- **Datei wird nicht aktualisiert:** Prüfen Sie in Make.com, ob der "Spion" (HTTP GET) einen gültigen `sha`-Wert zurückgibt. Ohne diesen Wert verweigert GitHub das Überschreiben existierender Dateien.
