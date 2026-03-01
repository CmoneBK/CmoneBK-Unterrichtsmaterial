# ⚙️ Make.com Automatisierung einrichten

Diese Anleitung beschreibt den Aufbau des Make.com-Szenarios, das als Brücke zwischen dem CodePen-Lesezeichen und GitHub fungiert. Es empfängt den Code, prüft auf bestehende Dateien und lädt die neue Version hoch.

## 🔑 Vorbereitung: GitHub Token erstellen
Damit Make.com in Ihr Repository schreiben darf, wird ein Zugriffs-Token benötigt.
1. Auf GitHub einloggen -> **Settings** -> **Developer settings** -> **Personal access tokens** -> **Tokens (classic)**.
2. Auf **Generate new token (classic)** klicken.
3. Namen vergeben (z. B. "Make Automation"), Ablaufdatum auf "No expiration" setzen.
4. Den Haken bei **`repo`** (Full control of private repositories) setzen.
5. Token generieren und **kopieren** (wird später in Make.com benötigt).

---

## 🏗 Der Aufbau in Make.com

Das Szenario besteht aus exakt **drei Haupt-Modulen** und **einem Error-Handler**.

### Schritt 1: Webhook (Der Empfänger)
Dieses Modul fängt die Daten ab, die das Lesezeichen aus dem Browser sendet.

1. Ein neues Szenario in Make.com erstellen.
2. Das Modul **Webhooks** -> **Custom webhook** hinzufügen.
3. Auf **Add** klicken, den Webhook z. B. "CodePen Empfänger" nennen und speichern.
4. Die angezeigte Webhook-URL in die Zwischenablage kopieren (diese muss im JavaScript-Code des Lesezeichens eingefügt werden).
5. Auf **Re-determine data structure** klicken, dann im Browser einmal das Lesezeichen ausführen, damit Make.com die Variablen (`htmlCode` und `fileName`) lernt.

### Schritt 2: HTTP GET (Der "Spion")
Dieses Modul prüft bei GitHub, ob im Ordner `/tools/` bereits eine Datei mit demselben Namen existiert. Das ist zwingend nötig, um Updates durchzuführen (Überschreiben).

1. Ein **HTTP** -> **Make a request** Modul an den Webhook anhängen.
2. Konfiguration:
   * **URL:** `https://api.github.com/repos/IHR_GITHUB_NAME/IHR_REPO_NAME/contents/tools/{{1.fileName}}`
     *(Ersetzen Sie Name und Repo, und ziehen Sie die `fileName`-Variable aus dem Webhook in die URL)*
   * **Method:** `GET`
   * **Headers (Item 1):** Name: `Authorization` | Value: `Bearer IHR_KOPIERTER_GITHUB_TOKEN`
   * **Headers (Item 2):** Name: `User-Agent` | Value: `Make-Automation`
   * **Parse response:** `Yes`

### Schritt 3: Error Handler (Das Pflaster)
Wenn eine Datei zum *ersten Mal* hochgeladen wird, wirft der "Spion" einen 404-Fehler (Datei nicht gefunden). Damit die Automation dann nicht abbricht, brauchen wir einen Error-Handler.

1. **Rechtsklick** auf das HTTP GET Modul -> **Add error handler** wählen.
2. In der erscheinenden Blase das lilafarbene Modul **Directives** -> **Resume** wählen.
3. Das Einstellungsfenster des Resume-Moduls **komplett leer lassen** und mit **OK** bestätigen.

### Schritt 4: HTTP PUT (Der Datei-Upload)
Dieses Modul übernimmt das eigentliche Speichern. Es liegt auf der Hauptlinie (hinter dem GET-Modul, nicht hinter dem Error-Handler).

1. Ein weiteres **HTTP** -> **Make a request** Modul an das GET-Modul anhängen.
2. Konfiguration:
   * **URL:** Exakt dieselbe URL wie in Schritt 2.
   * **Method:** `PUT`
   * **Headers:** Exakt dieselben zwei Header (`Authorization` und `User-Agent`) wie in Schritt 2.
   * **Body content type:** `application/json`
   * **Body intput methode:** `JSON string`
   * **Body content:** Fügen Sie den folgenden JSON-Code ein:

```json
{
  "message": "Automatischer CodePen Upload",
  "content": "{{base64(1.htmlCode)}}"{{if(2.Data.sha; ',"sha":"' + 2.Data.sha + '"'; "")}}
}
```

> **⚠️ Wichtiger Hinweis zum Code-Feld:**
> Sie müssen die Variablen im Code durch die echten Variablen-Kästen in Make.com ersetzen! 
> * Ersetzen Sie `1.htmlCode` durch die rosa Variable **`htmlCode`** aus Modul 1 (Webhook). Das Wort `base64` finden Sie unter dem Reiter "String Functions".
> * Ersetzen Sie beide `2.Data.sha` durch die grüne Variable **`sha`** aus Modul 2 (HTTP GET Spion). Behalten Sie die einfachen und doppelten Anführungszeichen exakt so bei, wie sie im Block stehen.

### Schritt 5: Aktivierung
1. Unten links auf das **Disketten-Symbol** (Save) klicken.
2. Den Schalter unten links (Scheduling) auf **ON** stellen.
3. Fertig! Sobald Sie ab jetzt das Lesezeichen in CodePen nutzen, läuft die Aktualisierung vollautomatisch im Hintergrund.
