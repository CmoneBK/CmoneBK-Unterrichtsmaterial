#!/usr/bin/env node
/**
 * Erzeugt die Übersicht über Werkzeuge und Lektionen - ohne Jekyll.
 *
 * Warum kein Jekyll mehr: Die Seiten sind vollständige HTML-Dokumente, keine
 * Fragmente. Jekyll hat hier nur ein Layout darübergelegt, das den Rücklink
 * einfügt - und das auch nur auf GitHub Pages. Auf t-bk.de tat dasselbe das
 * deploy.sh ein zweites Mal. Zwei Wege für dieselbe Zeile, und lokal per
 * Doppelklick funktionierte keiner davon.
 *
 * Jetzt trägt dieses Skript die Bausteine in die Dateien selbst ein und
 * schreibt die index.html ins Repo. Ausgeliefert wird überall dasselbe:
 * GitHub Pages, t-bk.de und der lokale Doppelklick zeigen die gleiche Seite.
 *
 *     node build/build.mjs           erzeugt index.html und trägt Bausteine nach
 *     node build/build.mjs --check   prüft nur (Exit 1, wenn nicht aktuell)
 *
 * Zwei Arten von Seiten, unterschieden durch <meta name="art">:
 *
 *     simulation   etwas einstellen, ablesen, ausprobieren
 *     lektion      ein Thema in Kapiteln, zum Durcharbeiten
 *
 * Gegliedert wird nach der Titelkonvention "Bereich: Unterkategorie - Name",
 * die Reihenfolge steht in daten/kategorien.csv.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = join(HIER, '..');
const TOOLS = join(WURZEL, 'tools');
const NUR_PRUEFEN = process.argv.includes('--check');

const ARTEN = ['simulation', 'lektion'];
const BACK_NAV = 'assets/back-nav.js';
/* Nur Lektionen: zuschneiden und mitnehmen. Reihenfolge zaehlt - lektion.js
   greift auf tbkQr und tbkPdf zu. */
const LEKTION = ['assets/bildungsgang.js', 'assets/qr.js', 'assets/pdf.js',
  'assets/lektion.js'];
const THEMA = 'assets/thema.js';
const THEMA_CSS = 'assets/thema-werkzeug.css';

const escHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');
const normWs = (s) => String(s).replace(/\s+/g, ' ').trim();

const warnungen = [];
const warnen = (datei, text) => warnungen.push(`${datei}: ${text}`);

/* ---------- Titel zerlegen: "Bereich: Unterkategorie - Name" ---------- */

function titelZerlegen(roh) {
  const t = normWs(roh);
  const dp = t.indexOf(':');
  if (dp === -1) return { bereich: 'Allgemein', kategorie: '', name: t };
  const bereich = normWs(t.slice(0, dp));
  const rest = normWs(t.slice(dp + 1));
  /* Getrennt wird am " - " MIT Leerzeichen - Bindestriche im Text
     ("Form- und Lagetoleranzen") stören dadurch nicht. */
  const bs = rest.indexOf(' - ');
  if (bs === -1) return { bereich, kategorie: '', name: rest };
  return {
    bereich,
    kategorie: normWs(rest.slice(0, bs)),
    name: normWs(rest.slice(bs + 3)),
  };
}

/* ---------- Eine Seite lesen und dabei in Ordnung bringen ---------- */

async function seiteLesen(datei) {
  let text = await readFile(datei, 'utf8');
  const rel = 'tools/' + relative(TOOLS, datei).split('\\').join('/');
  let geaendert = false;
  let fmTitel = '';

  /* 1. YAML-Front-Matter entfernen. Sie stammt aus dem Jekyll-Workflow; ohne
        Jekyll stünde sie als Text auf der Seite. */
  const fm = text.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/);
  if (fm) {
    const t = fm[1].match(/^\s*title\s*:\s*(.+?)\s*$/m);
    if (t) fmTitel = normWs(t[1].replace(/^["']|["']$/g, ''));
    text = text.slice(fm[0].length);
    geaendert = true;
    warnen(rel, 'Front-Matter entfernt (wird ohne Jekyll als Text angezeigt)');
  }

  /* 2. Bausteine in den head: erst die Farben, dann der Umschalter. */
  for (const pfad of [THEMA_CSS, THEMA]) {
    if (text.includes(pfad)) continue;
    const zeile = pfad.endsWith('.css')
      ? `<link rel="stylesheet" href="${pfad}">\n`
      : `<script src="${pfad}"></script>\n`;
    const kopf = text.match(/([ \t]*)<\/head>/i);
    if (!kopf) { warnen(rel, 'kein </head> – ' + pfad + ' fehlt'); continue; }
    text = text.replace(/[ \t]*<\/head>/i, `${kopf[1]}${zeile}${kopf[1]}</head>`);
    geaendert = true;
    warnen(rel, `${pfad} ergänzt`);
  }

  /* 3. Welche Art Seite ist das? Danach richtet sich, was noch dazukommt. */
  const metaAus = (quelle, name) => {
    const t = quelle.match(
      new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'));
    return t ? normWs(t[1]) : '';
  };
  let art = metaAus(text, 'art').toLowerCase();
  if (!ARTEN.includes(art)) {
    if (art) warnen(rel, `unbekannte Art "${art}" – als Simulation eingeordnet`);
    else warnen(rel, 'ohne <meta name="art"> – als Simulation eingeordnet');
    art = 'simulation';
  }

  /* 4. Eine Lektion bekommt "Lektion anpassen" und "Herunterladen" - das
        Gegenstueck zu den Uebungen im Materialbereich. Eine Simulation nicht:
        Sie hat keine Kapitel, die man weglassen koennte. */
  const vorBody = (pfad) => {
    if (text.includes(pfad)) return;
    const zeile = `<script src="${pfad}"></script>
`;
    const schluss = text.match(/([ 	]*)<\/body>/i);
    if (schluss) {
      text = text.replace(/[ 	]*<\/body>/i, `${schluss[1]}${zeile}${schluss[1]}</body>`);
    } else {
      text += `
${zeile}`;
      warnen(rel, 'kein </body> – ' + pfad + ' ans Dateiende gehängt');
    }
    geaendert = true;
    warnen(rel, `${pfad} ergänzt`);
  };
  if (art === 'lektion') LEKTION.forEach(vorBody);

  /* 5. Rücklink ans Dateiende, als Letztes. data-ziel="../" führt aus tools/
        heraus zur Übersicht - auf GitHub Pages wie auf t-bk.de. */
  if (!text.includes(BACK_NAV)) {
    const zeile = `<script src="${BACK_NAV}" data-ziel="../"></script>\n`;
    const schluss = text.match(/([ \t]*)<\/body>/i);
    if (schluss) {
      text = text.replace(/[ \t]*<\/body>/i, `${schluss[1]}${zeile}${schluss[1]}</body>`);
    } else {
      text += `\n${zeile}`;
      warnen(rel, 'kein </body> – Rücklink ans Dateiende gehängt');
    }
    geaendert = true;
    warnen(rel, `${BACK_NAV} ergänzt`);
  }

  if (geaendert && !NUR_PRUEFEN) await writeFile(datei, text, 'utf8');

  /* 6. Auslesen, was die Übersicht braucht. */
  const m = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let titel = m ? normWs(m[1]) : '';
  if (!titel) titel = fmTitel;
  if (!titel) {
    titel = normWs(rel.replace(/\.html$/i, '').split('/').pop().replace(/[-_]+/g, ' '));
    warnen(rel, 'kein <title> – Dateiname als Beschriftung verwendet');
  }

  const meta = (name) => {
    const t = text.match(
      new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i'));
    return t ? normWs(t[1]) : '';
  };

  return {
    datei: relative(TOOLS, datei).split('\\').join('/'),
    titel, art, beschreibung: meta('description'),
    /* Bildungsgaenge, fuer die diese Seite nicht vorgesehen ist. Die
       Uebersicht blendet sie dann aus. */
    bgOhne: meta('bg-ohne'), geaendert,
  };
}

/* ---------- Reihenfolge der Bereiche und Kategorien ---------- */

async function kategorienLesen() {
  const pfad = join(WURZEL, 'daten', 'kategorien.csv');
  if (!existsSync(pfad)) return [];
  const zeilen = (await readFile(pfad, 'utf8')).split(/\r?\n/).slice(1);
  return zeilen.map((z) => z.split(',').map((s) => s.trim()))
    .filter((s) => s[0]).map(([bereich, kategorie = '']) => ({ bereich, kategorie }));
}

function sortiertNach(vorgabe, werte, feld) {
  const rang = new Map();
  vorgabe.forEach((v, i) => { if (!rang.has(v)) rang.set(v, i); });
  return [...werte].sort((a, b) => {
    const ra = rang.has(a) ? rang.get(a) : Infinity;
    const rb = rang.has(b) ? rang.get(b) : Infinity;
    return ra !== rb ? ra - rb : a.localeCompare(b, 'de');
  });
}

/* ---------- Die Übersicht bauen ---------- */

function karten(eintraege) {
  return eintraege.map((e) => {
    const sub = e.beschreibung
      ? `\n            <span class="sub">${escHtml(e.beschreibung)}</span>`
      : '';
    const bg = e.bgOhne ? ` data-bg-ohne="${escHtml(e.bgOhne)}"` : '';
    return `          <a class="card" href="tools/${escHtml(e.datei)}"${bg}>\n`
      + `            <span>${escHtml(e.name)}</span>${sub}\n          </a>`;
  }).join('\n');
}

function abschnitt(eintraege, kats) {
  if (!eintraege.length) return '      <p class="leer">Hier steht noch nichts.</p>';

  const bereiche = sortiertNach(
    kats.map((k) => k.bereich),
    new Set(eintraege.map((e) => e.bereich)));

  const teile = [];
  for (const b of bereiche) {
    const imBereich = eintraege.filter((e) => e.bereich === b);
    teile.push(`      <h2 class="bereich">${escHtml(b)}</h2>`);

    /* Erst, was keine Unterkategorie hat - dann je Kategorie ein Block. */
    const ohne = imBereich.filter((e) => !e.kategorie)
      .sort((a, b2) => a.name.localeCompare(b2.name, 'de'));
    if (ohne.length) teile.push('      <div class="grid">\n' + karten(ohne) + '\n      </div>');

    const kategorien = sortiertNach(
      kats.filter((k) => k.bereich === b).map((k) => k.kategorie),
      new Set(imBereich.filter((e) => e.kategorie).map((e) => e.kategorie)));

    for (const k of kategorien) {
      const block = imBereich.filter((e) => e.kategorie === k)
        .sort((a, b2) => a.name.localeCompare(b2.name, 'de'));
      if (!block.length) continue;
      teile.push(`      <h3 class="cat">${escHtml(k)}</h3>`);
      teile.push('      <div class="grid">\n' + karten(block) + '\n      </div>');
    }
  }
  return teile.join('\n');
}

/* ---------- Los ---------- */

const dateien = (await readdir(TOOLS))
  .filter((f) => f.toLowerCase().endsWith('.html'))
  .sort();

const seiten = [];
for (const f of dateien) {
  const s = await seiteLesen(join(TOOLS, f));
  seiten.push({ ...s, ...titelZerlegen(s.titel) });
}

const kats = await kategorienLesen();
const vorlage = await readFile(join(HIER, 'uebersicht-vorlage.html'), 'utf8');
const proArt = Object.fromEntries(
  ARTEN.map((a) => [a, seiten.filter((s) => s.art === a)]));

const seite = vorlage
  .replace('{{SIMULATIONEN}}', abschnitt(proArt.simulation, kats))
  .replace('{{LEKTIONEN}}', abschnitt(proArt.lektion, kats))
  .replace('{{ANZAHL_SIMULATION}}', String(proArt.simulation.length))
  .replace('{{ANZAHL_LEKTION}}', String(proArt.lektion.length));

const ziel = join(WURZEL, 'index.html');
const alt = existsSync(ziel) ? await readFile(ziel, 'utf8') : '';

for (const w of warnungen) console.log('  ! ' + w);

if (NUR_PRUEFEN) {
  const offen = warnungen.length || alt !== seite;
  console.log(offen
    ? 'Übersicht ist NICHT aktuell – node build/build.mjs ausführen.'
    : `Übersicht ist aktuell (${proArt.simulation.length} Simulationen, `
      + `${proArt.lektion.length} Lektionen).`);
  process.exit(offen ? 1 : 0);
}

if (alt !== seite) await writeFile(ziel, seite, 'utf8');
console.log(`Erzeugt – ${proArt.simulation.length} Simulationen, `
  + `${proArt.lektion.length} Lektionen.`);
