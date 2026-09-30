#!/usr/bin/env node
// Checks every sound item in data/*/characters (#362, C14).
//
//   node tools/local/testing/check_phonics_items.mjs
//
// Reads files only. Exits 1 when an item cannot be answered by ear or has no id of its own:
//   - a listen-choose item that offers the same word twice
//   - a compare item that plays one spelling twice and calls it "different"
//   - a match item with the same word in two pairs
//   - an item without an id, or an id used twice in one tree
// Not part of CI: the permanent validator rules belong to WP-F2.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../data');
const counts = {};
const problems = [];

function hasDuplicates(values) {
  return new Set(values).size !== values.length;
}

for (const tree of fs.readdirSync(dataDir).sort()) {
  const dir = path.join(dataDir, tree, 'characters');
  if (!fs.existsSync(dir)) continue;

  const seenIds = new Map();

  for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const lessons = Array.isArray(data.lessons) ? data.lessons : [{ id: '(top level)', items: data.items || [] }];

    for (const lesson of lessons) {
      (lesson.items || []).forEach((item, index) => {
        const where = `${tree}/characters/${file} ${lesson.id} item ${index}`;
        counts[item.type] = (counts[item.type] || 0) + 1;

        if (item.type === 'phonics_listen_choose' && hasDuplicates(item.options.map(option => option.text))) {
          problems.push(`${where}: listen-choose offers the same word twice (${item.options.map(option => option.text).join(' | ')})`);
        }
        if (item.type === 'phonics_compare' && item.word1 === item.word2 && !item.isSame) {
          problems.push(`${where}: compare plays "${item.word1}" twice with isSame:false`);
        }
        if (item.type === 'phonics_match' && hasDuplicates(item.pairs.map(pair => pair.text))) {
          problems.push(`${where}: match has a duplicate pair (${item.pairs.map(pair => pair.text).join(', ')})`);
        }

        if (!item.id) {
          problems.push(`${where}: no id`);
        } else if (seenIds.has(item.id)) {
          problems.push(`${where}: id "${item.id}" is already used by ${seenIds.get(item.id)}`);
        } else {
          seenIds.set(item.id, where);
        }
      });
    }
  }
}

const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
console.log(`Checked ${total} sound items: ${Object.entries(counts).map(([type, n]) => `${n} ${type}`).join(', ')}.`);

if (problems.length > 0) {
  problems.forEach(problem => console.error(`FAIL ${problem}`));
  console.error(`${problems.length} problem(s).`);
  process.exit(1);
}

console.log('OK: no duplicate options, no same-word "different" compare, no duplicate match pairs, every item has its own id.');
