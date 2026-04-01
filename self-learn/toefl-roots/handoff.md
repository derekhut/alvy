# TOEFL Word Root CLI - Implementation Handoff

Last updated: 2026-04-01
Branch: master
Status: Reviews CLEARED, ready to implement

## What This Is

A terminal-based vocabulary tool for Chinese TOEFL students. Students learn English word roots with Chinese translations, drill words built from those roots, and track progress with streaks/XP. Built with Ink (React for CLI) + TypeScript + local JSON persistence.

The core insight: word roots are the English equivalent of Chinese radicals. "benevolent" isn't arbitrary, it's "bene-(good) + vol-(willing) + -ent". Chinese translations in every explanation bridge the two languages.

## Source Documents

- **Design doc (APPROVED):** `~/.gstack/projects/self-learn/derekhu-master-design-20260401-121754.md`
- **CEO plan (6 expansions accepted):** `~/.gstack/projects/self-learn/ceo-plans/2026-04-01-toefl-word-root-cli.md`
- **Test plan:** `~/.gstack/projects/self-learn/derekhu-master-eng-review-test-plan-20260401-132500.md`
- **TODOS (V2/V3):** `TODOS.md` in repo root

## Architecture

```
toefl-roots/
  src/
    index.tsx              # Entry point, Ink render, CLI command routing
    app.tsx                # Main app, routing between screens
    components/
      root-lesson.tsx      # Root + breakdown + Chinese meaning + 5 words
      word-drill.tsx       # Multiple choice quiz (1 correct + 3 distractors)
      result.tsx           # Correct/wrong + Chinese explanation
      session-summary.tsx  # XP earned, streak, accuracy, weakest root
      dashboard.tsx        # X/30 mastered + progress bar (shown on launch)
      celebration.tsx      # Graduation screen when all 30 mastered
      streak-header.tsx    # Streak counter + daily progress bar
      explore.tsx          # V2 stub ("Coming in V2")
    lib/
      roots-db.ts          # Query functions for roots.json
      store.ts             # Local JSON read/write (~/.toefl-roots/)
      progress.ts          # Business logic: streak, XP, accuracy, mastery, selection
      ai.ts                # V2 stub (OpenAI client)
      types.ts             # TypeScript interfaces
    data/
      roots.json           # 20 roots + 10 affixes, 5 words each = 150 words
  package.json
  tsconfig.json
```

## 4 CLI Commands

| Command | What it does |
|---------|-------------|
| `toefl-roots` | Daily session: 3 roots, lesson then 5-question drill each |
| `toefl-roots review` | Targeted practice on weak morphemes (accuracy < 80%) |
| `toefl-roots stats` | Export markdown progress summary |
| `toefl-roots doctor` | Check Node.js version, npm access, CJK font, disk permissions |

## Key Decisions from Reviews

### Mastery: 80% accuracy threshold
A morpheme is "mastered" when `seen === true && drillAccuracy >= 0.8`. Exported as `MASTERY_THRESHOLD = 0.8` in progress.ts.

### File naming: roots.json stays
Keep `roots.json` (not morphemes.json). Add a `"type": "root" | "prefix" | "suffix"` field to each entry. The file name is user-facing (students see it in error messages), and "roots" is the concept they understand.

### Store split: I/O vs business logic
- `store.ts` — read/write JSON to `~/.toefl-roots/data.json`, handle first-run initialization, corrupted file backup
- `progress.ts` — all business logic: `updateStreak()`, `calculateXP()`, `updateDrillAccuracy()`, `isMastered()`, `selectNextMorphemes()`, `selectReviewMorphemes()`

### Review drills update accuracy
Review drills use the same `updateDrillAccuracy()` formula as daily drills. Students see progress from reviewing weak morphemes.

### Batch writes only
Write `data.json` at session end + quit signal (SIGINT handler). Not after every answer. Prevents filesystem thrashing.

### Distractor selection
Draw from other learned roots. If < 4 roots learned, draw from unlearned roots in roots.json. Never show distractors from the same root as the correct answer.

### CJK rendering: prototype first
Build root-lesson.tsx FIRST before anything else. Render a root with Chinese characters in a bordered box. Verify alignment in Terminal.app and iTerm2. If yoga-layout breaks CJK double-width, fix it before building anything else.

## Data Models

### roots.json entry
```json
{
  "root": "bene-",
  "type": "root",
  "meaning_en": "good, well",
  "meaning_zh": "good",
  "origin": "Latin",
  "related": ["mal-"],
  "words": [
    {
      "word": "benefit",
      "breakdown": "bene-(good) + fit-(do)",
      "meaning_en": "an advantage or profit",
      "meaning_zh": "benefit",
      "example": "Exercise has many health benefits.",
      "toefl_frequency": "high"
    }
  ]
}
```

### data.json (stored at ~/.toefl-roots/data.json)
```json
{
  "streak": { "current": 0, "longest": 0, "lastDate": null },
  "xp": { "total": 0, "today": 0 },
  "dailyGoal": 3,
  "rootProgress": {
    "bene-": { "seen": true, "drillAccuracy": 0.8, "lastDrilled": "2026-04-01" }
  },
  "wordHistory": {
    "benevolent": { "attempts": 3, "correct": 2, "lastSeen": "2026-04-01" }
  },
  "mnemonicCache": {}
}
```

## Morpheme Selection Algorithm

1. **Daily session:** Unseen morphemes first (sequential order from roots.json). Once all 30 seen, pick lowest drillAccuracy. Tie-breaker: oldest lastDrilled.
2. **Review mode:** All morphemes where `seen === true && drillAccuracy < 0.8`. If none, show "All mastered!" message.

## Implementation Order

1. **`toefl-roots doctor`** — verify student environments this week
2. **CJK prototype** — root-lesson.tsx with Chinese in bordered box, test alignment
3. **Data layer** — roots.json (with type field), store.ts, progress.ts, roots-db.ts
4. **Components** — dashboard, word-drill, session-summary, celebration, stats
5. **Commands** — daily, review, stats, doctor
6. **Tests** — Vitest + ink-testing-library, 3 tiers (see test plan)
7. **Build + distribution** — package.json bin field, tsc, shebang, `npx toefl-roots`

## V1 Scope (all accepted from CEO review)

- 20 roots + 10 prefixes/suffixes = 30 entries x 5 words = 150 words
- Root family connections (cross-references between related roots during lessons)
- Progress dashboard on launch (X/30 mastered + progress bar)
- Completion celebration when all 30 mastered
- Review mode for weak morphemes
- Stats export as markdown
- Doctor command for environment verification
- Streaks, XP (+10/correct), daily goal (3 entries/session)
- Zero API calls in V1. ai.ts and explore.tsx are stubs.

## NOT in V1

- AI-powered explore mode (V2)
- AI Chinese mnemonics (V2)
- Spaced repetition algorithm (V2)
- Parent progress reports (V2, `toefl-roots stats` is the simpler V1 version)
- Weekly digest report (V2)
- Terminal achievements/badges (V3)
- 200+ roots (V1 has 30)

## Test Stack

- **Vitest** for unit + integration tests
- **ink-testing-library** for component rendering tests
- **3 tiers:** Pure logic (progress.ts, store.ts, roots-db.ts), component rendering, integration flows
- Full test plan at `~/.gstack/projects/self-learn/derekhu-master-eng-review-test-plan-20260401-132500.md`

## Known Risks

1. **CJK double-width alignment** — Ink's yoga-layout may break column alignment with Chinese characters. Prototype first.
2. **Root database accuracy** — Hand-verify every etymology against Wiktionary. Wrong roots destroy trust.
3. **Chinese translation quality** — Use standard TOEFL translations, not AI-generated.
4. **npx cold start** — First `npx toefl-roots` takes 10-30 seconds. Document it. Recommend `npm i -g toefl-roots` for repeat use.
5. **Student environment** — Run `toefl-roots doctor` on test students' machines before Monday. Have USB fallback if npm is blocked by school firewall.

## XP and Streak Rules

- **XP:** +10 per correct answer. No penalty for wrong. No streak bonus in V1.
- **Streak:** Increments when >= 1 root drill completed before midnight local time. Skipping a calendar day resets to 0. Partial sessions count.
- **drillAccuracy:** `correct / total attempts` for words in that root, updated as weighted average after each drill session.

## Session Flow

```
Launch → Dashboard (X/30 mastered, streak, XP)
  → Root Lesson (root + 5 words with breakdowns + Chinese)
    → Show family connections if related roots exist
  → Drill (5 questions, multiple choice A/B/C/D)
    → Green correct / Red wrong + Chinese explanation
  → Repeat x3 (or fewer if near end)
  → Session Summary (XP earned, streak, accuracy, weakest morpheme)
  → If all 30 mastered → Celebration screen
```

## Quit Behavior

Both `q` and Ctrl+C trigger graceful exit:
1. Flush current XP, rootProgress, wordHistory to data.json
2. Incomplete roots (lesson shown but not drilled) are NOT marked as seen
3. Last completed drill determines streak status
