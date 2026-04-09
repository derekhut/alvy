#!/usr/bin/env node
// scripts/expand-ced/check.mjs
//
// Integrity check for any AP subject content JSON.
// Verifies:
//   - Concept-level: root, meaning_zh, related[], words[]
//   - Word-level: all 9 mandatory fields per word
//   - Cross-concept: every `related` name points to an existing concept
//
// Usage (from alvy root):
//   node scripts/expand-ced/check.mjs csp
//   node scripts/expand-ced/check.mjs psych
//   node scripts/expand-ced/check.mjs whap
//
// Exits 1 on any problem so it can chain with && in CI.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_WORD_FIELDS = [
  "word",
  "breakdown",
  "meaning_en",
  "meaning_zh",
  "derivation",
  "mnemonic",
  "example",
  "example_zh",
  "toefl_frequency",
];

function main() {
  const subject = process.argv[2];
  if (!subject) {
    console.error("Usage: node scripts/expand-ced/check.mjs <subject>");
    console.error("       <subject> is the file basename in src/data/");
    console.error("");
    console.error("Available subject JSONs in src/data/:");
    try {
      const files = readdirSync("src/data").filter((f) => f.endsWith(".json"));
      for (const f of files) {
        console.error(`  ${f.replace(/\.json$/, "")}  →  src/data/${f}`);
      }
    } catch {}
    process.exit(2);
  }

  const path = resolve(process.cwd(), `src/data/${subject}.json`);
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`Could not load ${path}: ${e.message}`);
    console.error("Run this script from the alvy root directory.");
    process.exit(2);
  }

  if (!Array.isArray(data)) {
    console.error(`${path} is not a top-level array.`);
    process.exit(1);
  }

  console.log(`=== ${subject}.json integrity check ===`);
  console.log(`concepts: ${data.length}`);
  console.log(`terms:    ${data.reduce((a, c) => a + (c.words?.length ?? 0), 0)}`);

  const names = new Set(data.map((c) => c.root));
  let problems = 0;

  for (const c of data) {
    // Concept-level checks
    if (!c.root) {
      console.log(`BAD concept (no root):`, c);
      problems++;
      continue;
    }
    if (!c.meaning_zh) {
      console.log(`BAD concept (no meaning_zh): ${c.root}`);
      problems++;
    }
    if (!Array.isArray(c.related)) {
      console.log(`BAD concept (related not array): ${c.root}`);
      problems++;
    }
    if (!Array.isArray(c.words)) {
      console.log(`BAD concept (words not array): ${c.root}`);
      problems++;
      continue;
    }

    // Word-level checks: all 9 fields mandatory
    for (const w of c.words) {
      for (const f of REQUIRED_WORD_FIELDS) {
        if (w[f] === undefined || w[f] === null || w[f] === "") {
          console.log(`MISSING ${f} in "${c.root}" -> "${w.word ?? "(no word)"}"`);
          problems++;
        }
      }
    }

    // Cross-concept: every `related` name must point to an existing concept
    if (Array.isArray(c.related)) {
      for (const r of c.related) {
        if (!names.has(r)) {
          console.log(`DANGLING related: "${c.root}" -> "${r}"`);
          problems++;
        }
      }
    }
  }

  console.log(`problems: ${problems}`);
  if (problems > 0) {
    process.exit(1);
  }
}

try {
  main();
} catch (e) {
  console.error("check.mjs crashed:", e);
  process.exit(2);
}
