#!/usr/bin/env node
// scripts/expand-ced/plan.mjs
//
// Reads ap_<subject>.md and prints the per-CED-topic term distribution,
// so you can plan how to group topics into batches.
//
// Usage (from alvy root):
//   node scripts/expand-ced/plan.mjs csp
//   node scripts/expand-ced/plan.mjs environment
//
// Output:
//   Per-topic table (CED order, NOT line order — fixes the "3.10 before 3.2" quirk)
//   Total topics + total terms
//   Suggested batch grouping (target ~40 terms per batch)

import { readFileSync, readdirSync } from "node:fs";

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/expand-ced/plan.mjs <source>");
    console.error("       reads ./ap_<source>.md (e.g. csp, psyc, macro, world_history)");
    console.error("");
    console.error("Available sources in this repo:");
    try {
      const files = readdirSync(".").filter((f) => /^ap_.+\.md$/.test(f));
      for (const f of files) {
        const name = f.replace(/^ap_/, "").replace(/\.md$/, "");
        console.error(`  ${name}  →  ${f}`);
      }
    } catch {}
    process.exit(2);
  }

  const path = `./ap_${arg}.md`;
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    console.error(`Could not read ${path}: ${e.message}`);
    console.error("Run this script from the alvy root directory.");
    process.exit(2);
  }

  // Parse pipe-table rows: | term | definition | citation |
  // Skip the header row and the separator row.
  const lines = raw.split("\n");
  /** @type {Map<string, { code: string, title: string, terms: string[] }>} */
  const byTopic = new Map();

  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    if (line.includes(":---")) continue; // separator row
    const cells = line
      .split("|")
      .slice(1, -1) // drop the empty cells from leading/trailing |
      .map((s) => s.trim());
    if (cells.length !== 3) continue;
    const [term, def, citation] = cells;
    if (term === "Term" || def === "Definition") continue; // header

    // Citation format: "<CED code> <CED title>" e.g. "3.5 Boolean Expressions"
    // Match a leading code like "1.1", "3.10", "5.6". Title is optional —
    // some source files use just "4.1" without the topic title.
    const m = citation.match(/^(\d+\.\d+[a-z]?)(?:\s+(.*))?$/);
    if (!m) {
      // Fallback: treat the whole citation as the topic key
      // (source markdown is missing the standard "<code> <title>" format —
      // this happens with placeholder citations like "[1]" that need re-extraction
      // from the official CED docx before this subject can be batched cleanly)
      const key = citation || "(empty)";
      if (!byTopic.has(key)) byTopic.set(key, { code: "", title: key, terms: [] });
      byTopic.get(key).terms.push(term);
      continue;
    }
    const [, code, title = "(no title)"] = m;
    const key = `${code} ${title}`;
    if (!byTopic.has(key)) byTopic.set(key, { code, title, terms: [] });
    byTopic.get(key).terms.push(term);
  }

  if (byTopic.size === 0) {
    console.error(`No pipe-table rows found in ${path}.`);
    console.error("Expected format: | Term | Definition | Citation |");
    process.exit(1);
  }

  // Sort by CED code numerically (so 3.2 comes before 3.10, fixing the
  // lexicographic-sort quirk in the source markdown). Entries without a
  // recognizable code sort to the end.
  const entries = [...byTopic.values()].sort((a, b) => {
    if (!a.code && !b.code) return a.title.localeCompare(b.title);
    if (!a.code) return 1;
    if (!b.code) return -1;
    const [aMaj, aMin] = a.code.split(".").map((x) => parseInt(x, 10));
    const [bMaj, bMin] = b.code.split(".").map((x) => parseInt(x, 10));
    if (aMaj !== bMaj) return aMaj - bMaj;
    return aMin - bMin;
  });

  // Detect malformed source: too many entries without codes means the markdown
  // uses non-standard citations like "[1]" that need re-extraction from the
  // official CED docx.
  const noCode = entries.filter((e) => !e.code).length;
  if (noCode > entries.length * 0.5) {
    console.error(
      `WARNING: ${noCode}/${entries.length} entries have no recognizable CED code.`
    );
    console.error(
      `Citations look like "[1]" instead of "1.1 Scarcity". This source needs to be`
    );
    console.error(
      `re-extracted from the official CED docx with proper citation format before`
    );
    console.error(`it can be batched cleanly.\n`);
  }

  console.log(`=== ap_${arg}.md — CED topic distribution ===\n`);
  let totalTerms = 0;
  let currentUnit = NaN;
  for (const e of entries) {
    const unit = e.code ? parseInt(e.code.split(".")[0], 10) : NaN;
    if (unit !== currentUnit && !(isNaN(unit) && isNaN(currentUnit))) {
      if (!isNaN(currentUnit) || currentUnit !== NaN) console.log("");
      console.log(isNaN(unit) ? `--- (no CED code) ---` : `--- Unit ${unit} ---`);
      currentUnit = unit;
    }
    const label = e.code ? `${e.code} ${e.title}` : `(no code) ${e.title}`;
    console.log(`  ${label.padEnd(50)} ${String(e.terms.length).padStart(3)} terms`);
    totalTerms += e.terms.length;
  }
  console.log(
    `\n--- TOTAL: ${entries.length} topics / ${totalTerms} terms ---\n`
  );

  // Suggest a batch grouping: target ~40 terms per batch, never split a topic
  const TARGET = 40;
  const batches = [];
  let cur = { topics: [], terms: 0 };
  for (const e of entries) {
    if (cur.terms > 0 && cur.terms + e.terms.length > TARGET * 1.5) {
      batches.push(cur);
      cur = { topics: [], terms: 0 };
    }
    cur.topics.push(e);
    cur.terms += e.terms.length;
  }
  if (cur.terms > 0) batches.push(cur);

  console.log(`=== Suggested batch grouping (target ~${TARGET} terms/batch) ===\n`);
  batches.forEach((b, i) => {
    const first = b.topics[0].code || "?";
    const last = b.topics[b.topics.length - 1].code || "?";
    const range = first === last ? first : `${first}-${last}`;
    console.log(
      `Batch ${i + 1}: CED ${range.padEnd(12)} ${String(b.topics.length).padStart(2)} concepts / ${String(b.terms).padStart(3)} terms`
    );
  });
  console.log(
    `\nTotal: ${batches.length} batches / ${entries.length} concepts / ${totalTerms} terms`
  );
  console.log(
    "\nThis is a SUGGESTION. Adjust by hand to keep related CED topics in the same batch."
  );
}

main();
