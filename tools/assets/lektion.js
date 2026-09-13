/* Lektionen zuschneiden und mitnehmen.
 *
 * Eingebunden mit drei Zeilen vor dem schliessenden body-Tag; build/build.mjs
 * traegt sie in jeder Seite mit <meta name="art" content="lektion"> nach:
 *
 *     <script src="assets/bildungsgang.js"></script>
 *     <script src="assets/qr.js"></script>
 *     <script src="assets/pdf.js"></script>
 *     <script src="assets/lektion.js"></script>
 *
 * Das Gegenstueck zu "Uebung anpassen" und "Herunterladen" im Materialbereich -
 * gleiche Leiste unten rechts, gleiche Bedienung, nur auf den Bau einer Lektion
 * zugeschnitten:
 *
 *   Anpassen       Nicht jedes Kapitel passt zu jeder Lerngruppe. Reiter und
 *                  einzelne Karten lassen sich abwaehlen; daraus entsteht ein
 *                  Link (und ein QR-Code), der die Lektion genau so oeffnet.
 *                  Die Datei selbst bleibt unveraendert - die Auswahl steckt
 *                  allein in der Adresse.
 *
 *   Herunterladen  Die Lektion als PDF oder als Word-Datei. Ausgegeben wird,
 *                  was nach dem Zuschnitt uebrig ist - und zwar ueber alle
 *                  Reiter hinweg, nicht nur der gerade offene. Auf Papier gibt
 *                  es keine Reiter, also wird daraus ein Kapitel nach dem
 *                  anderen.
 *
 * Die Kennungen in der Adresse leiten sich aus den Beschriftungen ab, nicht aus
 * ihrer Reihenfolge. Wird eine Lektion spaeter umgestellt, zeigen alte Links
 * weiterhin auf dasselbe. Wird eine Ueberschrift umformuliert, findet der Link
 * sie nicht mehr - dann erscheint dieses Kapitel wieder, statt dass das falsche
 * verschwindet. Das ist die harmlosere Richtung.
 *
 * Vorausgesetzt wird der Aufbau, den alle Lektionen teilen:
 *
 *     <div class="tabs" role="tablist"><button data-tab="x">Name</button>…</div>
 *     <main><section class="panel" id="p-x"><div class="karte"><h2>…</h2>…
 *
 * Drei Stufen sind waehlbar: das Kapitel (der Reiter), die Karte darin und -
 * wo es sie gibt - der Abschnitt unter einer h3. Die dritte Stufe braucht es,
 * weil eine Karte dreierlei zugleich tragen kann: eine anschauliche
 * Gegenueberstellung, eine Rechnung und eine Tabelle zum Nachschlagen. Fuer
 * die Berufsfachschule faellt dann die Rechnung weg und der Rest bleibt.
 */
(function () {
  'use strict';

  var PARAM = 'ohne';

  /* Nur Lektionen. Die Simulationen sind einzelne Werkzeuge ohne Kapitel -
     dort gibt es nichts zuzuschneiden. */
  function istLektion() {
    var m = document.querySelector('meta[name="art"]');
    return !!m && m.getAttribute('content') === 'lektion';
  }

  function haupt() { return document.querySelector('main'); }


  /* ---------- Kennungen ---------- */

  /* Kurzer Streuwert (FNV-1a) über den Text der Beschriftung. Vier Zeichen
     reichen; Doppelungen innerhalb einer Seite werden unten durchnummeriert.
     Gleiches Verfahren wie im Materialbereich, damit sich beide Bereiche
     gleich verhalten. */
  function kennung(text) {
    var h = 0x811c9dc5;
    var t = String(text).replace(/\s+/g, ' ').trim().toLowerCase();
    for (var i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(36).slice(0, 4);
  }

  function text(el) {
    return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
  }

  /* Für die Kennung: der Wortlaut ohne die Fachbegriffe. Die .term-Spans
     zeigen mal den Fachbegriff, mal die einfache Formulierung - hinge die
     Kennung daran, zeigte ein weitergegebener Link je nach Einstellung
     woanders hin. Der Schlüssel des Begriffs bleibt dagegen gleich. */
  function stabilerName(el) {
    if (!el) return '';
    var k = el.cloneNode(true);
    [].slice.call(k.querySelectorAll('.term')).forEach(function (t) {
      t.parentNode.replaceChild(
        document.createTextNode('{' + (t.getAttribute('data-t') || '') + '}'), t);
    });
    return k.textContent.replace(/\s+/g, ' ').trim();
  }


  /* ---------- Aufbau der Seite lesen ---------- */

  /* Die Abschnitte einer Karte: jede h3 samt allem, was ihr bis zur nächsten
     h3 folgt. Was vor der ersten h3 steht, gehört der Karte selbst und geht
     mit ihr. */
  function abschnitteLesen(karte, eindeutig) {
    var aus = [];
    [].slice.call(karte.children).forEach(function (kind) {
      if (kind.tagName !== 'H3') return;
      var knoten = [kind];
      var n = kind.nextElementSibling;
      while (n && n.tagName !== 'H3') {
        knoten.push(n);
        n = n.nextElementSibling;
      }
      aus.push({
        id: eindeutig(kennung(stabilerName(kind))),
        name: text(kind),
        knoten: knoten,
        marker: [kind]
      });
    });
    return aus;
  }

  /* Ein Kapitel ist ein Reiter samt seinem Abschnitt. Darin ist jede Karte mit
     eigener Überschrift einzeln abwählbar - und in der Karte jeder Abschnitt. */
  function kapitelLesen() {
    var kapitel = [];
    var vergeben = {};

    function eindeutig(roh) {
      var k = roh, n = 2;
      while (vergeben[k]) k = roh + (n++);
      vergeben[k] = true;
      return k;
    }

    [].slice.call(document.querySelectorAll('.tabs button[data-tab]'))
      .forEach(function (knopf) {
        var panel = document.getElementById('p-' + knopf.getAttribute('data-tab'));
        if (!panel) return;

        var karten = [].slice.call(panel.querySelectorAll('.karte'))
          .filter(function (k) { return !!k.querySelector('h2'); })
          .map(function (k) {
            var h2 = k.querySelector('h2');
            return {
              id: eindeutig(kennung(stabilerName(h2))),
              name: text(h2),
              knoten: k,
              abschnitte: abschnitteLesen(k, eindeutig),
              /* Wo ein data-bg-ohne stehen darf. */
              marker: [k, h2]
            };
          });

        kapitel.push({
          id: eindeutig(kennung(stabilerName(knopf))),
          name: text(knopf),
          knopf: knopf,
          panel: panel,
          karten: karten,
          marker: [knopf, panel]
        });
      });

    return kapitel;
  }


  /* ---------- Anwenden ---------- */

  function ausLesen() {
    var aus = {};
    try {
      var p = new URLSearchParams(location.search).get(PARAM);
      if (p) p.split('.').forEach(function (k) { if (k) aus[k] = true; });
    } catch (e) { /* ohne Parameter bleibt alles sichtbar */ }
    return aus;
  }

  /* Abgewählt wird mit einer Klasse, nicht mit hidden: Die Lektionen schalten
     ihre Reiter selbst über hidden um. Würde hier dasselbe Mittel benutzt,
     brächte der nächste Reiterwechsel das abgewählte Kapitel zurück. Die
     Klasse überlebt das, weil sie per !important ausblendet. */
  /* Gekennzeichnet wird mit einem Attribut, nicht mit einer Klasse: Die
     Lektionen setzen className ihrer Statuszeilen beim Neuzeichnen neu
     ("gut", "warnung", "merke") und wuerden eine Klasse von uns mitloeschen.
     Ein Attribut fasst niemand an. */
  function weg(el, an) {
    if (an) el.setAttribute('data-lk-weg', '');
    else el.removeAttribute('data-lk-weg');
  }

  function istWeg(el) {
    return !!(el && el.hasAttribute && el.hasAttribute('data-lk-weg'));
  }

  function anwenden(kapitel, aus) {
    kapitel.forEach(function (k) {
      var wegKapitel = !!aus[k.id];
      weg(k.panel, wegKapitel);
      k.knopf.hidden = wegKapitel;
      k.karten.forEach(function (ka) {
        var wegKarte = wegKapitel || !!aus[ka.id];
        weg(ka.knoten, wegKarte);
        ka.abschnitte.forEach(function (ab) {
          /* Der Abschnitt hat keinen eigenen Rahmen - jedes seiner Elemente
             muss die Kennzeichnung selbst tragen. */
          var wegAb = wegKarte || !!aus[ab.id];
          ab.knoten.forEach(function (n) { weg(n, wegAb); });
        });
      });
    });

    /* Steht der offene Reiter nicht mehr zur Verfügung, auf den ersten
       verbliebenen wechseln - sonst bleibt der Inhaltsbereich leer. */
    var offen = document.querySelector('.tabs button[aria-selected="true"]');
    if (!offen || offen.hidden) {
      var erster = [].slice.call(document.querySelectorAll('.tabs button[data-tab]'))
        .filter(function (b) { return !b.hidden; })[0];
      if (erster) erster.click();
    }
  }

  /* ---------- Bildungsgang ---------- */

  function bg() { return window.tbkBildungsgang || null; }

  /* Was der Bildungsplan dieses Bildungsgangs nicht hergibt. */
  function vorauswahl(kapitel, wahl) {
    var aus = {};
    var B = bg();
    if (!B || !wahl) return aus;
    kapitel.forEach(function (k) {
      if (!B.giltEines(k.marker, wahl)) aus[k.id] = true;
      k.karten.forEach(function (ka) {
        if (!B.giltEines(ka.marker, wahl)) aus[ka.id] = true;
        ka.abschnitte.forEach(function (ab) {
          if (!B.giltEines(ab.marker, wahl)) aus[ab.id] = true;
        });
      });
    });
    return aus;
  }

  /* Gehört die ganze Lektion nicht zum Bildungsgang, wird sie nicht versteckt -
     sie bekommt oben eine Zeile, die das sagt. */
  function seitenhinweis(wahl) {
    var alt = document.getElementById('lk-bg-seite');
    if (alt) alt.remove();
    var B = bg();
    if (!B || !wahl || B.seiteGilt(wahl)) return;

    var haupt = haupt();
    if (!haupt) return;
    var e = B.eintrag(wahl);

    var zeile = document.createElement('p');
    zeile.id = 'lk-bg-seite';
    zeile.setAttribute('data-druck', 'weg');
    zeile.innerHTML = 'Diese Lektion ist im Bildungsplan von <b></b> nicht '
      + 'vorgesehen. Sie steht trotzdem vollständig zur Verfügung.';
    zeile.querySelector('b').textContent = e ? e.name : wahl;
    haupt.insertBefore(zeile, haupt.firstChild);
  }

  function adresse(aus, wahl) {
    var u = new URL(location.href);
    var liste = Object.keys(aus).filter(function (k) { return aus[k]; });
    if (liste.length) u.searchParams.set(PARAM, liste.join('.'));
    else u.searchParams.delete(PARAM);
    var B = bg();
    if (B) {
      if (wahl) u.searchParams.set(B.PARAM, wahl);
      else u.searchParams.delete(B.PARAM);
    }
    return u.href;
  }


  /* ---------- Was gerade sichtbar ist ---------- */

  function versteckt(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      if (n.hidden || istWeg(n)) return true;
    }
    return false;
  }

  function sichtbar(liste) {
    return [].slice.call(liste).filter(function (el) { return !versteckt(el); });
  }


  /* ---------- QR-Code ---------- */

  function qrZeichnen(ziel, adr) {
    ziel.textContent = '';
    if (typeof window.tbkQr !== 'function') return;

    var m;
    try { m = window.tbkQr(adr); }
    catch (e) {
      var p = document.createElement('p');
      p.className = 'lk-hinweis';
      p.textContent = 'Der Link ist zu lang für einen QR-Code. Er lässt sich '
        + 'trotzdem kopieren.';
      ziel.appendChild(p);
      return;
    }

    var n = m.length, rand = 4, gesamt = n + 2 * rand;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + gesamt + ' ' + gesamt);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'QR-Code zu dieser Zusammenstellung');
    svg.setAttribute('shape-rendering', 'crispEdges');

    var hell = document.createElementNS(NS, 'rect');
    hell.setAttribute('width', gesamt);
    hell.setAttribute('height', gesamt);
    hell.setAttribute('fill', '#fff');
    svg.appendChild(hell);

    /* Eine einzige Pfadangabe statt tausender Rechtecke. */
    var d = [];
    for (var y = 0; y < n; y++) {
      for (var x = 0; x < n; x++) {
        if (m[y][x]) d.push('M' + (x + rand) + ' ' + (y + rand) + 'h1v1h-1z');
      }
    }
    var pfad = document.createElementNS(NS, 'path');
    pfad.setAttribute('d', d.join(''));
    pfad.setAttribute('fill', '#000');
    svg.appendChild(pfad);

    ziel.appendChild(svg);
  }


  /* ==========================================================================
     AUSGABE
     ========================================================================== */

  /* Ein Element durch dasselbe mit anderem Tag ersetzen und den Rückweg
     mitliefern. Gebraucht wird das für die Überschriften: Auf Papier trägt das
     Kapitel die h2, die Karten rücken eine Stufe tiefer. */
  function tagWechsel(el, neu) {
    var ersatz = document.createElement(neu);
    for (var i = 0; i < el.attributes.length; i++) {
      ersatz.setAttribute(el.attributes[i].name, el.attributes[i].value);
    }
    while (el.firstChild) ersatz.appendChild(el.firstChild);
    el.parentNode.replaceChild(ersatz, el);
    return function () {
      while (ersatz.firstChild) el.appendChild(ersatz.firstChild);
      ersatz.parentNode.replaceChild(el, ersatz);
    };
  }

  /* Auswahlfelder, die eine Antwort verlangen, werden auf Papier zu Kästchen
     zum Ankreuzen - erkennbar an data-druck="ankreuzen" am Feld selbst. */
  function ankreuzen() {
    var zurueck = [];
    sichtbar(haupt().querySelectorAll('select[data-druck="ankreuzen"]'))
      .forEach(function (sel) {
        var liste = document.createElement('ul');
        liste.className = 'lk-ankreuzen';
        [].slice.call(sel.options).forEach(function (o) {
          if (!o.value) return;           /* ein Platzhalter ist keine Antwort */
          var li = document.createElement('li');
          var kasten = document.createElement('span');
          kasten.className = 'lk-kasten' + (o.selected ? ' an' : '');
          li.appendChild(kasten);
          li.appendChild(document.createTextNode(o.text));
          liste.appendChild(li);
        });
        sel.replaceWith(liste);
        zurueck.push(function () { liste.replaceWith(sel); });
      });
    return function () { zurueck.forEach(function (f) { f(); }); };
  }

  /* Baut die Seite für die Ausgabe um und liefert die Umkehrung zurück.
     "alle" nimmt jedes verbliebene Kapitel mit, "offen" nur das sichtbare. */
  function aufbereiten(umfang, kapitel) {
    var zurueck = [];

    kapitel.forEach(function (k, i) {
      if (istWeg(k.panel)) return;
      if (umfang === 'offen' && k.panel.hidden) return;

      var vorher = k.panel.hidden;
      k.panel.hidden = false;
      zurueck.push(function () { k.panel.hidden = vorher; });

      /* Auf Papier gibt es keine Reiter - der Name des Reiters wird zur
         Kapitelüberschrift. */
      var h2 = document.createElement('h2');
      h2.className = 'lk-kapitel';
      if (i > 0) h2.setAttribute('data-erstes', '0');
      h2.textContent = k.name;
      k.panel.insertBefore(h2, k.panel.firstChild);
      zurueck.push(function () { h2.remove(); });

      k.karten.forEach(function (ka) {
        if (istWeg(ka.knoten)) return;
        /* Erst die Abschnitte, dann die Karte - sonst wuerde die frisch zur
           h3 gewordene Kartenueberschrift gleich mitgezaehlt. */
        ka.abschnitte.forEach(function (ab) {
          if (istWeg(ab.knoten[0])) return;
          zurueck.push(tagWechsel(ab.knoten[0], 'h4'));
        });
        var kopf = ka.knoten.querySelector('h2');
        if (kopf) zurueck.push(tagWechsel(kopf, 'h3'));
      });
    });

    /* Aufklappbares steht auf Papier offen. */
    sichtbar(haupt().querySelectorAll('details')).forEach(function (d) {
      var vorher = d.open;
      d.open = true;
      zurueck.push(function () { d.open = vorher; });
    });

    /* Zuletzt, wenn jedes Kapitel offensteht: Sonst blieben die Felder der
       noch geschlossenen Reiter Auswahlfelder. */
    zurueck.push(ankreuzen());

    return function () {
      /* Rückwärts, damit die Überschriften vor ihren Kapiteln zurückkommen. */
      for (var i = zurueck.length - 1; i >= 0; i--) zurueck[i]();
    };
  }

  /* ---------- Drucken ---------- */

  function drucken(umfang, kapitel) {
    var auf = aufbereiten(umfang, kapitel);
    var fertig = false;
    function ende() {
      if (fertig) return;
      fertig = true;
      auf();
      window.removeEventListener('afterprint', ende);
    }
    window.addEventListener('afterprint', ende);
    /* Nicht jeder Browser meldet afterprint zuverlässig - als Netz ein Timer. */
    setTimeout(ende, 60000);
    /* Ein Tick Pause, damit der Umbau gezeichnet ist, bevor der Dialog kommt. */
    setTimeout(function () { window.print(); }, 60);
  }

  /* ---------- Zeichnungen in Bilder ---------- */

  /* Word und die PDF-Datei stellen eingebettete SVG nicht dar. Beim Rastern
     müssen alle Farben und Schriftgrößen fest eingetragen werden: currentColor
     und die CSS-Variablen der Seite gelten in einer freistehenden SVG-Datei
     nicht mehr. */
  var UEBERTRAGEN = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray',
    'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-size', 'font-family',
    'font-weight', 'text-anchor', 'display'];

  function svgFest(svg) {
    var kopie = svg.cloneNode(true);
    var quelle = svg.querySelectorAll('*');
    var ziel = kopie.querySelectorAll('*');
    for (var i = 0; i < quelle.length; i++) {
      var st = getComputedStyle(quelle[i]);
      UEBERTRAGEN.forEach(function (name) {
        var w = st.getPropertyValue(name);
        if (w && w !== 'none' || name === 'fill' || name === 'stroke') {
          ziel[i].setAttribute(name, w);
        }
      });
    }
    kopie.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return kopie;
  }

  function svgZuBild(svg, breite, art) {
    return new Promise(function (fertig) {
      var vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
      var w = breite, h = Math.round(breite * vb[3] / vb[2]);
      var kopie = svgFest(svg);
      kopie.setAttribute('width', w);
      kopie.setAttribute('height', h);

      var quelle = new XMLSerializer().serializeToString(kopie);
      var bild = new Image();
      bild.onload = function () {
        var c = document.createElement('canvas');
        c.width = w * 2;
        c.height = h * 2;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(bild, 0, 0, c.width, c.height);
        try {
          fertig({
            daten: art === 'jpeg' ? c.toDataURL('image/jpeg', 0.88) : c.toDataURL('image/png'),
            w: c.width, h: c.height
          });
        } catch (e) { fertig(null); }
      };
      bild.onerror = function () { fertig(null); };
      bild.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(quelle);
    });
  }

  /* ---------- Aufräumen für die Ausgabe ---------- */

  function dateiname() {
    var t = (document.title || 'lektion').replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ').trim();
    return t.slice(0, 80) || 'lektion';
  }

  /* Kästen wie "Merke" tragen ihren Text oft frei im div, ohne Absatz. Die
     Ausgabe geht die Seite aber von Block zu Block durch - loser Text fiele
     dabei heraus. Also bekommt er hier einen Absatz.

     Nur div und section: Bei einem span oder strong stünde der Absatz sonst
     mitten im Satz. */
  var BLOCK = /^(P|LI|UL|OL|H1|H2|H3|H4|H5|H6|TABLE|THEAD|TBODY|TR|TD|TH|IMG|HR|FIGCAPTION|FIGURE|DETAILS|SCRIPT|STYLE|SVG|BUTTON|SELECT|INPUT|DIV|SECTION)$/;

  function absaetzeNachziehen(wurzel) {
    [].slice.call(wurzel.querySelectorAll('div, section')).forEach(function (el) {
      var gruppen = [], sammeln = [];
      [].slice.call(el.childNodes).forEach(function (n) {
        if (n.nodeType === 1 && BLOCK.test(n.tagName)) {
          if (sammeln.length) { gruppen.push(sammeln); sammeln = []; }
          return;
        }
        sammeln.push(n);
      });
      if (sammeln.length) gruppen.push(sammeln);

      gruppen.forEach(function (gruppe) {
        var inhalt = gruppe.map(function (n) { return n.textContent; }).join('');
        if (!inhalt.replace(/\s+/g, '')) return;
        var p = document.createElement('p');
        gruppe[0].parentNode.insertBefore(p, gruppe[0]);
        gruppe.forEach(function (n) { p.appendChild(n); });
      });
    });
  }

  /* Alles herausnehmen, was auf Papier nichts verloren hat: die Bedienung der
     Seite und was ausdrücklich abgewählt wurde. */
  function saeubern(wurzel) {
    ['script', '.tabs', '.schalter', '.steuerung', '.wahl', '[data-lk-weg]',
      '#tbk-leiste', '#lk-tafel', '#lk-holen']
      .forEach(function (wahl) {
        [].slice.call(wurzel.querySelectorAll(wahl)).forEach(function (e) { e.remove(); });
      });
    [].slice.call(wurzel.querySelectorAll('[data-druck="weg"]')).forEach(function (e) {
      e.remove();
    });

    /* Schaltflächen sind Bedienung und sagen auf Papier nichts. Zwei Ausnahmen:
       Steckt eine Zeichnung darin, bleibt der Inhalt; und trägt die Schaltfläche
       data-druck="text", ist ihre Beschriftung selbst der Inhalt. */
    [].slice.call(wurzel.querySelectorAll('button')).forEach(function (b) {
      if (b.querySelector('img, svg')) {
        var huelle = document.createElement('div');
        while (b.firstChild) huelle.appendChild(b.firstChild);
        b.replaceWith(huelle);
      } else if (b.dataset.druck === 'text') {
        var wort = document.createElement('strong');
        wort.textContent = b.textContent;
        b.replaceWith(wort);
      } else {
        b.remove();
      }
    });

    [].slice.call(wurzel.querySelectorAll('[hidden]')).forEach(function (e) { e.remove(); });

    /* Ein Schieberegler mit Ausgabefeld daneben zeigt denselben Wert zweimal.
       Das Ausgabefeld ist das bessere von beiden: Es trägt Einheit und
       Rundung. */
    [].slice.call(wurzel.querySelectorAll('input[type="range"]')).forEach(function (e) {
      var n = e.nextElementSibling;
      if (n && n.tagName === 'OUTPUT') e.remove();
    });

    /* Eingaben als Text festhalten - Word kann mit Formularfeldern nichts
       anfangen. */
    [].slice.call(wurzel.querySelectorAll('input,select,output,textarea'))
      .forEach(function (e) {
        var wert = e.tagName === 'SELECT'
          ? (e.options[e.selectedIndex] || {}).text || ''
          : (e.value != null ? e.value : e.textContent);
        var span = document.createElement('strong');
        span.textContent = wert || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0';
        if (!wert) span.style.borderBottom = '1px solid #999';
        e.replaceWith(span);
      });

    /* Aus dem Aufklapp-Element wird eine schlichte Überschrift. */
    [].slice.call(wurzel.querySelectorAll('details')).forEach(function (d) {
      var ersatz = document.createElement('div');
      [].slice.call(d.childNodes).forEach(function (k) {
        if (k.tagName === 'SUMMARY') {
          var p = document.createElement('p');
          p.className = 'lk-aufgabe';
          p.textContent = k.textContent;
          ersatz.appendChild(p);
        } else {
          ersatz.appendChild(k);
        }
      });
      d.replaceWith(ersatz);
    });

    absaetzeNachziehen(wurzel);
    return wurzel;
  }

  /* ---------- Word ---------- */

  var WORD_CSS = ''
    + '@page{size:A4;margin:2cm}'
    + 'body{font-family:Calibri,"Segoe UI",Arial,sans-serif;font-size:11pt;color:#000}'
    + 'h1{font-size:19pt;margin:0 0 6pt}'
    + 'h2{font-size:15pt;margin:18pt 0 4pt;border-top:1pt solid #999;padding-top:8pt}'
    + 'h3{font-size:12.5pt;margin:12pt 0 3pt}'
    + 'h4{font-size:11pt;margin:10pt 0 2pt}'
    + 'p{margin:0 0 6pt}'
    + 'ul,ol{margin:0 0 6pt 18pt}'
    + 'table{border-collapse:collapse;width:100%;font-size:10pt;margin:6pt 0}'
    + 'th,td{border:0.5pt solid #999;padding:4pt 6pt;text-align:left;vertical-align:top}'
    + 'th{background:#eee}'
    + '.karte{margin:0 0 10pt}'
    + '.merke,.warnung,.gut,.zwei>div{border:0.5pt solid #999;padding:8pt 10pt;margin:8pt 0}'
    + '.sub,.lead,.fussnote,.hinweis{color:#555}'
    + '.fussnote,.hinweis{font-size:9pt}'
    + '.lk-aufgabe{font-weight:bold;margin:8pt 0 4pt}'
    + 'img{max-width:100%}'
    + '.lk-ankreuzen{list-style:none;margin:4pt 0 6pt;padding:0}'
    + '.lk-ankreuzen li{margin:0 0 3pt}'
    + '.lk-kasten{display:inline-block;width:9pt;height:9pt;margin-right:6pt;'
    + 'border:0.75pt solid #333}'
    + '.lk-kasten.an{background:#333}'
    + '.lk-hinweis{border:0.5pt solid #999;background:#f2f2f2;padding:8pt 10pt;'
    + 'margin:0 0 12pt;font-size:10pt}';

  /* Base64 in Zeilen zu 76 Zeichen - so will es MIME. */
  function base64Zeilen(b64) {
    return (b64.match(/.{1,76}/g) || []).join('\r\n');
  }

  function textAlsBase64(inhalt) {
    return base64Zeilen(btoa(unescape(encodeURIComponent(inhalt))));
  }

  /* Ein Web-Archiv aus dem HTML und den Bildern. Word lädt keine Bilder aus
     data:-Adressen, wohl aber Teile eines Archivs. */
  function webArchiv(html, bilder) {
    var grenze = '----=_TBK_Lektion';
    var basis = 'file:///C:/tbk/';
    var teile = [
      'MIME-Version: 1.0',
      'Content-Type: multipart/related; type="text/html"; boundary="' + grenze + '"',
      '',
      'Dieses Dokument ist ein Web-Archiv. Es öffnet sich in Word und in jedem Browser.',
      ''
    ];

    function teil(kopf, inhalt) {
      teile.push('--' + grenze);
      kopf.forEach(function (z) { teile.push(z); });
      teile.push('');
      teile.push(inhalt);
      teile.push('');
    }

    teil([
      'Content-Type: text/html; charset="utf-8"',
      'Content-Transfer-Encoding: base64',
      'Content-Location: ' + basis + 'lektion.htm'
    ], textAlsBase64(html));

    bilder.forEach(function (b) {
      teil([
        'Content-Type: image/png',
        'Content-Transfer-Encoding: base64',
        'Content-Location: ' + basis + b.name
      ], base64Zeilen(b.b64));
    });

    teile.push('--' + grenze + '--');
    teile.push('');
    return teile.join('\r\n');
  }

  /* Datei anbieten. Der Umweg über einen Link ist der einzige Weg, dem Browser
     einen Dateinamen mitzugeben. */
  function speichern(inhalt, typ, endung) {
    var blob = inhalt instanceof Blob ? inhalt : new Blob([inhalt], { type: typ });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = dateiname() + endung;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 4000);
  }

  var HINWEIS = 'Ausdruck aus einer Lektion von t-bk.de. Diese Seite ist '
    + 'eigentlich interaktiv – Schieberegler, Eingabefelder und Schrittfolgen '
    + 'stehen hier so, wie sie beim Erzeugen dieser Datei eingestellt waren.';

  function wordDatei(umfang, kapitel, melden) {
    var auf = aufbereiten(umfang, kapitel);
    var quelle = haupt();
    var svgs = sichtbar(quelle.querySelectorAll('svg'));

    /* Wer die Seite im dunklen Modus liest, bekäme sonst weiße Striche auf
       weißem Papier: Die Zeichnungen übernehmen beim Rastern die Farben, die
       gerade gelten. Also für die Dauer der Umwandlung auf hell schalten. */
    document.documentElement.classList.add('lk-hell');
    melden('Zeichnungen werden umgewandelt …');

    Promise.all(svgs.map(function (s) { return svgZuBild(s, 620); }))
      .then(function (rohbilder) {
        document.documentElement.classList.remove('lk-hell');

        var bilder = [];
        var kopie = quelle.cloneNode(true);
        var kopien = [].slice.call(kopie.querySelectorAll('svg'));
        var roh = [].slice.call(quelle.querySelectorAll('svg'));

        roh.forEach(function (s, i) {
          var stelle = kopien[i];
          if (!stelle) return;
          var k = svgs.indexOf(s);
          if (k === -1 || !rohbilder[k]) { stelle.remove(); return; }

          var name = 'bild' + (bilder.length + 1) + '.png';
          bilder.push({
            name: name,
            b64: rohbilder[k].daten.replace(/^data:image\/png;base64,/, '')
          });

          var img = document.createElement('img');
          img.setAttribute('src', name);
          /* Gerastert wird doppelt so fein wie dargestellt - im Dokument zählt
             die halbe Größe, sonst sprengt das Bild die Seite. */
          img.setAttribute('width', Math.round(rohbilder[k].w / 2));
          img.setAttribute('height', Math.round(rohbilder[k].h / 2));
          stelle.replaceWith(img);
        });

        saeubern(kopie);

        var kopf = document.querySelector('header');
        var kopfHtml = kopf ? saeubern(kopf.cloneNode(true)).innerHTML : '';

        var html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" '
          + 'xmlns:w="urn:schemas-microsoft-com:office:word" '
          + 'xmlns="http://www.w3.org/TR/REC-html40"><head>'
          + '<meta http-equiv="Content-Type" content="text/html; charset=utf-8">'
          + '<title>' + document.title.replace(/</g, '&lt;') + '</title>'
          + '<style>' + WORD_CSS + '</style></head><body>'
          + kopfHtml
          + '<p class="lk-hinweis">' + HINWEIS + '</p>'
          + kopie.innerHTML
          + '</body></html>';

        auf();
        speichern(webArchiv(html, bilder), 'application/msword', '.doc');
        melden('');
      })
      .catch(function () {
        document.documentElement.classList.remove('lk-hell');
        auf();
        melden('Die Datei konnte nicht erzeugt werden.');
      });
  }

  /* ---------- PDF als Datei ---------- */

  /* Aus einer data:-Adresse die reinen Bytes holen. */
  function bytesAusDatenUrl(url) {
    var roh = atob(url.split(',')[1]);
    var b = new Uint8Array(roh.length);
    for (var i = 0; i < roh.length; i++) b[i] = roh.charCodeAt(i);
    return b;
  }

  /* Einen Block in Textläufe zerlegen; fett und kursiv bleiben erhalten. */
  function laeufe(el) {
    var aus = [];
    (function gehe(k, fett, kursiv) {
      [].slice.call(k.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var t = n.nodeValue.replace(/\s+/g, ' ');
          if (t) aus.push({ text: t, fett: fett, kursiv: kursiv });
          return;
        }
        if (n.nodeType !== 1 || n.hidden) return;
        var name = n.tagName;
        if (name === 'BR') { aus.push({ text: ' ', fett: fett, kursiv: kursiv }); return; }
        gehe(n,
          fett || name === 'STRONG' || name === 'B' || name === 'TH',
          kursiv || name === 'EM' || name === 'I');
      });
    })(el, false, false);
    return aus;
  }

  var BLOECKE = 'H1,H2,H3,H4,P,LI,TABLE,IMG,HR,FIGCAPTION';

  /* Die aufbereitete Seite einmal von oben nach unten durchgehen und in das
     PDF schreiben. Bewusst schlicht: Überschriften, Absätze, Listen, Tabellen,
     Zeichnungen. Für ein Handout reicht das. */
  function pdfAufbauen(p, wurzel, bilder) {
    var gesehen = [];

    function tabelle(tab) {
      [].slice.call(tab.rows).forEach(function (r) {
        var t = [].slice.call(r.cells).map(function (c) {
          return c.textContent.replace(/\s+/g, ' ').trim();
        }).filter(Boolean).join('  ·  ');
        if (!t) return;
        p.absatz([{ text: t, fett: r.parentNode.tagName === 'THEAD' }],
                 { groesse: 9.5, abstand: 2, einzug: 10 });
      });
      p.abstand(4);
    }

    [].slice.call(wurzel.querySelectorAll(BLOECKE)).forEach(function (el) {
      if (el.hidden) return;
      for (var i = 0; i < gesehen.length; i++) {
        if (gesehen[i].contains(el)) return;
      }

      if (el.tagName === 'TABLE') { gesehen.push(el); tabelle(el); return; }

      if (el.tagName === 'IMG') {
        var nr = el.getAttribute('data-bild');
        var b = nr !== null && bilder[nr];
        if (b) p.bild(b.bytes, b.w, b.h, 430);
        return;
      }

      if (el.tagName === 'HR') { p.linie(); return; }

      if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3'
          || el.tagName === 'H4') {
        var t = el.textContent.replace(/\s+/g, ' ').trim();
        if (!t) return;
        /* Ein neues Kapitel fängt auf einer neuen Seite an - wie im
           Druckweg, der das über break-before:page macht. */
        if (el.classList.contains('lk-kapitel')
            && el.getAttribute('data-erstes') === '0') p.seitenwechsel();
        p.ueberschrift(t, el.tagName === 'H2' ? 2 : (el.tagName === 'H1' ? 1 : 3));
        return;
      }

      var stuecke = laeufe(el);
      if (!stuecke.length) return;
      if (el.tagName === 'LI') {
        /* Ein Kästchen, das die Zeichnung nicht hergibt: als Text setzen,
           sonst bliebe im PDF nur ein Aufzählungspunkt. */
        var kasten = el.querySelector('.lk-kasten');
        var zeichen = kasten ? (kasten.classList.contains('an') ? '[x] ' : '[  ] ') : '• ';
        p.absatz([{ text: zeichen }].concat(stuecke), { einzug: 12, abstand: 2 });
      } else {
        p.absatz(stuecke);
      }
    });
  }

  function pdfDatei(umfang, kapitel, melden) {
    if (typeof window.tbkPdf !== 'function') {
      melden('Der PDF-Baustein fehlt – bitte den Weg über den Druckdialog nehmen.');
      return;
    }

    var auf = aufbereiten(umfang, kapitel);
    var quelle = haupt();
    var svgs = sichtbar(quelle.querySelectorAll('svg'));

    document.documentElement.classList.add('lk-hell');
    melden('Das PDF wird gebaut …');

    Promise.all(svgs.map(function (s) { return svgZuBild(s, 620, 'jpeg'); }))
      .then(function (rohbilder) {
        document.documentElement.classList.remove('lk-hell');

        var kopie = quelle.cloneNode(true);
        var kopien = [].slice.call(kopie.querySelectorAll('svg'));
        var roh = [].slice.call(quelle.querySelectorAll('svg'));
        var bilder = {};

        roh.forEach(function (s, i) {
          var stelle = kopien[i];
          if (!stelle) return;
          var k = svgs.indexOf(s);
          if (k === -1 || !rohbilder[k]) { stelle.remove(); return; }
          var nr = Object.keys(bilder).length;
          bilder[nr] = {
            bytes: bytesAusDatenUrl(rohbilder[k].daten),
            w: rohbilder[k].w, h: rohbilder[k].h
          };
          var platz = document.createElement('img');
          platz.setAttribute('data-bild', String(nr));
          stelle.replaceWith(platz);
        });

        saeubern(kopie);

        var p = window.tbkPdf();
        var kopf = document.querySelector('header');
        if (kopf) {
          var h1 = kopf.querySelector('h1');
          if (h1) p.ueberschrift(h1.textContent.trim(), 1);
          var lead = kopf.querySelector('.lead');
          if (lead) {
            p.absatz([{ text: lead.textContent.replace(/\s+/g, ' ').trim(), kursiv: true }]);
          }
        }
        p.absatz([{ text: HINWEIS, kursiv: true }], { groesse: 8.5 });
        p.linie();

        pdfAufbauen(p, kopie, bilder);

        auf();
        speichern(p.fertig(), 'application/pdf', '.pdf');
        melden('');
      })
      .catch(function () {
        document.documentElement.classList.remove('lk-hell');
        auf();
        melden('Das PDF konnte nicht erzeugt werden.');
      });
  }


  /* ==========================================================================
     OBERFLÄCHE
     ========================================================================== */

  /* Die Leiste unten rechts teilen sich beide Fenster. Wer zuerst kommt, legt
     sie an - dieselbe Kennung wie im Materialbereich, damit auch der Umschalter
     hell/dunkel sie kennt. */
  function leiste() {
    var l = document.getElementById('tbk-leiste');
    if (!l) {
      l = document.createElement('div');
      l.id = 'tbk-leiste';
      document.body.appendChild(l);
    }
    return l;
  }

  var CSS = ''
    /* Abgewähltes ist weg - mit !important, weil die Lektionen ihre Reiter
       selbst über hidden steuern und sonst dagegen arbeiten würden. */
    + '[data-lk-weg]{display:none!important}'

    + '#tbk-leiste{position:fixed;right:16px;bottom:16px;z-index:2147483646;'
    + 'display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}'
    + '@media (max-width:640px){#tbk-leiste{right:8px;bottom:8px;left:8px}}'
    + '@media print{#tbk-leiste{display:none!important}}'

    + '#lk-knopf,#lk-holen-knopf{display:inline-flex;align-items:center;gap:8px;'
    + 'cursor:pointer;font:600 14px/1 system-ui,-apple-system,"Segoe UI",Roboto,'
    + 'Helvetica,Arial,sans-serif;padding:11px 16px;border-radius:999px}'
    + '#lk-knopf{color:#fff;background:#1e3a8a;border:1px solid #1e3a8a;'
    + 'box-shadow:0 2px 6px rgba(0,0,0,.2),0 10px 28px rgba(0,0,0,.18)}'
    + '#lk-knopf:hover{filter:brightness(1.15)}'
    + '#lk-holen-knopf{color:#0f172a;background:#fff;border:1px solid #cbd5e1;'
    + 'box-shadow:0 2px 6px rgba(0,0,0,.18),0 10px 28px rgba(0,0,0,.16)}'
    + '#lk-holen-knopf:hover{border-color:#1e3a8a;color:#1e3a8a}'
    + '#lk-knopf:focus-visible,#lk-holen-knopf:focus-visible{'
    + 'outline:2px solid #0f172a;outline-offset:2px}'

    + '.lk-tafel{position:fixed;right:16px;bottom:74px;z-index:2147483647;'
    + 'width:min(390px,calc(100vw - 32px));max-height:min(76vh,680px);'
    /* Spalte statt einfachem Block: die Liste scrollt, Link und QR-Code
       bleiben unten stehen. Sie sind der Zweck des Fensters. */
    + 'display:flex;flex-direction:column;background:#fff;color:#0f172a;'
    + 'border:1px solid #cbd5e1;border-radius:14px;'
    + 'box-shadow:0 4px 12px rgba(0,0,0,.18),0 24px 60px rgba(0,0,0,.28);'
    + 'font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;'
    + 'padding:18px 20px 20px}'
    + '.lk-tafel[hidden]{display:none}'
    + '.lk-tafel h2{font-size:16px;margin:0 0 4px;padding:0;border:0;color:inherit}'
    + '.lk-tafel p{margin:0 0 12px}'
    + '.lk-hinweis{color:#64748b;font-size:12.5px}'
    + '.lk-schliessen{position:absolute;top:12px;right:14px;border:0;background:none;'
    + 'cursor:pointer;font:700 20px/1 inherit;color:#64748b;padding:4px 6px}'
    + '.lk-schliessen:hover{color:#0f172a}'

    + '.lk-liste{list-style:none;margin:0 0 4px;padding:0 2px 0 0;'
    + 'overflow:auto;flex:1 1 auto;min-height:60px}'
    + '.lk-liste ul{list-style:none;margin:2px 0 8px;padding:0 0 0 26px}'
    + '.lk-liste li{margin:0 0 2px}'
    + '.lk-liste label{display:flex;gap:8px;align-items:flex-start;cursor:pointer;'
    + 'padding:3px 4px;border-radius:6px}'
    + '.lk-liste label:hover{background:#f1f5f9}'
    + '.lk-liste input{margin:3px 0 0;flex:0 0 auto;accent-color:#1e3a8a}'
    + '.lk-kapitelzeile > label{font-weight:700}'
    + '.lk-kapitelzeile > ul > li > label{font-weight:600}'
    + '.lk-liste ul ul{padding-left:22px}'
    + '.lk-liste ul ul li > label{font-weight:400}'
    + '.lk-liste li.lk-ab > label{opacity:.5;text-decoration:line-through}'

    + '.lk-werkzeuge{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px;flex:0 0 auto}'
    + '.lk-werkzeuge button{font:600 13px/1 inherit;cursor:pointer;padding:7px 12px;'
    + 'border-radius:999px;background:none;color:inherit;border:1px solid #cbd5e1}'
    + '.lk-werkzeuge button:hover{border-color:#1e3a8a;color:#1e3a8a}'
    + '#lk-bildungsgang{margin:0 0 12px;padding:0 0 12px;border-bottom:1px solid #e2e8f0}'
    + '#lk-bg-seite{margin:0 0 18px;padding:11px 14px;border-radius:10px;'
    + 'border:1px solid #cbd5e1;background:#f8fafc;color:#64748b;'
    + 'font:14px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}'
    + '#lk-bg-seite b{color:#0f172a}'
    + '@media print{#lk-bg-seite{display:none!important}}'
    + '#lk-teilen{border-top:1px solid #e2e8f0;margin-top:4px;padding-top:12px;flex:0 0 auto}'
    + '#lk-link{width:100%;font:12.5px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'
    + 'padding:8px 10px;border-radius:8px;color:inherit;background:#f8fafc;'
    + 'border:1px solid #cbd5e1}'
    + '#lk-qr{display:flex;justify-content:center;margin:14px 0 4px}'
    + '#lk-qr svg{width:148px;height:148px;border-radius:8px}'

    + '#lk-holen fieldset{border:0;margin:0 0 14px;padding:0}'
    + '#lk-holen legend{font-weight:700;padding:0;margin:0 0 6px}'
    + '#lk-holen label{display:flex;gap:8px;align-items:flex-start;cursor:pointer;'
    + 'padding:5px 4px;border-radius:6px}'
    + '#lk-holen label:hover{background:#f1f5f9}'
    + '#lk-holen input{margin:2px 0 0;flex:0 0 auto;accent-color:#1e3a8a}'
    + '.lk-warnung{border:1px solid #cbd5e1;border-radius:10px;padding:10px 12px;'
    + 'font-size:12.5px;color:#64748b;margin:0 0 14px}'
    + '.lk-knoepfe{display:flex;gap:8px;flex-wrap:wrap}'
    + '.lk-knoepfe button{font:600 13px/1 inherit;cursor:pointer;padding:9px 14px;'
    + 'border-radius:999px;border:1px solid #1e3a8a;background:#1e3a8a;color:#fff}'
    + '.lk-knoepfe button.leise{background:none;color:inherit;border-color:#cbd5e1}'
    + '.lk-knoepfe button:hover{filter:brightness(1.15)}'
    + '.lk-knoepfe button.leise:hover{border-color:#1e3a8a;color:#1e3a8a;filter:none}'
    + '#lk-stand{font-size:12.5px;color:#64748b;margin:10px 0 0;min-height:1.2em}'
    + '@media (max-width:640px){.lk-tafel{right:8px;left:8px;bottom:74px;width:auto;'
    + 'max-height:70vh}}'

    /* Die Kapitelüberschrift entsteht nur für die Ausgabe. */
    + '.lk-kapitel{font-size:1.45rem;margin:0 0 14px;padding-bottom:6px;'
    + 'border-bottom:2px solid #cbd5e1}'
    + '.lk-ankreuzen{list-style:none;margin:6px 0 0;padding:0}'
    + '.lk-ankreuzen li{display:flex;gap:9px;align-items:flex-start;margin:0 0 5px}'
    + '.lk-kasten{flex:0 0 auto;width:13px;height:13px;margin-top:3px;'
    + 'border:1.4px solid currentColor;border-radius:2px;position:relative}'
    + '.lk-kasten.an::after{content:"";position:absolute;left:2px;top:2px;'
    + 'right:2px;bottom:2px;background:currentColor}'

    /* Für die Ausgabe: keine Bedienelemente, keine Umbrüche mitten in einer
       Zeichnung, jedes Kapitel auf einer neuen Seite. */
    + '@media print{'
    + '*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}'
    + 'body{background:#fff}'
    + '.lk-tafel,#tbk-leiste,.tabs,.schalter,.steuerung,.wahl{display:none!important}'
    + '.wrap{padding-top:0!important;max-width:none!important}'
    + '.karte{border:0!important;box-shadow:none!important;padding:0!important;'
    + 'margin:0 0 14px!important;break-inside:auto}'
    + '.lk-kapitel[data-erstes="0"]{break-before:page}'
    + '.zeichnung,figure,table{break-inside:avoid}'
    + 'h2,h3,h4{break-after:avoid}'
    + '}'

    /* Nur während des Rasterns gesetzt: Die Zeichnungen sollen auch dann in
       ihren echten Farben herauskommen, wenn die Seite gerade umgekehrt
       dargestellt wird (assets/thema-werkzeug.css). */
    + 'html.lk-hell,html.lk-hell[data-thema],html.lk-hell[data-thema-effektiv]{'
    + 'filter:none!important;background:#fff!important}';


  /* ---------- Fenster "Lektion anpassen" ---------- */

  function anpassenBauen(kapitel, aus, knopfBeschriften, zustand) {
    var tafel = document.createElement('div');
    tafel.id = 'lk-tafel';
    tafel.className = 'lk-tafel';
    tafel.hidden = true;
    tafel.setAttribute('role', 'dialog');
    tafel.setAttribute('aria-label', 'Lektion anpassen');

    var liste = kapitel.map(function (k) {
      var kinder = k.karten.map(function (ka) {
        var enkel = ka.abschnitte.map(function (ab) {
          return '<li data-id="' + ab.id + '"><label>'
            + '<input type="checkbox" data-id="' + ab.id + '"><span></span></label></li>';
        }).join('');
        return '<li data-id="' + ka.id + '"><label>'
          + '<input type="checkbox" data-id="' + ka.id + '"><span></span></label>'
          + (enkel ? '<ul>' + enkel + '</ul>' : '')
          + '</li>';
      }).join('');
      return '<li class="lk-kapitelzeile" data-id="' + k.id + '"><label>'
        + '<input type="checkbox" data-id="' + k.id + '"><span></span></label>'
        + (kinder ? '<ul>' + kinder + '</ul>' : '')
        + '</li>';
    }).join('');

    tafel.innerHTML =
      '<button type="button" class="lk-schliessen" aria-label="Schließen">&times;</button>'
      + '<h2>Lektion anpassen</h2>'
      + '<div id="lk-bildungsgang"></div>'
      + '<p class="lk-hinweis">Häkchen entfernen, um Kapitel, einzelne Karten oder '
      + 'Abschnitte darin wegzulassen. Die Auswahl wirkt sofort auf der Seite hinter '
      + 'diesem Fenster.</p>'
      + '<ul class="lk-liste">' + liste + '</ul>'
      + '<div class="lk-werkzeuge">'
      + '<button type="button" id="lk-alle">Alles wieder einblenden</button>'
      + '</div>'
      + '<div id="lk-teilen">'
      + '<p class="lk-hinweis" style="margin-bottom:6px">Link zu dieser Zusammenstellung:</p>'
      + '<input type="text" id="lk-link" readonly>'
      + '<div class="lk-werkzeuge" style="margin-top:8px;margin-bottom:0">'
      + '<button type="button" id="lk-kopieren">Link kopieren</button>'
      + '</div>'
      + '<div id="lk-qr"></div>'
      + '<p class="lk-hinweis">Der QR-Code führt auf dieselbe Zusammenstellung.</p>'
      + '</div>';

    document.body.appendChild(tafel);

    /* Beschriftungen als Text setzen, nicht über innerHTML - die Überschriften
       können alles Mögliche enthalten. */
    function beschriften(id, name) {
      tafel.querySelector('li[data-id="' + id + '"] > label > span').textContent = name;
    }
    kapitel.forEach(function (k) {
      beschriften(k.id, k.name);
      k.karten.forEach(function (ka) {
        beschriften(ka.id, ka.name);
        ka.abschnitte.forEach(function (ab) { beschriften(ab.id, ab.name); });
      });
    });

    var kaestchen = [].slice.call(tafel.querySelectorAll('.lk-liste input'));

    function stand() {
      kaestchen.forEach(function (k) {
        k.checked = !aus[k.dataset.id];
        k.closest('li').classList.toggle('lk-ab', !!aus[k.dataset.id]);
      });
      /* Was in einem abgewählten Teil steckt, ist ohnehin weg. */
      kapitel.forEach(function (k) {
        k.karten.forEach(function (ka) {
          tafel.querySelector('input[data-id="' + ka.id + '"]').disabled = !!aus[k.id];
          ka.abschnitte.forEach(function (ab) {
            tafel.querySelector('input[data-id="' + ab.id + '"]').disabled =
              !!aus[k.id] || !!aus[ka.id];
          });
        });
      });

      var href = adresse(aus, zustand.wahl);
      tafel.querySelector('#lk-link').value = href;
      qrZeichnen(tafel.querySelector('#lk-qr'), href);
      knopfBeschriften(Object.keys(aus).length, zustand.wahl);
    }

    function aendern() {
      anwenden(kapitel, aus);
      /* Die Adresse mitziehen, damit ein Neuladen den Stand behält. */
      try { history.replaceState(null, '', adresse(aus, zustand.wahl)); } catch (e) { /* file:// */ }
      stand();
    }

    /* Die Wahl setzt die Häkchen neu - alles Handgemachte wird dabei
       verworfen, das ist der Sinn einer Voreinstellung. */
    var B = bg();
    var feld = null;
    if (B) {
      function uebernehmen(neu) {
        zustand.wahl = neu;
        Object.keys(aus).forEach(function (k) { delete aus[k]; });
        var vor = vorauswahl(kapitel, neu);
        Object.keys(vor).forEach(function (k) { aus[k] = true; });
        seitenhinweis(neu);
        aendern();
      }
      var w = B.waehler(uebernehmen);
      feld = w.feld;
      tafel.querySelector('#lk-bildungsgang').appendChild(w.knoten);

      var erklaerung = document.createElement('p');
      erklaerung.className = 'bg-hinweis';
      erklaerung.textContent = 'Setzt die Auswahl auf das, was der Bildungsplan '
        + 'vorsieht. Danach lässt sich alles weiter verändern.';
      tafel.querySelector('#lk-bildungsgang').appendChild(erklaerung);

      B.beiFremderWahl(function (neu) {
        feld.value = neu;
        uebernehmen(neu);
      });
    }

    kaestchen.forEach(function (k) {
      k.addEventListener('change', function () {
        if (k.checked) delete aus[k.dataset.id]; else aus[k.dataset.id] = true;
        aendern();
      });
    });

    tafel.querySelector('#lk-alle').addEventListener('click', function () {
      Object.keys(aus).forEach(function (k) { delete aus[k]; });
      /* Sonst stünde beim nächsten Laden wieder der Zuschnitt des
         Bildungsgangs da - "alles" hieße dann nur "alles bis zum Neuladen". */
      if (B && zustand.wahl) {
        zustand.wahl = '';
        B.schreiben('');
        if (feld) feld.value = '';
        seitenhinweis('');
      }
      aendern();
    });

    tafel.querySelector('#lk-kopieren').addEventListener('click', function () {
      var feld = tafel.querySelector('#lk-link');
      var knopfK = tafel.querySelector('#lk-kopieren');
      feld.select();
      function melden(ok) {
        knopfK.textContent = ok ? 'Kopiert' : 'Bitte von Hand kopieren';
        setTimeout(function () { knopfK.textContent = 'Link kopieren'; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(feld.value)
          .then(function () { melden(true); }, function () { melden(false); });
      } else {
        try { melden(document.execCommand('copy')); } catch (e) { melden(false); }
      }
    });

    return { tafel: tafel, stand: stand };
  }


  /* ---------- Fenster "Herunterladen" ---------- */

  function holenBauen(kapitel) {
    var tafel = document.createElement('div');
    tafel.id = 'lk-holen';
    tafel.className = 'lk-tafel';
    tafel.hidden = true;
    tafel.setAttribute('role', 'dialog');
    tafel.setAttribute('aria-label', 'Lektion herunterladen');
    tafel.innerHTML =
      '<button type="button" class="lk-schliessen" aria-label="Schließen">&times;</button>'
      + '<h2>Herunterladen</h2>'
      + '<fieldset><legend>Umfang</legend>'
      + '<label><input type="radio" name="lk-umfang" value="alle" checked>'
      + '<span>alle Kapitel, eines nach dem anderen</span></label>'
      + '<label><input type="radio" name="lk-umfang" value="offen">'
      + '<span>nur das Kapitel, das gerade offen ist</span></label>'
      + '</fieldset>'
      + '<p class="lk-warnung">Auf Papier gibt es keine Reiter &ndash; aus jedem '
      + 'Kapitel wird ein Abschnitt. Ausgegeben wird der Stand, der gerade auf dem '
      + 'Bildschirm steht, auch die Auswahl aus <em>Lektion anpassen</em>. '
      + 'Schieberegler und Schrittfolgen lassen sich auf Papier nicht bedienen; '
      + 'sie erscheinen mit den zuletzt eingestellten Werten.</p>'
      + '<div class="lk-knoepfe">'
      + '<button type="button" id="lk-pdf-datei">PDF herunterladen</button>'
      + '<button type="button" id="lk-pdf" class="leise">Drucken / als PDF</button>'
      + '<button type="button" id="lk-word" class="leise">Als Word</button>'
      + '</div>'
      + '<p class="lk-hinweis" style="margin:10px 0 0">Der Weg über den Druckdialog '
      + 'gibt das schönere Ergebnis &ndash; dort als Ziel „Als PDF speichern“ '
      + 'wählen. Der Download kommt ohne Dialog aus und setzt schlichter.</p>'
      + '<p id="lk-stand"></p>';

    document.body.appendChild(tafel);

    function umfang() {
      return tafel.querySelector('input[name="lk-umfang"]:checked').value;
    }
    function melden(t) { tafel.querySelector('#lk-stand').textContent = t; }

    tafel.querySelector('#lk-pdf-datei').addEventListener('click', function () {
      pdfDatei(umfang(), kapitel, melden);
    });
    tafel.querySelector('#lk-pdf').addEventListener('click', function () {
      melden('Der Druckdialog öffnet sich – dort „Als PDF speichern“ wählen.');
      drucken(umfang(), kapitel);
      setTimeout(function () { melden(''); }, 8000);
    });
    tafel.querySelector('#lk-word').addEventListener('click', function () {
      wordDatei(umfang(), kapitel, melden);
    });

    return { tafel: tafel, melden: melden };
  }


  /* ---------- Zusammenbauen ---------- */

  function bauen(kapitel) {
    var stil = document.createElement('style');
    stil.textContent = CSS;
    document.head.appendChild(stil);

    var B = bg();
    var zustand = { wahl: B ? B.lesen() : '' };

    /* Steht ein Zuschnitt in der Adresse, gilt der: Jemand hat genau diese
       Zusammenstellung weitergegeben. Sonst entscheidet der Bildungsgang. */
    var aus;
    try {
      aus = new URLSearchParams(location.search).has(PARAM)
        ? ausLesen() : vorauswahl(kapitel, zustand.wahl);
    } catch (e) { aus = vorauswahl(kapitel, zustand.wahl); }
    anwenden(kapitel, aus);
    seitenhinweis(zustand.wahl);

    var knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.id = 'lk-knopf';
    knopf.setAttribute('aria-expanded', 'false');
    knopf.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" '
      + 'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" '
      + 'aria-hidden="true"><path d="M4 7h16M4 12h10M4 17h7"/></svg>'
      + '<span>Lektion anpassen</span>';

    var holenKnopf = document.createElement('button');
    holenKnopf.type = 'button';
    holenKnopf.id = 'lk-holen-knopf';
    holenKnopf.setAttribute('aria-expanded', 'false');
    holenKnopf.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" '
      + 'stroke="currentColor" stroke-width="2.4" stroke-linecap="round" '
      + 'stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg><span>Herunterladen</span>';

    function knopfBeschriften(weg, wahl) {
      var e = B && wahl ? B.eintrag(wahl) : null;
      knopf.querySelector('span').textContent = e
        ? 'Lektion anpassen · ' + e.kurz
        : (weg ? 'Lektion anpassen (' + weg + ' weniger)' : 'Lektion anpassen');
    }

    var anpassen = anpassenBauen(kapitel, aus, knopfBeschriften, zustand);
    var holen = holenBauen(kapitel);

    var l = leiste();
    l.appendChild(knopf);
    l.appendChild(holenKnopf);

    /* Immer nur ein Fenster offen - beide sitzen an derselben Stelle. */
    function oeffnen(welches, an) {
      var paar = welches === 'anpassen'
        ? { tafel: anpassen.tafel, knopf: knopf }
        : { tafel: holen.tafel, knopf: holenKnopf };
      paar.tafel.hidden = !an;
      paar.knopf.setAttribute('aria-expanded', String(an));
      if (!an) { if (welches === 'holen') holen.melden(''); return; }
      if (welches === 'anpassen') anpassen.stand();
      var andere = welches === 'anpassen' ? holen.tafel : anpassen.tafel;
      var andererKnopf = welches === 'anpassen' ? holenKnopf : knopf;
      andere.hidden = true;
      andererKnopf.setAttribute('aria-expanded', 'false');
    }

    knopf.addEventListener('click', function () {
      oeffnen('anpassen', anpassen.tafel.hidden);
    });
    holenKnopf.addEventListener('click', function () {
      oeffnen('holen', holen.tafel.hidden);
    });
    anpassen.tafel.querySelector('.lk-schliessen').addEventListener('click', function () {
      oeffnen('anpassen', false);
      knopf.focus();
    });
    holen.tafel.querySelector('.lk-schliessen').addEventListener('click', function () {
      oeffnen('holen', false);
      holenKnopf.focus();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (!anpassen.tafel.hidden) { oeffnen('anpassen', false); knopf.focus(); }
      else if (!holen.tafel.hidden) { oeffnen('holen', false); holenKnopf.focus(); }
    });

    anpassen.stand();
  }

  function start() {
    if (!istLektion() || !haupt()) return;
    var kapitel = kapitelLesen();
    if (!kapitel.length) return;    /* ohne Gliederung gibt es nichts zu wählen */
    bauen(kapitel);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
