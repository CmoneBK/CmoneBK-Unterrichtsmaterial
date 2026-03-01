# 🎓 Interaktive Unterrichts-Mediathek

Dieses Repository dient als automatisches Archiv und Hosting-Plattform für interaktive Unterrichtswerkzeuge, die in **CodePen** erstellt wurden. Dank einer Make.com-Automation werden Pens mit nur einem Klick direkt hierher übertragen und kategorisiert veröffentlicht.

## 🚀 Der Workflow

Der Prozess ist vollständig automatisiert und besteht aus drei Komponenten:

1.  **CodePen (Quelle):** Hier werden die HTML/CSS-Tools entwickelt.
2.  **Bookmarklet (Trigger):** Ein spezielles Browser-Lesezeichen extrahiert den Code und sendet ihn an Make.com.
3.  **Make.com (Brücke):** Empfängt die Daten, prüft auf GitHub nach bestehenden Dateiversionen (SHA-Check) und speichert die Datei im Ordner `/tools/`.
4.  **GitHub Pages (Ziel):** Die `index.html` generiert automatisch eine Übersichtskarte aller Tools.

## 📂 Ordnerstruktur

* `/tools/`: Enthält alle exportierten HTML-Dateien aus CodePen.
* `index.html`: Die Startseite, die alle Tools automatisch nach Kategorien gruppiert anzeigt.

## 🛠 Automatisierung Details

### Kategorisierung
Die Startseite nutzt den Dateititel zur Gruppierung. Verwenden Sie in CodePen das Format:
`Fachbereich: Thema des Tools`  
*(Beispiel: "Fertigungstechnik: Prüftechnik Einführung")*

Das System erkennt das Wort vor dem Doppelpunkt als **Kategorie** und alles danach als **Anzeigetitel**.

### Das Bookmarklet (JavaScript)
Um ein neues Tool zu übertragen, muss das folgende Bookmarklet auf der CodePen-Seite ausgeführt werden:

```javascript
/* Kurzübersicht der Funktion: */
/* 1. Extrahiert den HTML-Code & Titel */
/* 2. Erstellt Front-Matter für GitHub Jekyll */
/* 3. Sendet JSON-Paket an Make.com Webhook */
