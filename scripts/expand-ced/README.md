# AP CED Expansion Workflow

A reusable workflow for expanding any AP subject's content JSON (e.g. `psych.json`,
`csp.json`, `whap.json`) from a small stub to full College Board CED coverage by
hand-authoring concept entries from a clean source markdown file.

This is the process used to ship:
- **AP Psychology** — 26/130 → 36 concepts / 607 terms (5 batches)
- **AP CSP** — 20/72 → 35 concepts / 385 terms (10 batches)
- **AP World History** — 0 → 19 concepts / 255 terms (4 batches)
- **AP Microeconomics** — 0 → 36 concepts / 499 terms (6 parallel batches, one per Unit)

It is designed for the next subjects already queued in the repo:
- `ap_environment.md` (AP Environmental Science, 186 lines)
- `ap_macro.md` (AP Macroeconomics, 492 terms)

---

## TL;DR — Run a single batch

```bash
# Always cd to the alvy root, never run from /tmp or scripts/
cd /Users/derekhu/Documents/project/self-learn/alvy

# 1. Pick a slice of CED topics for this batch (see "Plan a batch" below)
# 2. Hand-author the new concepts following the schema
# 3. Append them to src/data/<subject>.json (or rewrite [] for batch 1)
# 4. Verify and commit
node scripts/expand-ced/check.mjs <subject>
npm run build && npm test
git add src/data/<subject>.json && git commit -m "feat: expand <subject> content — batch N (...)"
```

---

## The 6-step process

### 1. Source of truth — pipe-table markdown

Every AP subject lives as a clean markdown file at the alvy root. Filename
convention: `ap_<subject>.md`. Existing examples: `ap_psyc.md`, `ap_csp.md`,
`ap_world_history.md`, `ap_environment.md`, `ap_macro.md`.

**Required format** (extracted from the official College Board CED docx, hand-cleaned):

```markdown
| Term | Definition | Citation |
| :--- | :--- | :--- |
| algorithm | Step-by-step procedures or sets of rules ... | 3.5 Boolean Expressions |
| AND | A logical operator that evaluates to true only if ... | 3.5 Boolean Expressions |
```

The **Citation** column must be `<CED code> <CED title>` (e.g. `3.5 Boolean Expressions`,
`5.6 Safe Computing`). The CED code drives `origin` field generation in the JSON.

**Quirks to watch for:**
- Markdown sort order is lexicographic, so `3.10` appears BEFORE `3.2` in the source
  file. Always group by the citation column, NOT by line order.
- Repeated terms (e.g. `bias` in CED 1.1, 2.3, 5.3) are intentional. Each repetition
  becomes its own JSON entry under the matching concept, with context-tailored
  `meaning_zh`. The same `word` string is fine.

### 2. Schema — locked, mirrors `psych.json`

Each concept (top-level array element):

```jsonc
{
  "root": "Boolean Expressions",                    // human-readable CED title
  "type": "root",
  "meaning_en": "<1 sentence>",
  "meaning_zh": "<1-2 sentence pedagogical, with concrete example>",
  "origin": "Unit 3: 3.5 Boolean Expressions",      // Unit N: <CED code> <CED title>
  "related": ["Conditionals", "Iteration"],         // 2-4 sibling concept names that EXIST
  "words": [
    {
      "word": "AND",
      "breakdown": "AND(且) — logical operator",
      "meaning_en": "<from source md, lightly polished>",
      "meaning_zh": "<pedagogical Chinese with example>",
      "derivation": "<chain with → arrows>",
      "mnemonic": "<memorable device, often playful>",
      "example": "<English sentence>",
      "example_zh": "<Chinese translation>",
      "toefl_frequency": "high|medium|low"
    }
  ]
}
```

**All 9 word fields are mandatory.** The `check.mjs` verifier flags any missing field.

**Runtime contract** (from `src/lib/csp-db.ts` / `psych-db.ts`): only `root`,
`meaning_zh`, `related`, `words[].word`, `words[].meaning_zh` are required at runtime.
But every term gets all 9 to keep the pedagogy quality high.

### 3. Plan a batch

Use `scripts/expand-ced/plan.mjs <subject>` to print a per-CED-topic term-count table,
then group topics into 3-10 batches of 30-60 terms each.

```bash
node scripts/expand-ced/plan.mjs csp
# Prints:
#   Unit 1: 1.1 Intro to Big Idea 1            12 terms
#   Unit 1: 1.2 Program Function and Purpose   17 terms
#   ...
#   Unit 5: 5.6 Safe Computing                 31 terms
#   --- TOTAL: 35 topics / 385 terms ---
```

Heuristics for batch sizing:
- **3-10 batches total.** Fewer = larger commits, harder review. More = trivial commits.
- **Target 30-60 terms per batch.** Range we used: 29-58.
- **Never split a CED topic across batches.** A topic is the atomic unit.
- **Walk in CED order.** This makes `related` field discipline easy (see step 4).

Examples of how the existing subjects were grouped:
- **AP CSP** → 10 batches (BI1 start, BI1 finish, BI2, BI3 basics, BI3 control,
  BI3 lists, BI3 advanced, BI4, BI5 start, BI5 finish)
- **AP Psych** → 5 batches (one per Unit 1-5)
- **AP WHAP** → 4 batches (one per ~64 terms grouped by theme)

### 4. `related` field discipline — no forward references

The `related` field is used at runtime to draw quiz distractors. Every name in
`related` MUST point to a concept that already exists — either committed in a
previous batch or defined in the current batch. **Forward references to future-
batch concepts are forbidden** because they create dangling pointers that fail
the integrity check.

If you need to point to a concept that hasn't been written yet, leave the array
empty `[]` and backfill it on the batch where the target concept lands.

We hit this exactly once during CSP batch 4: `Boolean Expressions` referenced
`Conditionals` (which only existed in batch 5). The fix was to drop those
forward refs and let batch 5 backfill them.

### 5. Carry over hand-written content from the old stub

The old stub JSON usually has hand-authored content (the user's voice, mnemonics,
examples) for many of the terms that appear in the CED source. **Reuse that
content verbatim** when re-authoring those terms in their new CED-aligned concept.
Only add the missing 9 fields (typically `mnemonic`).

This preserves the user's voice and avoids regenerating identical content.

### 6. Verify after each batch

```bash
node scripts/expand-ced/check.mjs <subject>
```

This runs the full integrity check against `src/data/<subject>.json`:
- Concept-level: every concept has `root`, `meaning_zh`, `related[]`, `words[]`
- Word-level: every word has all 9 mandatory fields
- Cross-concept: every `related` name points to an existing concept (no danglers)
- Reports total concept count and term count

Then build + test:

```bash
npm run build && npm test
```

If both pass, commit with the subject line:

```
feat: expand <subject> content — batch N (<scope>, X concepts / Y terms)
```

Where `<subject>` is `psych`, `csp`, `whap`, `environment`, `macro`, etc.

---

## Status of source files in this repo

Run `node scripts/expand-ced/plan.mjs` (with no args) to see the current list.

| File | Format | Status | Notes |
|---|---|---|---|
| `ap_csp.md` | Pipe table with `<code> <title>` citations | ✅ Working | 35 topics / 385 terms — used to ship full csp.json |
| `ap_macro.md` | Pipe table with `<code> <title>` citations | ✅ Working | 42 topics / 492 terms — ready for batch authoring |
| `ap_psyc.md` | 3-line groups (Unit/Topic/Terms-csv) | ❌ Wrong format | Predates the pipe-table convention. psych.json was already shipped from this file by hand. To re-extract or expand, convert to pipe-table format first. |
| `ap_world_history.md` | Pipe table missing the Citation column | ❌ Wrong format | Same situation as psych — whap.json shipped by hand. Add a Citation column to use this workflow. |
| `ap_environment.md` | Pipe table with `[1]`, `[2]` citations | ❌ Wrong citations | Citations are bracketed numbers instead of `<code> <title>`. Re-extract from the official CED docx. |

**Lesson:** for any new AP subject, the FIRST step is to extract a clean
`| Term | Definition | <CED code> <CED title> |` pipe table from the official
College Board CED docx. The two scripts in this folder + the workflow
documented above only work on that format.

## File layout

```
alvy/
├── ap_<subject>.md                    # source of truth (read-only)
├── src/data/<subject>.json            # the file you edit
├── src/lib/<subject>-db.ts            # runtime loader (no schema changes needed)
├── src/lib/types.ts                   # RootEntry / RootWord types (shared)
└── scripts/expand-ced/
    ├── README.md                       # this doc
    ├── plan.mjs                        # print CED topic + term-count table
    └── check.mjs                       # integrity verifier
```

---

## Voice & tone reference (matched from psych.json)

**`meaning_zh`** for a word should:
- Start with the term name + colon + 1-sentence definition
- Include a concrete example or "例如..." clause
- Avoid bare translations — add pedagogical color and a connection to real life

**`derivation`** uses `→` arrows:
```
Bias(倾斜) → 计算机学习历史数据 → 历史有偏见 → 算法也有偏见
Cluster(簇) → 自然形成的小群 → 把相似数据自动归为一团
```

**`mnemonic`** should be playful/memorable:
```
「数据可视化救人命：John Snow 用霍乱地图找到了水井是疾病源头」
「试试 Python: 0.1 + 0.2 == 0.3 → 结果是 False！这就是 roundoff error」
「Y2K 问题、Boeing 787 每 248 天必须重启——都是 overflow 的真实案例」
```

---

## Known check failures in existing JSON

| File | Status | Issue |
|---|---|---|
| `src/data/csp.json` | ✅ 0 problems | 35 concepts / 385 terms, full schema |
| `src/data/psych.json` | ✅ 0 problems | 36 concepts / 607 terms, full schema |
| `src/data/micro.json` | ✅ 0 problems | 36 concepts / 499 terms, full schema |
| `src/data/whap.json` | ⚠️ 255 missing `mnemonic` | 19 concepts / 255 terms — shipped before mnemonic was added to the standard. Runtime is fine (mnemonic is opt-in at runtime), but the integrity check flags every entry. To fix: backfill mnemonic on each WHAP word. |

The check is intentionally strict: it enforces all 9 word fields. If you ship a
new subject and the check fails, fix the JSON before committing. Don't relax the
check to make it pass.

## Lessons learned (from CSP expansion mistakes)

1. **Always run `check.mjs` BEFORE `npm run build`** — the check catches missing
   fields that TypeScript can't (because the JSON contract is loose).

2. **`related` forward refs are forbidden.** If batch 4 references a concept that
   only lands in batch 5, the integrity check fails. Leave `[]` and backfill later.

3. **Don't use `node -e "..."` for the check** — shell escaping mangles `!` and `\`.
   Always use a `.mjs` file. The helper script in this folder handles that.

4. **Run scripts from the alvy root, not `/tmp`.** Import paths like
   `'./src/data/csp.json'` resolve relative to CWD. Always `cd alvy` first.

5. **Read the file before each Edit, even if you read it 5 turns ago.** The
   Edit tool's read-tracking expires across context compaction. A 1-line `Read`
   of the trailing portion is enough to re-arm it.

6. **Match the existing voice.** When carrying over content from the old stub,
   read 2-3 examples from psych.json first to match cadence and example density.
