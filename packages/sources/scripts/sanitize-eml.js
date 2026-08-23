#!/usr/bin/env node
/**
 * Turn a raw .eml job alert into a committable test fixture.
 *
 *   node packages/sources/scripts/sanitize-eml.js <entrada.eml> <salida.html>
 *
 * WHY THIS EXISTS
 * ---------------
 * The parsers need real HTML — inventing markup would test a fiction. But a raw
 * .eml carries the user's address, their full name, tracking tokens tied to
 * their account, and unsubscribe URLs that are LIVE CAPABILITIES: anyone holding
 * one can unsubscribe them from their job alerts. None of that can go in git.
 *
 * WHAT SHRINKS THE PROBLEM
 * ------------------------
 * The parser's input is an `EmailMessage` — { id, from, subject, receivedAt,
 * bodyHtml }. Decoding MIME is the Gmail ADAPTER's job, not the parser's. So the
 * entire envelope is dropped here: every Received:, ARC-Seal, DKIM-Signature,
 * Message-ID, Feedback-ID and List-Unsubscribe header. That is not a cleaning
 * step, it is simply what the parser never consumes — and it removes most of the
 * risk for free.
 *
 * THE RULE THAT GOVERNS THE REST
 * ------------------------------
 *   Values are replaced. Shapes are kept.
 *
 * `midToken=AQH_1lie...` becomes `midToken=REDACTED`, not nothing: the parser
 * must still face a URL with eight junk parameters wrapped around the job id.
 * Strip too eagerly and the fixture stops resembling a real email, which is the
 * one thing it exists to do. The job id itself stays — it is public data about a
 * public posting, and extracting it is precisely what the parser is for.
 *
 * Uses only Node built-ins, on purpose: a script that sanitizes personal data
 * should not pull in a dependency tree to do it.
 */

const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------- MIME

/** Split raw text into its header block and its body. Headers end at a blank line. */
function splitHeaders(raw) {
  const at = raw.search(/\r?\n\r?\n/);
  if (at === -1) return { head: raw, body: '' };
  const sep = raw.slice(at).match(/^\r?\n\r?\n/)[0];
  return { head: raw.slice(0, at), body: raw.slice(at + sep.length) };
}

/**
 * Parse a header block into a lowercase-keyed map, unfolding continuation lines.
 * RFC 5322 lets a long header wrap onto lines starting with whitespace.
 */
function parseHeaders(head) {
  const unfolded = head.replace(/\r?\n[ \t]+/g, ' ');
  const headers = {};
  for (const line of unfolded.split(/\r?\n/)) {
    const at = line.indexOf(':');
    if (at === -1) continue;
    headers[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
  }
  return headers;
}

/** Decode quoted-printable into a Buffer: soft breaks vanish, =XX becomes a byte. */
function decodeQuotedPrintable(text) {
  const noSoftBreaks = text.replace(/=\r?\n/g, '');
  const bytes = [];
  for (let i = 0; i < noSoftBreaks.length; i++) {
    const ch = noSoftBreaks[i];
    if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(noSoftBreaks.substr(i + 1, 2))) {
      bytes.push(parseInt(noSoftBreaks.substr(i + 1, 2), 16));
      i += 2;
    } else {
      bytes.push(ch.charCodeAt(0));
    }
  }
  return Buffer.from(bytes);
}

function decodeBody(body, encoding) {
  const enc = (encoding || '7bit').toLowerCase();
  if (enc === 'quoted-printable') return decodeQuotedPrintable(body).toString('utf8');
  if (enc === 'base64') return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  return body;
}

/**
 * Find the text/html part, recursing through multipart containers.
 * A LinkedIn alert is multipart/alternative (text/plain + text/html); Glassdoor
 * sends text/html straight up. Both land here.
 */
function findHtmlPart(raw) {
  const { head, body } = splitHeaders(raw);
  const headers = parseHeaders(head);
  const contentType = headers['content-type'] || 'text/plain';

  if (/^text\/html/i.test(contentType)) {
    return decodeBody(body, headers['content-transfer-encoding']);
  }

  const boundary = contentType.match(/boundary="?([^";]+)"?/i);
  if (!boundary) return null;

  const parts = body.split(new RegExp(`--${boundary[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  // Last match wins: in multipart/alternative the richest part comes last.
  let found = null;
  for (const part of parts) {
    const html = findHtmlPart(part.replace(/^\r?\n/, ''));
    if (html) found = html;
  }
  return found;
}

// ---------------------------------------------------------- Sanitizing

const PLACEHOLDER_EMAIL = 'jobseeker@example.com';
const PLACEHOLDER_NAME = 'Nombre Apellido';

/** Every address appearing in a header, so we can scrub them from the body too. */
function addressesIn(headers) {
  const found = new Set();
  for (const key of ['to', 'from', 'cc', 'delivered-to', 'x-original-to']) {
    const value = headers[key];
    if (!value) continue;
    for (const m of value.matchAll(/[\w.+-]+@[\w.-]+\.\w+/g)) found.add(m[0].toLowerCase());
  }
  return [...found];
}

/** The display name on the To: header — the user's real name, as the sender knows it. */
function nameIn(headers) {
  const to = headers['to'] || '';
  const named = to.match(/^\s*"?([^"<]+?)"?\s*</);
  return named ? named[1].trim() : null;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Account-tied tracking parameters. The value is replaced, the parameter stays,
 * so the parser still has to cope with the noise a real URL carries.
 */
const TRACKING_PARAMS = [
  'midToken',
  'midSig',
  'eid',
  'trk',
  'trkEmail',
  'lipi',
  'licu',
  'lici',
  'sharedKey',
  'otpToken',
];

function sanitize(html, { addresses, name }) {
  const report = {};
  let out = html;

  const swap = (label, pattern, replacement) => {
    const before = out;
    out = out.replace(pattern, replacement);
    const count = (before.match(pattern) || []).length;
    if (count) report[label] = (report[label] || 0) + count;
  };

  // The user's address, raw and percent-encoded (it travels both ways in URLs).
  for (const address of addresses) {
    swap('email', new RegExp(escapeRegExp(address), 'gi'), PLACEHOLDER_EMAIL);
    swap(
      'email (percent-encoded)',
      new RegExp(escapeRegExp(encodeURIComponent(address)), 'gi'),
      encodeURIComponent(PLACEHOLDER_EMAIL)
    );
  }

  // The full name, and each of its parts: templates greet with just the first name.
  if (name) {
    swap('nombre completo', new RegExp(escapeRegExp(name), 'gi'), PLACEHOLDER_NAME);
    for (const part of name.split(/\s+/).filter((p) => p.length > 2)) {
      swap('nombre (parcial)', new RegExp(`\\b${escapeRegExp(part)}\\b`, 'gi'), 'Nombre');
    }
  }

  for (const param of TRACKING_PARAMS) {
    swap(param, new RegExp(`(${param}=)[^&"'\\s>]+`, 'gi'), '$1REDACTED');
  }
  swap('savedSearchId', /(savedSearchId=)[^&"'\s>]+/gi, '$10000000000');
  swap('utm_*', /(utm_[a-z_]+=)[^&"'\s>]+/gi, '$1REDACTED');

  // Unsubscribe URLs are the one item here that is a CAPABILITY, not an
  // identifier: the token in them acts on the account. The href is neutered but
  // the anchor survives, so the document structure the parser walks is intact.
  swap(
    'enlaces de baja',
    /href="[^"]*(unsubscribe|unsub|optout|opt-out|email_unsub)[^"]*"/gi,
    'href="#unsubscribe-redacted"'
  );

  return { html: out, report };
}

/** Anything address-shaped or token-shaped that survived. Not proof, but it catches the obvious. */
function residuals(html) {
  const findings = [];
  const emails = new Set(
    [...html.matchAll(/[\w.+-]+@[\w.-]+\.\w+/g)].map((m) => m[0]).filter((e) => e !== PLACEHOLDER_EMAIL)
  );
  if (emails.size) findings.push(`direcciones sin sustituir: ${[...emails].join(', ')}`);

  for (const param of [...TRACKING_PARAMS, 'savedSearchId']) {
    const live = html.match(new RegExp(`${param}=(?!REDACTED|0000000000)[^&"'\\s>]{6,}`, 'gi'));
    if (live) findings.push(`${param} con valor vivo: ${live.length}`);
  }

  const unsub = html.match(/href="[^"]*unsub[^"]*"/gi) || [];
  const live = unsub.filter((h) => !h.includes('#unsubscribe-redacted'));
  if (live.length) findings.push(`enlaces de baja vivos: ${live.length}`);

  return findings;
}

// --------------------------------------------------------------- Main

function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Uso: node sanitize-eml.js <entrada.eml> <salida.html>');
    process.exit(1);
  }

  const raw = fs.readFileSync(input, 'latin1'); // bytes preserved; QP decodes to UTF-8 below
  const { head } = splitHeaders(raw);
  const headers = parseHeaders(head);

  const html = findHtmlPart(raw);
  if (!html) {
    console.error(`✗ No se encontró ninguna parte text/html en ${input}`);
    process.exit(1);
  }

  const { html: clean, report } = sanitize(html, {
    addresses: addressesIn(headers),
    name: nameIn(headers),
  });

  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, clean, 'utf8');

  // The three headers the fixture needs. Everything else in the envelope is the
  // Gmail adapter's problem, and is deliberately not carried over.
  console.log(`\n✓ ${path.basename(input)} → ${output}`);
  console.log(`  from:       ${headers['from']}`);
  console.log(`  subject:    ${headers['subject']}`);
  console.log(`  receivedAt: ${headers['date']}`);
  console.log(`  tamaño:     ${(clean.length / 1024).toFixed(0)} KB`);

  console.log('\n  Sustituciones:');
  const entries = Object.entries(report).filter(([, n]) => n > 0);
  if (!entries.length) console.log('    (ninguna)');
  for (const [label, n] of entries) console.log(`    ${label.padEnd(26)} ${n}`);

  const left = residuals(clean);
  if (left.length) {
    console.log('\n  ⚠️  REVISAR A MANO:');
    for (const f of left) console.log(`    - ${f}`);
    process.exitCode = 2;
  } else {
    console.log('\n  ✓ Barrido de residuos limpio.');
  }
}

main();
