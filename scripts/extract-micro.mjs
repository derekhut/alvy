#!/usr/bin/env node
// Throwaway one-shot extractor: ap_micro.docx → ap_micro.md
// Walks the document.xml stream, identifies CED topic headings, then captures
// alternating term/definition pairs until the next heading.

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docx = resolve(__dirname, "..", "ap_micro.docx");

// Extract raw text by stripping XML tags from word/document.xml
const result = spawnSync("unzip", ["-p", docx, "word/document.xml"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
if (result.status !== 0) {
  console.error("unzip failed:", result.stderr);
  process.exit(1);
}
const xml = result.stdout;
const text = xml.replace(/<[^>]+>/g, "\n");
const lines = text
  .split("\n")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

// Walk lines: identify CED topic headings (e.g. "1.1 Basic Economic Concepts")
// then read alternating term/definition pairs until the next heading.
const CED_HEADING = /^(\d+\.\d+)\s+(.+)$/;
const UNIT_HEADING = /^Unit\s+\d/;

const rows = [];
let currentCed = null;
let currentTitle = null;
let buffer = []; // collected non-header lines for the current topic
let inTermDefBlock = false;

function flushTopic() {
  if (!currentCed || buffer.length === 0) return;
  // Strip "Term" / "Definition" header markers from the buffer
  const cleaned = buffer.filter((l) => l !== "Term" && l !== "Definition");
  // cleaned is alternating term, definition, term, definition...
  for (let i = 0; i + 1 < cleaned.length; i += 2) {
    const term = cleaned[i];
    const def = cleaned[i + 1];
    rows.push({
      term,
      def,
      citation: `${currentCed} ${currentTitle}`,
    });
  }
}

for (const line of lines) {
  if (UNIT_HEADING.test(line)) {
    // Unit headings reset state but don't end a topic block
    continue;
  }
  const m = line.match(CED_HEADING);
  if (m) {
    // New CED topic — flush previous, start new
    flushTopic();
    currentCed = m[1];
    currentTitle = m[2];
    buffer = [];
    inTermDefBlock = false;
    continue;
  }
  if (line === "Term") {
    inTermDefBlock = true;
    buffer.push(line);
    continue;
  }
  if (inTermDefBlock) {
    buffer.push(line);
  }
}
flushTopic();

// Pipe-escape any | characters defensively
const escape = (s) => s.replace(/\|/g, "\\|");

const out = [];
out.push("AP Microeconomics Key Terms");
out.push("");
out.push(`<!-- ${rows.length} terms, preserved in CED order from ap_micro.docx -->`);
out.push("");
out.push("| Term | Definition | Citation |");
out.push("| :--- | :--- | :--- |");
for (const r of rows) {
  out.push(`| ${escape(r.term)} | ${escape(r.def)} | ${escape(r.citation)} |`);
}

const outPath = resolve(__dirname, "..", "ap_micro.md");
writeFileSync(outPath, out.join("\n") + "\n");
console.error(`wrote ${rows.length} terms to ${outPath}`);
