# 📑 CodePen to GitHub Bookmarklet

Diese Anleitung beschreibt die Einrichtung und Nutzung des Browser-Lesezeichens, um HTML-Tools mit einem Klick von CodePen in das GitHub-Repository zu übertragen.

## 📋 Kurzanleitung: Einrichtung

1. **Lesezeichenleiste einblenden:** Drücke `Strg + Shift + B` (Windows) oder `Cmd + Shift + B` (Mac).
2. **Neues Lesezeichen erstellen:** Rechtsklick auf die Leiste -> **Lesezeichen hinzufügen** (oder "Seite hinzufügen").
3. **Konfiguration:**
   - **Name:** `🚀 Send to GitHub` (oder beliebig)
   - **URL / Adresse:** Kopiere den untenstehenden Code-Block komplett in dieses Feld.
4. **Webhook anpassen:** Ersetze im Code den Platzhalter `HIER_DEINE_MAKE_WEBHOOK_URL` durch deine persönliche URL von Make.com.

---

## 💻 Der Lesezeichen-Code

Kopiere diesen Block als Ganzes in das URL-Feld deines Lesezeichens:

```javascript
javascript:(async function(){var match=window.location.href.match(/codepen\.io\/([^\/]+)\/(?:pen|details|full|debug|live)\/([a-zA-Z0-9]+)/);if(match){try{var res=await fetch('https://codepen.io/'+match[1]+'/pen/'+match[2]+'.html');var code=await res.text();if(code.includes('Not Available')){alert('Fehler: CodePen blockiert den Export.');return;}var tMatch=code.match(/<title>(.*?)<\/title>/i);var rawTitle=tMatch?tMatch[1]:match[2];var fileName=rawTitle.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')+'.html';var frontMatter='---\ntitle: "'+rawTitle.replace(/"/g,"'")+'"\n---\n';code=frontMatter+code;await fetch('HIER_DEINE_MAKE_WEBHOOK_URL',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({htmlCode:code,fileName:fileName})});alert('Code wurde erfolgreich als "' + fileName + '" gesendet!');}catch(e){alert('Fehler beim Senden!');}}else{alert('Bitte auf einer CodePen-Seite ausführen!');}})();
```

---

## 🛠 Funktionsweise im Detail

Das Bookmarklet führt bei Klick folgende automatisierte Schritte aus:

1. **URL-Analyse:** Es erkennt automatisch den Usernamen und die Pen-ID aus der Adresszeile (egal ob du dich in der Editor-, Full- oder Details-Ansicht befindest).
2. **Code-Extraktion:** Es lädt die reine `.html`-Exportversion deines Pens im Hintergrund.
3. **Titel-Parsing:** Der Text zwischen den `<title>`-Tags wird ausgelesen.
4. **YAML Front Matter:** Es erstellt automatisch den Header `--- title: "Dein Titel" ---`. Dieser ist wichtig, damit GitHub Pages den Titel später inklusive Sonderzeichen (wie Doppelpunkten) korrekt auf der Startseite anzeigt.
5. **Dateiname-Sanierung:** Der Titel wird für das Dateisystem optimiert (Kleinschreibung, Umlaute werden ersetzt, Leerzeichen werden zu Bindestrichen).
6. **Versand:** Das fertige Paket aus HTML-Code und Dateiname wird per `POST`-Request an Make.com übermittelt.

## 🚀 Nutzung

1. Öffne deinen gewünschten Pen in **CodePen**.
2. Stelle sicher, dass du einen aussagekräftigen Titel vergeben hast (z.B. `Fach: Thema`).
3. Klicke auf das Lesezeichen in deiner Browser-Leiste.
4. Bestätige das Alert-Fenster ("Erfolgreich gesendet").
5. Nach ca. 1-2 Minuten erscheint das Tool automatisch kategorisiert auf deiner GitHub-Webseite.
