#!/usr/bin/env node
/**
 * obfuscate-emails.mjs : encode the public contact email as HTML numeric
 * entities in every .html page, so basic scrapers reading raw HTML do not
 * harvest it. Browsers decode numeric entities in text AND in href
 * attributes, so the rendered page and the mailto: link are unchanged for
 * humans, with JavaScript disabled too (legal pages stay readable by
 * reviewers and by curl).
 *
 * Why here and not Cloudflare: the zone's "Email Address Obfuscation" is ON
 * but does not apply to responses served by Workers static assets
 * (verified 2026-09-18: raw HTML still carried the address, and the
 * /cdn-cgi/l/email-protection marker was absent).
 *
 * Idempotent: once encoded, the plain address no longer exists in the file,
 * so re-running is a no-op. RE-RUN AFTER EVERY REGENERATION of a legal page
 * from the canonical .md sources (they hold the address in plain text).
 *
 * Usage, from the repo root:  node obfuscate-emails.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const EMAIL = 'contact@lightsonme.app';
const encode = (s) => [...s].map((c) => `&#${c.codePointAt(0)};`).join('');
const ENC_EMAIL = encode(EMAIL);
const ENC_MAILTO_EMAIL = encode('mailto:') + ENC_EMAIL;

const htmlFiles = () => readdirSync('.').filter((f) => f.endsWith('.html'));

let touched = 0;
for (const file of htmlFiles()) {
  const before = readFileSync(file, 'utf8');
  // 1) the clickable link: href="mailto:EMAIL" -> fully encoded
  let after = before.split(`mailto:${EMAIL}`).join(ENC_MAILTO_EMAIL);
  // 2) every remaining plain-text occurrence
  after = after.split(EMAIL).join(ENC_EMAIL);
  if (after !== before) {
    writeFileSync(file, after);
    touched++;
    console.log(`encoded: ${file}`);
  }
}

const remaining = htmlFiles().filter((f) => readFileSync(f, 'utf8').includes(EMAIL)).length;
console.log(`${touched} file(s) changed. Files still holding the plain address: ${remaining}`);
