#!/usr/bin/env node
// fill-identity.mjs : writes the data controller's name into the 12 published
// legal pages (privacy x6 + terms x6), replacing the name placeholder of each
// language. Run it ONCE, locally, from the root of this repo:
//
//   NOM="Prénom Nom" node fill-identity.mjs
//
// The value is read from the environment and written into the files; the
// script prints counts only, never the value. Extra file paths can be passed
// as arguments (for example the app repo's canonical docs) and get the same
// treatment. Idempotent: a second run changes nothing and reports it.
//
// After this script, ALWAYS re-run the two publication scripts before pushing:
//   node obfuscate-emails.mjs && node noindex-legal-pages.mjs
//
// Excluded from publication via .assetsignore.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const LANGS = ['fr', 'en', 'es', 'de', 'it', 'pt'];
const DEFAULT_TARGETS = LANGS.flatMap((l) => [`privacy-${l}.html`, `terms-${l}.html`]).map((f) => resolve(ROOT, f));

// Every name placeholder variant present in the pages (privacy + terms, 6 languages).
const NAME_PLACEHOLDERS = [
  '[VOTRE NOM]',
  '[YOUR NAME]',
  '[SU NOMBRE]',
  '[IHR NAME]',
  '[IL TUO NOME]',
  '[O SEU NOME]',
  '[NOM DE LA SOCIÉTÉ / PERSONNE PHYSIQUE]',
  '[COMPANY NAME / NATURAL PERSON]',
  '[NOMBRE DE LA EMPRESA / PERSONA FÍSICA]',
  '[UNTERNEHMENSNAME / NATÜRLICHE PERSON]',
  '[NOME DELLA SOCIETÀ / PERSONA FISICA]',
  '[NOME DA EMPRESA / PESSOA SINGULAR]',
];

// Anything that still looks like an identity placeholder after the run.
const RESIDUAL = /\[[A-ZÀ-Ü][^\]]{3,60}\]|1XXX/g;

const raw = process.env.NOM ?? '';
const name = raw.trim();
if (!name) {
  console.error('NOM manquant. Usage : NOM="Prénom Nom" node fill-identity.mjs');
  process.exit(2);
}
if (/[\[\]\n\r]/.test(name)) {
  console.error('NOM invalide (crochet ou retour à la ligne).');
  process.exit(2);
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const targets = process.argv.length > 2 ? process.argv.slice(2).map((p) => resolve(process.cwd(), p)) : DEFAULT_TARGETS;

let replaced = 0;
let residual = 0;
for (const file of targets) {
  if (!existsSync(file)) {
    console.error(`introuvable : ${file}`);
    process.exit(2);
  }
  const value = extname(file) === '.html' ? escapeHtml(name) : name;
  let s = readFileSync(file, 'utf8');
  let n = 0;
  for (const ph of NAME_PLACEHOLDERS) {
    const k = s.split(ph).length - 1;
    if (k === 0) continue;
    n += k;
    s = s.split(ph).join(value);
  }
  if (n > 1) {
    console.error(`${file} : ${n} placeholders de nom, 1 attendu, rien n'a été écrit`);
    process.exit(1);
  }
  if (n === 1) writeFileSync(file, s);
  replaced += n;
  const left = (s.match(RESIDUAL) ?? []).length;
  residual += left;
  console.log(`${n === 1 ? 'rempli ' : 'inchangé'}  ${file.replace(ROOT + '/', '')}${left ? `  RESTE ${left} placeholder(s)` : ''}`);
}

console.log(`\n${replaced} remplacement(s) sur ${targets.length} fichier(s) ; placeholders restants : ${residual}`);
if (residual > 0) {
  console.error('Des placeholders subsistent : ne pas pousser.');
  process.exit(1);
}
if (replaced === 0) console.log('Rien à faire : les fichiers étaient déjà remplis.');
