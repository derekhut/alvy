# TOEFL Word Root CLI — Implementation Handoff

Last updated: 2026-04-01
Branch: master
Status: V1 SHIPPED

## What This Is

A terminal-based vocabulary tool for Chinese TOEFL students. Students learn English word roots through 新东方-style derivation chains — each word is broken down into morphemes with Chinese translations, and a step-by-step derivation shows how the parts create the meaning. No quiz, no multiple choice. Built with Ink (React for CLI) + TypeScript + local JSON persistence.

The core insight: word roots are the English equivalent of Chinese radicals. "benevolent" isn't arbitrary, it's `bene(好的) + vol(意愿) + ent(…的) → 有好意愿的 → 仁慈的`. Chinese translations in every explanation bridge the two languages.

## Source Documents

- **Design doc (APPROVED):** `~/.gstack/projects/self-learn/derekhu-master-design-20260401-121754.md`
- **CEO plan (6 expansions accepted):** `~/.gstack/projects/self-learn/ceo-plans/2026-04-01-toefl-word-root-cli.md`
- **Design system:** `toefl-roots/DESIGN.md`
- **Architecture:** `toefl-roots/ARCHITECTURE.md`
- **TODOS (V2/V3):** `TODOS.md` in repo root

## Architecture

```
toefl-roots/
  src/
    index.tsx              # Entry point, Ink render, CLI command routing (meow)
    app.tsx                # Main app, routes command to screen component
    components/
      daily-session.tsx    # State machine: dashboard → root-intro → word-detail → summary
      review-session.tsx   # Review weak roots (same flow, filtered selection)
      dashboard.tsx        # X/30 mastered + progress bar + streak (shown on launch)
      root-lesson.tsx      # Root intro card: meaning, origin, related roots
      word-detail.tsx      # Single word: breakdown, derivation chain, example, Chinese
      session-summary.tsx  # XP earned, streak, words studied this session
      celebration.tsx      # Graduation screen when all 30 mastered
      streak-header.tsx    # Streak counter + daily progress bar
      stats.tsx            # Export markdown progress summary
      doctor.tsx           # Environment health checks
      explore.tsx          # V2 stub ("Coming in V2")
    lib/
      roots-db.ts          # Query functions over roots.json (in-memory)
      store.ts             # Local JSON read/write (~/.toefl-roots/data.json)
      progress.ts          # Business logic: streak, XP, mastery, morpheme selection
      ai.ts                # V2 stub (OpenAI client)
      types.ts             # TypeScript interfaces
    data/
      roots.json           # 20 roots + 10 affixes, 5 words each = 150 words
  package.json
  tsconfig.json
  DESIGN.md              # Design system (colors, typography, spacing, CJK rules)
  ARCHITECTURE.md        # Detailed architecture doc for developers
```

## 4 CLI Commands

| Command | What it does |
|---------|-------------|
| `toefl-roots` | Daily session: 3 roots, each with intro + 5 word walkthroughs |
| `toefl-roots review` | Practice weak roots (fewest words studied, already seen) |
| `toefl-roots stats` | Export markdown progress summary |
| `toefl-roots doctor` | Check Node.js version, npm access, UTF-8 locale, disk permissions |

## Key Decisions from Reviews

### Mastery: 5 words studied
A root is "mastered" when `wordsStudied >= 5` (all 5 of its words have been studied). Checked by `masteredCount()` in progress.ts.

### No quiz system
The design review explicitly decided against quizzes. Learning IS the derivation chain — students read how morphemes combine to create meaning. There are no questions, no right/wrong answers, no accuracy metrics.

### File naming: roots.json stays
Keep `roots.json` (not morphemes.json). Each entry has a `"type": "root" | "prefix" | "suffix"` field. The file name is user-facing in error messages, and "roots" is the concept students understand.

### Store split: I/O vs business logic
- `store.ts` — read/write JSON to `~/.toefl-roots/data.json`, handle first-run initialization, corrupted file backup
- `progress.ts` — all business logic: `updateStreak()`, `addXP()`, `markRootSeen()`, `markWordStudied()`, `masteredCount()`, `selectNextMorphemes()`

### Batch writes only
Write `data.json` at session end + quit signal (SIGINT handler). Not after every word. Prevents filesystem thrashing. Uses atomic write (write to `.tmp`, then `rename()`).

### CJK rendering
Chinese text is always dimmed, never bold (preserves stroke clarity). All UI text is in Chinese. English only for vocabulary content. Left-aligned, never centered for mixed CJK/English.

## Data Models

### roots.json entry
```json
{
  "root": "bene-",
  "type": "root",
  "meaning_en": "good, well",
  "meaning_zh": "好的，善良的",
  "origin": "Latin",
  "related": ["mal-"],
  "words": [
    {
      "word": "benefit",
      "breakdown": "bene-(好的) + fit-(做)",
      "derivation": "bene(好的) + fit(做) → 做好事 → 益处",
      "meaning_en": "an advantage or profit gained from something",
      "meaning_zh": "益处，好处",
      "example": "Exercise has many health benefits.",
      "example_zh": "运动有很多健康方面的益处。",
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
    "bene-": { "seen": true, "wordsStudied": 5, "lastStudied": "2026-04-01" }
  },
  "wordsStudied": ["benefit", "benevolent", "benediction", "benefactor", "benign"]
}
```

### TypeScript interfaces
```typescript
interface UserData {
  streak: { current: number; longest: number; lastDate: string | null };
  xp: { total: number; today: number };
  dailyGoal: number;
  rootProgress: Record<string, RootProgress>;
  wordsStudied: string[];
}

interface RootProgress {
  seen: boolean;
  wordsStudied: number;    // 0-5, mastered when >= 5
  lastStudied: string | null;
}
```

## Morpheme Selection Algorithm

1. **Daily session (`selectNextMorphemes`):** Unseen roots first, in `roots.json` order. Once all 30 seen, pick roots with the fewest `wordsStudied`. Tie-breaker: oldest `lastStudied`.
2. **Review mode:** Same algorithm but filtered to roots where `seen === true`. Picks the 3 weakest seen roots for repeat practice.

## Session Flow

```
Launch → Dashboard (X/30 mastered, streak, XP)
  → Root Intro (root meaning, origin, related roots)
    → Word Detail (breakdown + derivation chain + Chinese + example)
    → Word Detail ... (×5 per root, Enter to advance)
  → Next Root Intro ... (×3 roots per session)
  → Session Summary (words studied, XP earned, streak)
  → If all 30 mastered → Celebration screen
```

State machine phases: `dashboard → root-intro → word-detail → summary | celebration`

## XP and Streak Rules

- **XP:** +10 per word studied. Unconditional — every word earns XP. No penalty, no bonus.
- **Streak:** Increments when a session is completed. Consecutive calendar days. Missing a day resets to 0 (but `longest` is preserved).
- **Daily XP reset:** `xp.today` resets to 0 when `lastDate` changes.

## Quit Behavior

Both `q` and Ctrl+C trigger graceful exit:
1. Save current UserData to `data.json` (atomic write)
2. Incomplete roots (lesson shown but not all words studied) retain partial `wordsStudied` count
3. Streak only updates at session completion (`updateStreak` called after all roots done)

## Implementation Status

V1 is complete and shipped. The implementation order was:
1. CJK prototype — root-lesson.tsx with Chinese in bordered box
2. Data layer — roots.json, store.ts, progress.ts, roots-db.ts, types.ts
3. Components — dashboard, word-detail, session-summary, celebration, streak-header, stats, doctor
4. Commands — daily, review, stats, doctor
5. Design polish — 15 commits of visual refinement per DESIGN.md

## V1 Scope (shipped)

- 20 roots + 10 prefixes/suffixes = 30 entries × 5 words = 150 words
- Root family connections (cross-references between related roots)
- Progress dashboard on launch (X/30 mastered + progress bar)
- Completion celebration when all 30 mastered
- Review mode for weak roots
- Stats export as markdown
- Doctor command for environment verification
- Streaks, XP (+10/word studied), daily goal (3 roots/session)
- Zero API calls in V1. ai.ts and explore.tsx are stubs.

## NOT in V1

- AI-powered explore mode (V2)
- AI Chinese mnemonics (V2)
- Spaced repetition algorithm (V2)
- Parent progress reports (V2, `toefl-roots stats` is the simpler V1 version)
- Weekly digest report (V2)
- Terminal achievements/badges (V3)
- 200+ roots (V1 has 30)
- Test suite (no Vitest, no ink-testing-library yet)

## Known Risks

1. **CJK double-width alignment** — Ink's yoga-layout may break column alignment with Chinese characters. Verified working in Terminal.app and iTerm2.
2. **Root database accuracy** — Every etymology hand-verified against Wiktionary. Wrong roots destroy trust.
3. **Chinese translation quality** — Uses standard TOEFL translations, not AI-generated.
4. **npx cold start** — First `npx toefl-roots` takes 10-30 seconds. Recommend `npm i -g toefl-roots` for repeat use.
5. **Student environment** — Run `toefl-roots doctor` on test students' machines before use. Have USB fallback if npm is blocked by school firewall.
