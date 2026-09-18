#!/usr/bin/env node
/**
 * noindex-legal-pages.mjs : add <meta name="robots" content="noindex"> to the
 * 12 legal pages that carry the controller's legal name and address
 * (privacy-*.html + terms-*.html), so a web search on that name does not
 * surface them. The pages stay fully accessible by URL: the legal duty is
 * accessibility, not indexability, and Apple / Google reviewers open the
 * URL directly. delete-account-* and crisis-* stay indexable on purpose:
 * people search for them, and they do not carry the name.
 *
 * Idempotent: a page that already has a robots meta is left untouched.
 * RE-RUN AFTER EVERY REGENERATION of a legal page from the canonical .md
 * sources, together with obfuscate-emails.mjs.
 *
 * Usage, from the repo root:  node noindex-legal-pages.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LANGS = ['fr', 'en', 'es', 'de', 'it', 'pt'];
const PAGES = LANGS.flatMap((l) => [`privacy-${l}.html`, `terms-${l}.html`]);
const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1">';
const ROBOTS = '<meta name="robots" content="noindex">';

let touched = 0;
for (const file of PAGES) {
  const html = readFileSync(file, 'utf8');
  if (/name="robots"/i.test(html)) continue;
  if (!html.includes(VIEWPORT)) {
    console.error(`no viewport anchor in ${file}: skipped, add the robots meta by hand`);
    process.exitCode = 1;
    continue;
  }
  writeFileSync(file, html.replace(VIEWPORT, `${VIEWPORT}\n${ROBOTS}`));
  touched++;
  console.log(`noindex: ${file}`);
}
console.log(`${touched} file(s) changed.`);
