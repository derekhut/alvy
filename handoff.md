# alvy — Implementation Handoff

Last updated: 2026-04-02
Branch: main
Status: V1 SHIPPED as `@derekhut/alvy@1.0.0` | V2 IN PROGRESS (Phase 1, step 6 next)

## V1 Summary

V1 shipped 2026-04-01 as `toefl-roots`, renamed to `alvy` on 2026-04-02. Published as `@derekhut/alvy` (scoped, npm rejected `alvy` as too similar to `ajv`/`ava`). CLI command is `alvy`. Data at `~/.alvy/data.json`, auto-migrates from `~/.toefl-roots/`.

Student feedback on V1: (1) installation is hard, (2) Windows build issues, (3) want more content. All addressed in V1 rename sprint (install.sh, README Windows section, content expansion planned for V2).

V1 pending: verify on clean machine, test install.sh e2e, test data migration.

## What's Been Implemented (V2 so far)

### Step 0: Test suite (progress.test.ts)
- 29 test cases covering all 8 business logic functions in `progress.ts`
- Written BEFORE any V2 code changes (safety net for refactoring)
- File: `src/lib/__tests__/progress.test.ts`

### Step 1: V2 data model + migration
- **types.ts**: Added `version`, `streak.freezeAvailable/freezeUsedDate`, `RootProgress.quizAccuracy`, `settings`, `RootWord.phonetic/mnemonic`. Cleaned `wordsStudied` from `Set<string> | string[]` to `string[]` only.
- **store.ts**: V1→V2 field-level backfill in `loadData()`. Backs up `data.json` before first V2 migration write. Updated `defaultData()`, `PersistedData`, `saveData()`.
- **progress.ts**: Removed dead `Set<string>` branches from `markWordStudied()` and `generateStatsSummary()`.
- **store.test.ts**: Added 2 new migration tests (V1 backfill round-trip, V2 no re-migration). Total: 6 store tests.

### Step 2: useSessionFlow() hook extraction
- Extracted shared state machine from `daily-session.tsx` and `review-session.tsx` into `src/hooks/useSessionFlow.ts`
- Hook owns: data state, phase transitions, morphemeIdx/wordIdx, XP tracking, SIGINT save, quit with save
- Both session components are now thin wrappers (~100 lines each vs ~180 before)
- **daily-session**: `markSeen: true, checkCelebration: true`, starts at `"dashboard"` phase
- **review-session**: `markSeen: false, checkCelebration: false`, starts at `"intro"` or `"empty"`

### Step 3: Readability fix
- Chinese definitions, translations, examples, section labels → regular white text (not dimmed)
- Dim reserved ONLY for navigation hints ("按回车继续 →") and progress indicators ("词根 1/3")
- Updated DESIGN.md text hierarchy and CJK considerations to match

### Step 4: q-key exit
- Already handled via `useSessionFlow` hook — `quit()` fires `saveData()` + `exit()` in all phases
- No additional code needed (was implicit from step 2)

### Step 5: Quiz system
- **New flow**: `word-detail(x5) → quiz-intro → quiz(x5) → next root or summary`
- **quiz-intro.tsx**: Transition screen — "词根测验 — [root]", "你刚学了5个词，来测试一下！"
- **quiz.tsx**: Shows **English word** as question, **two Chinese meanings** as [1]/[2] choices
- Single keypress to answer (no Enter needed). 1 or 2 only, other keys ignored during quiz.
- Correct: cyan `#5FD7FF` + "正确! +15 XP" + 500ms auto-advance
- Wrong: dusty rose `#FF5F87` + "正确答案: ..." + 1000ms auto-advance
- Auto-advance uses `useEffect` timer in session components, NOT in the hook
- Distractors drawn from other roots' `meaning_zh` (fallback: same root, extreme fallback: "未知")
- +15 XP per correct answer (added via `addXP` in hook)
- **Quiz accuracy tracking NOT yet implemented** (step 6) — XP works but `quizAccuracy` field not written

### Gotchas / bugs caught during implementation

1. **React state batching on phase transitions**: After the last quiz question, `advanceAfterFeedback()` originally set `quizQuestion = null` then called `finishRoot()`. React could render with `phase="quiz"` but `quizQuestion=null`, causing "Cannot read properties of null". Fix: don't null out `quizQuestion` — let it stay until phase changes away from quiz phases.

2. **Quiz direction was initially wrong**: Original design doc said "Chinese meaning prominently, English choices". User corrected: English word is the question (you see the word, recall the meaning), Chinese meanings are the choices. This is standard vocabulary testing.

## V2 Plan Overview

**Source of truth:** `~/.gstack/projects/derekhut-alvy/ceo-plans/2026-04-02-alvy-v2-full-overhaul.md`

16 features across 4 phases. CEO review mode: SELECTIVE EXPANSION (9 proposals, 9 accepted, 0 deferred). All three reviews cleared.

### Target State
60 roots (300 words) at launch, growing to 200+ via content pipeline. Quiz system with accuracy tracking. Continue-or-quit session flow. q-key exit everywhere. Shareable progress cards. Streak freeze. Content importer. Custom daily goals. Speed round. Root family tree. Animated progress. Sound effects (opt-in). Word of the Day. Welcome ceremony.

## V2 Data Model

### UserData (V2) — IMPLEMENTED
```typescript
UserData {
  version: 2                        // triggers upgrade welcome if missing or < 2
  streak: {
    current: number
    longest: number
    lastDate: string | null
    freezeAvailable: boolean        // default true
    freezeUsedDate?: string         // last date freeze was used
  }
  xp: { total: number, today: number }
  dailyGoal: number                 // DEPRECATED: V2 reads settings.dailyGoal, falls back here
  rootProgress: Record<string, {
    seen: boolean
    wordsStudied: number
    lastStudied: string
    quizAccuracy?: {                // quiz performance per root (NOT YET WRITTEN — step 6)
      correct: number
      total: number
    }
  }>
  wordsStudied: string[]            // cleaned to string[] only
  settings?: {                      // user preferences
    sound: boolean                  // default: false
    dailyGoal: number               // persisted custom goal
  }
}
```

### RootWord (V2) — IMPLEMENTED (types only, UI not using phonetic/mnemonic yet)
```typescript
RootWord {
  word: string
  phonetic?: string                 // IPA notation, optional (Phase 2)
  breakdown: string
  derivation: string
  mnemonic?: string                 // 联想记忆, optional (Phase 2)
  meaning_en: string
  meaning_zh: string
  example: string
  example_zh: string
  toefl_frequency: "high" | "medium" | "low"
}
```

### V1 → V2 Migration — IMPLEMENTED
Field-level backfill inside `loadData()` in store.ts. Backs up data.json before first V2 write. No separate migration step.

## V2 State Machine — IMPLEMENTED

```
V1:  dashboard → root-intro → word-detail(x5) → summary

V2:  dashboard → root-intro → word-detail(x5) → quiz-intro → quiz(x5) → summary
                                                                            │
                                                              [Enter] continue (bonus XP) — NOT YET
                                                              [q] exit with save ✅
```

**Quiz screen layout (CORRECTED from original plan):**
- Show **English word** prominently (bold white)
- Two **Chinese meaning** choices below, labeled [1] and [2]
- Single keypress to answer (no Enter needed)
- Correct: cyan flash + "正确! +15 XP" + 500ms auto-advance
- Wrong: dusty rose flash + show correct answer + 1s auto-advance

**Quiz-intro screen:**
- "词根测验 — [root]" header
- "你刚学了5个词，来测试一下！按回车开始"

## V2 XP System

**DECISION (eng review #3 + design review #6):**
- Base: +10 XP per word read (learn mode, **silent** accumulation, no per-word popup) ✅
- Bonus: +5 XP per word if studying beyond dailyGoal (continue mode) — NOT YET (step 7)
- Quiz: +15 XP per correct answer (**visible** feedback, cyan flash) ✅
- XP summary shown at session end, not during learn-by-reading ✅
- `sessionBatch` counter tracks which batch the student is on (batch > 1 = bonus mode) — NOT YET (step 7)

## Test Status

| File | Tests | Coverage |
|------|-------|----------|
| `progress.test.ts` | 29 cases | All 8 functions in progress.ts: masteredCount, seenCount, updateStreak, addXP, markRootSeen, markWordStudied, selectNextMorphemes, generateStatsSummary |
| `store.test.ts` | 6 cases | Path migration, V1→V2 backfill, V2 no re-migration, corrupt data, fresh start |
| **Total** | **35 pass** | |

Tests NOT yet written (from test plan):
- Quiz accuracy tracking (step 6)
- Review selection with quizAccuracy states
- Quiz distractor edge cases
- Continue session / celebration mid-batch
- Custom goal validation
- Bonus XP (sessionBatch)

## Implementation Sequence

```
Phase 1 (Foundation + Quiz):
  0. ✅ Write progress.test.ts (full test suite, BEFORE any V2 code)
  1. ✅ Data model changes (types.ts, store.ts migration, version field)
  2. ✅ Extract useSessionFlow() hook (DRY daily-session + review-session)
  3. ✅ Readability fix (dim → white for content text, update DESIGN.md)
  4. ✅ q-key exit everywhere (already handled via useSessionFlow hook)
  5. ✅ Quiz system (quiz-intro → quiz(x5), binary choice, per-root)
  6. Quiz accuracy tracking in progress.ts
  7. Continue-after-session flow (depends on quiz for "complete" signal)
  8. Custom daily goal

Phase 2 (Content):
  9. Richer word format (phonetic, mnemonic fields in types + word-detail)
  10. Content importer tool (fail-fast validation, all-or-nothing merge)
  11. Expand to 60 roots using importer

Phase 3 (Engagement):
  12. Speed round mode (immediate timer feedback on same screen)
  13. Streak freeze
  14. Shareable progress card
  15. Word of the Day (simple random for V2.0)
  16. Animated progress bar (300ms fill)
  17. Sound effects (opt-in, quiz-only)

Phase 4 (Polish):
  18. Installation ceremony (instant render, ASCII art + tagline)
  19. Upgrade welcome (dashboard banner, not separate screen)
  20. Root family tree
```

### Parallelization Strategy (3 lanes)

```
Lane A (core flow):     steps 0-2 → 5-8 (sequential, shared progress.ts + session hooks)
Lane B (content):       steps 9-11 (independent, types.ts + roots.json only)
Lane C (engagement):    steps 12-17 (independent, new components only)

Execute: A first (foundation). Then B + C in parallel. Phase 4 after merge.
```

## Architecture (V2)

```
alvy/
  src/
    index.tsx              # Entry point, CLI routing, --version, --goal N
    app.tsx                # Routes command to screen component
    components/
      daily-session.tsx    # ✅ Thin wrapper → useSessionFlow()
      review-session.tsx   # ✅ Thin wrapper → useSessionFlow() (filtered selection)
      quiz-intro.tsx       # ✅ NEW: transition screen before quiz
      quiz.tsx             # ✅ NEW: English word → two Chinese choices
      welcome.tsx          # Phase 4: first-run ASCII welcome ceremony
      speed-round.tsx      # Phase 3: timed quiz from all studied words
      share.tsx            # Phase 3: plain text progress card to stdout
      import.tsx           # Phase 2: JSON content importer (fail-fast)
      tree.tsx             # Phase 4: root family tree ASCII diagram
      config.tsx           # Step 8: persistent settings (goal, sound)
      dashboard.tsx        # X/30 mastered + progress bar + streak
      root-lesson.tsx      # ✅ Root intro card (content text white)
      word-detail.tsx      # ✅ Single word display (content text white)
      session-summary.tsx  # XP earned, streak, words studied
      celebration.tsx      # All roots mastered
      streak-header.tsx    # Streak counter + daily progress bar
      stats.tsx            # Export markdown progress summary
      doctor.tsx           # Environment checks
      explore.tsx          # Placeholder (AI explore, deferred)
    hooks/
      useSessionFlow.ts    # ✅ Shared session state machine
    lib/
      __tests__/
        store.test.ts      # ✅ 6 tests (migration + V2 backfill)
        progress.test.ts   # ✅ 29 tests (all business logic)
      roots-db.ts          # Query functions over roots.json
      store.ts             # ✅ JSON persistence, V1→V2 migration, backup
      progress.ts          # ✅ Business logic (Set branch cleaned)
      types.ts             # ✅ TypeScript interfaces (V2 fields)
    data/
      roots.json           # 30 roots × 5 words = 150 words (V1, expand in Phase 2)
  install.sh               # One-line installer for macOS/Linux
  package.json             # @derekhut/alvy
  tsconfig.json
  DESIGN.md                # ✅ Updated with V2 text hierarchy
  ARCHITECTURE.md
```

## Key Files to Read First

If you're picking this up, read in this order:
1. `src/lib/types.ts` — all data interfaces
2. `src/hooks/useSessionFlow.ts` — the state machine (this IS the app logic)
3. `src/lib/progress.ts` — business logic functions
4. `src/lib/store.ts` — persistence + V1→V2 migration
5. `DESIGN.md` — color palette, text hierarchy, CJK rules

## Eng Review Decisions (7 issues resolved)

| # | Issue | Decision | Status |
|---|-------|----------|--------|
| 1 | Quiz-quit data gap | Fix review selection: `!quizAccuracy \|\| (correct/total < 0.8) \|\| wordsStudied < 5` | Step 6 |
| 2 | V2 migration strategy | Field-level backfill in `loadData()`, backup before write | ✅ Done |
| 3 | Bonus XP tracking | Add `sessionBatch` counter, batch > 1 = bonus mode | Step 7 |
| 4 | DESIGN.md CJK conflict | White for content text, dim for nav hints only | ✅ Done |
| 5 | Session DRY | Extract `useSessionFlow()` hook | ✅ Done |
| 6 | Dead Set type | Clean to `string[]` only | ✅ Done |
| 7 | markWordStudied double-count | Leave as-is (counter is metadata) | ✅ No change |

## Design Review Decisions (9 decisions resolved)

| # | Issue | Decision | Status |
|---|-------|----------|--------|
| 1 | Quiz screen layout | English word as question, two Chinese choices [1]/[2], single keypress | ✅ Done |
| 2 | Learn-quiz transition | Quiz-intro screen with "词根测验" header | ✅ Done |
| 3 | Welcome ceremony | Simple instant render, ASCII art + tagline | Phase 4 |
| 4 | Empty states | Specify per-feature empty states | Per feature |
| 5 | Import error output | Fail-fast, all-or-nothing validation | Phase 2 |
| 6 | XP visibility timing | Silent during learn, visible during quiz, summary at end | ✅ Done |
| 7 | DESIGN.md V2 colors | Content text white, dim nav only, quiz feedback colors | ✅ Done |
| 8 | Upgrade welcome | Dashboard banner on first V2 run | Phase 4 |
| 9 | Speed round timer | Show elapsed time on same screen after answer | Phase 3 |

## Outside Voice Findings (resolved)

### Eng Review Outside Voice (Claude subagent)
1. **Quiz identity challenge:** "Quiz contradicts 'learning IS the derivation chain' identity." **Resolution:** Keep quiz, but validate with students post-ship. Added to TODOS.md as P2 item. Quiz is removable without data loss.
2. **Windows build fix:** Students reported `npm run build` fails on Windows. **Resolution:** Build it now (included in V2 scope, not deferred).
3. **Celebration threshold:** V1 celebrates at 30 roots mastered, V2 has 60 roots. **Resolution:** Skipped. Not worth a TODO. Will naturally update when content expands.
4. **Migration rollback:** No backup before V2 schema changes. **Resolution:** ✅ Added `copyFileSync` in `loadData()` before V2 backfill.

### Design Review Outside Voice (Claude subagent)
5 critical + 4 high gaps found. All resolved through the 9 design decisions above.

## TODOS Added from V2 Reviews

- **P2: Quiz validation with students** — collect feedback from 3+ students post-V2 ship. Key question: "你觉得每个词根学完后的小测验有用吗？还是想直接学下一个？"
- **P3: Word of the Day dedup** — track last 7 shown words to avoid repeats within a week. Add `recentWotD: string[]` field.

## npm / Install Info (unchanged from V1)

- **Package:** `@derekhut/alvy` (scoped, public)
- **Install:** `npm install -g @derekhut/alvy`
- **CLI command:** `alvy`
- **Data:** `~/.alvy/data.json`
- **Known issue:** `EACCES` on `~/.npm/_cacache/` — fix with `sudo chown -R $(whoami) ~/.npm`

## Development Commands

```bash
cd alvy
npm run build          # Compile TypeScript
npm run dev            # Watch mode
npm test               # Run tests (Vitest, 35 passing)
node dist/index.js     # Run daily session
node dist/index.js review   # Review weak roots
node dist/index.js stats    # Export progress
node dist/index.js doctor   # Environment check
```

## What Was Explicitly Deferred (V2)

| Item | Why |
|------|-----|
| Standalone binaries (Bun compile) | Ink + yoga native bindings risk |
| SAT/AP content expansion | Separate plan, different content model |
| Web app version | CLI is right for AI Camp coding students |
| Spaced repetition (FSRS) | V3, per TODOS.md. Needs V2 quiz data first. |
| AI explore mode | Needs API key |
| CI/CD for npm publish | Manual publish fine for solo dev |
| Homebrew/Scoop formula | Overkill for current audience |
