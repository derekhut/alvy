# alvy — Implementation Handoff

Last updated: 2026-04-02
Branch: main
Status: V1 SHIPPED as `@derekhut/alvy@1.0.0` | V2 IN PROGRESS (Phase 1, step 2 next)

## V1 Summary

V1 shipped 2026-04-01 as `toefl-roots`, renamed to `alvy` on 2026-04-02. Published as `@derekhut/alvy` (scoped, npm rejected `alvy` as too similar to `ajv`/`ava`). CLI command is `alvy`. Data at `~/.alvy/data.json`, auto-migrates from `~/.toefl-roots/`.

Student feedback on V1: (1) installation is hard, (2) Windows build issues, (3) want more content. All addressed in V1 rename sprint (install.sh, README Windows section, content expansion planned for V2).

V1 pending: verify on clean machine, test install.sh e2e, test data migration.

## V2 Plan Overview

**Source of truth:** `~/.gstack/projects/derekhut-alvy/ceo-plans/2026-04-02-alvy-v2-full-overhaul.md`

16 features across 4 phases. CEO review mode: SELECTIVE EXPANSION (9 proposals, 9 accepted, 0 deferred). All three reviews cleared.

### Target State
60 roots (300 words) at launch, growing to 200+ via content pipeline. Quiz system with accuracy tracking. Continue-or-quit session flow. q-key exit everywhere. Shareable progress cards. Streak freeze. Content importer. Custom daily goals. Speed round. Root family tree. Animated progress. Sound effects (opt-in). Word of the Day. Welcome ceremony.

## V2 Data Model

### UserData (V2)
```typescript
UserData {
  version: 2                        // NEW: triggers upgrade welcome if missing or < 2
  streak: {
    current: number
    longest: number
    lastDate: string | null
    freezeAvailable: boolean        // NEW: default true
    freezeUsedDate?: string         // NEW: last date freeze was used
  }
  xp: { total: number, today: number }
  dailyGoal: number                 // DEPRECATED: V2 reads settings.dailyGoal, falls back here
  rootProgress: Record<string, {
    seen: boolean
    wordsStudied: number
    lastStudied: string
    quizAccuracy?: {                // NEW: quiz performance per root
      correct: number
      total: number
    }
  }>
  wordsStudied: string[]            // DECISION: clean to string[] only, remove dead Set<string> branch
  settings?: {                      // NEW: user preferences
    sound: boolean                  // default: false
    dailyGoal: number               // persisted custom goal
  }
}
```

### RootWord (V2)
```typescript
RootWord {
  word: string
  phonetic?: string                 // NEW: IPA notation, optional
  breakdown: string
  derivation: string
  mnemonic?: string                 // NEW: 联想记忆, optional
  meaning_en: string
  meaning_zh: string
  example: string
  example_zh: string
  toefl_frequency: "high" | "medium" | "low"
}
```

### V1 → V2 Migration
**DECISION (eng review #2):** Field-level backfill inside `loadData()` in store.ts. After JSON parse, check for missing V2 fields, add defaults, atomic write. No separate migration step.
- Backup original data.json before V2 schema changes (`copyFileSync` one-liner)
- `version` defaults to `2`
- `streak.freezeAvailable` defaults to `true`
- `streak.freezeUsedDate` defaults to `undefined`
- `rootProgress[*].quizAccuracy` defaults to `undefined`
- `settings` defaults to `{ sound: false, dailyGoal: data.dailyGoal || 3 }`

## V2 State Machine

```
V1:  dashboard → root-intro → word-detail(x5) → summary

V2:  dashboard → root-intro → word-detail(x5) → quiz-intro → quiz(x5) → summary
                                                                            │
                                                              [Enter] continue (bonus XP)
                                                              [q] exit with save
```

**DECISION (design review #1):** Quiz screen layout:
- Show Chinese meaning prominently (bold white, centered)
- Two English choices below, labeled [1] and [2]
- Single keypress to answer (no Enter needed)
- Correct: cyan flash + "+15 XP" + 500ms pause, then next question
- Wrong: dusty rose flash + show correct answer + 1s pause

**DECISION (design review #2):** Quiz transition screen between word-detail and quiz:
- "词根测验 — [root]" header
- "你刚学了5个词，来测试一下！按回车开始"
- Brief pause for context switch (student knows they're entering quiz mode)

## V2 XP System

**DECISION (eng review #3 + design review #6):**
- Base: +10 XP per word read (learn mode, **silent** accumulation, no per-word popup)
- Bonus: +5 XP per word if studying beyond dailyGoal (continue mode)
- Quiz: +15 XP per correct answer (**visible** feedback, cyan flash)
- XP summary shown at session end, not during learn-by-reading
- `sessionBatch` counter tracks which batch the student is on (batch > 1 = bonus mode)

## Eng Review Decisions (7 issues resolved)

| # | Issue | Decision | What Changes |
|---|-------|----------|-------------|
| 1 | Quiz-quit data gap: quitting mid-quiz loses quiz progress but V1 review criteria don't account for undefined quizAccuracy | Fix review selection: `!quizAccuracy \|\| (correct/total < 0.8) \|\| wordsStudied < 5` | progress.ts |
| 2 | V2 migration strategy | Field-level backfill in `loadData()`, not separate migration step. Backup before V2 write. | store.ts |
| 3 | Bonus XP tracking: no way to know if student is in "continue" mode | Add `sessionBatch` counter to session state. Batch > 1 = bonus XP mode. | daily-session.tsx |
| 4 | DESIGN.md conflict: CJK "always dimmed" contradicts V2 plan (Chinese definitions dim→white) | Update DESIGN.md: white for content text (definitions, examples, translations). Dim ONLY for navigation hints. | DESIGN.md |
| 5 | Session DRY: daily-session.tsx and review-session.tsx share ~80% identical code | Extract `useSessionFlow()` hook. Both sessions become thin wrappers calling shared hook. | NEW: useSessionFlow.ts, refactor daily-session.tsx + review-session.tsx |
| 6 | Dead Set type in wordsStudied | Clean to `string[]` only, remove dead `Set<string>` branch from types.ts | types.ts |
| 7 | markWordStudied double-count on re-study | **Leave as-is.** Counter is metadata, not user-facing. Not worth the complexity to deduplicate. | no change |

## Design Review Decisions (9 decisions resolved)

| # | Issue | Decision | What to Implement |
|---|-------|----------|-------------------|
| 1 | Quiz screen layout unspecified | Add full spec: Chinese meaning centered, two choices [1]/[2], single keypress, color-coded feedback | Quiz component |
| 2 | No transition between learn and quiz | Add quiz-intro screen: "词根测验" header + instruction text + Enter to start | Quiz-intro component |
| 3 | Welcome ceremony render strategy | Simple instant render (no streaming/typewriter). ASCII art + tagline + "按任意键开始学习" | Welcome component |
| 4 | Empty states missing for 4 features | Specify empty states: review (no weak roots), speed round (no studied words), tree (no studied roots), share (no data) | Each component |
| 5 | Import error output undefined | Fail-fast, all-or-nothing. Show all validation errors upfront, don't partial-merge. | Import command |
| 6 | XP visibility timing unclear | Silent accumulation during learn-by-reading. Visible feedback only during quiz (+15 XP flash). Summary at session end. | XP display logic |
| 7 | DESIGN.md needs V2 color updates | Add quiz feedback colors (cyan correct, dusty rose wrong). Update text hierarchy (content text = white, dim = nav hints only). | DESIGN.md |
| 8 | Upgrade welcome format | Dashboard banner on first V2 run, not a separate screen. "alvy 已升级！新功能：测验、连胜保护、分享" banner that dismisses on any key. | Dashboard component |
| 9 | Speed round timer feedback | Show elapsed time immediately after answer on same screen (not a separate results screen). e.g., "正确！⏱ 2.3秒 +15 XP" | Speed round component |

## Outside Voice Findings (resolved)

### Eng Review Outside Voice (Claude subagent)
1. **Quiz identity challenge:** "Quiz contradicts 'learning IS the derivation chain' identity." **Resolution:** Keep quiz, but validate with students post-ship. Added to TODOS.md as P2 item. Quiz is removable without data loss.
2. **Windows build fix:** Students reported `npm run build` fails on Windows. **Resolution:** Build it now (included in V2 scope, not deferred).
3. **Celebration threshold:** V1 celebrates at 30 roots mastered, V2 has 60 roots. **Resolution:** Skipped. Not worth a TODO. Will naturally update when content expands.
4. **Migration rollback:** No backup before V2 schema changes. **Resolution:** Add one `copyFileSync` call before V2 migration writes.

### Design Review Outside Voice (Claude subagent)
5 critical + 4 high gaps found. All resolved through the 9 design decisions above (quiz layout, transition screen, empty states, XP timing, etc.).

## Test Plan

**Current state:** 4 Vitest tests in `store.test.ts` (migration only). `progress.ts` has 0 tests.

**DECISION (eng review):** Write full `progress.test.ts` before V2 code changes. 15+ test cases covering:

### Critical Paths (must test)
- `updateStreak()` — 4 branches: same day, consecutive, gap, first ever
- `selectNextMorphemes()` — unseen first, then least-studied
- `markWordStudied()` — XP increment, wordsStudied array update
- `masteredCount()` — correct count with mixed progress states
- V2 migration round-trip: load V1 data → backfill → save → reload → all fields present

### V2-Specific Tests
- Quiz accuracy tracking: correct/total increments across multiple quizzes
- Review selection with mixed quizAccuracy states (undefined, low, high)
- Quiz distractor: only 1 root studied → draw from unstudied roots
- Continue session when all remaining roots mastered mid-batch → celebration
- Custom goal validation: reject 0, 11 (outside 1-10 range)
- Bonus XP: sessionBatch > 1 triggers +5 per word

### Store Migration Tests (extend existing)
- V1 data with no version field → migration adds version=2, settings, freeze fields
- V2 data loads without re-migration
- Corrupt data → graceful fallback

## Implementation Sequence

```
Phase 1 (Foundation + Quiz):
  0. ✅ Write progress.test.ts (full test suite, BEFORE any V2 code)
  1. ✅ Data model changes (types.ts, store.ts migration, version field)
  2. Extract useSessionFlow() hook (DRY daily-session + review-session)
  3. Readability fix (dim → white for content text, update DESIGN.md)
  4. q-key exit everywhere
  5. Quiz system (quiz-intro → quiz(x5), binary choice, per-root)
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
      daily-session.tsx    # Thin wrapper → useSessionFlow()
      review-session.tsx   # Thin wrapper → useSessionFlow() (filtered selection)
      quiz-intro.tsx       # NEW: transition screen before quiz
      quiz.tsx             # NEW: binary choice quiz (5 questions per root)
      welcome.tsx          # NEW: first-run ASCII welcome ceremony
      speed-round.tsx      # NEW: timed quiz from all studied words
      share.tsx            # NEW: plain text progress card to stdout
      import.tsx           # NEW: JSON content importer (fail-fast)
      tree.tsx             # NEW: root family tree ASCII diagram
      config.tsx           # NEW: persistent settings (goal, sound)
      dashboard.tsx        # X/60 mastered + progress bar + streak + WotD + upgrade banner
      root-lesson.tsx      # Root intro card
      word-detail.tsx      # Single word display (+ phonetic, mnemonic if available)
      session-summary.tsx  # XP earned, streak, words studied
      celebration.tsx      # All roots mastered
      streak-header.tsx    # Streak counter + daily progress bar
      stats.tsx            # Export markdown progress summary
      doctor.tsx           # Environment checks
    hooks/
      useSessionFlow.ts    # NEW: shared session state machine (extracted from daily/review)
    lib/
      __tests__/
        store.test.ts      # Migration tests (4 existing + V2 extension)
        progress.test.ts   # NEW: full business logic test suite (15+ cases)
      roots-db.ts          # Query functions over roots.json
      store.ts             # JSON persistence, V1→V2 migration, backup
      progress.ts          # All business logic (+ quiz accuracy, review criteria)
      types.ts             # TypeScript interfaces (V2 fields added)
    data/
      roots.json           # 60 entries × 5 words = 300 words (V2.0)
  install.sh               # One-line installer for macOS/Linux
  package.json             # @derekhut/alvy
  tsconfig.json
  DESIGN.md                # Updated with V2 color hierarchy + quiz feedback colors
  ARCHITECTURE.md
```

## Key Decisions (V2 changes from V1)

| V1 Decision | V2 Change | Why |
|------------|-----------|-----|
| No quiz (learning IS the derivation chain) | Add binary quiz after each root (hypothesis to validate) | Reinforcement through choosing. 90%+ win rate. Removable if students dislike. |
| CJK always dimmed | Chinese content text → regular white. Dim ONLY for nav hints. | Content was unreadable on dark terminals. |
| Batch writes only | Unchanged | Still batch writes at session end + SIGINT. |
| Unconditional +10 XP | +10 learn (silent) + 15 quiz (visible) + 5 bonus (continue) | Richer XP system with visible quiz rewards. |
| Ctrl+C only exit | q-key exit everywhere (except during quiz text input) | Student feedback. |
| 3-roots-then-exit | Continue-or-quit prompt after daily goal | Students wanted to keep going. |
| 30 roots / 150 words | 60 roots / 300 words at V2.0 launch | Content expansion most requested. |

## Review Status

| Review | Status | Date | Key Findings |
|--------|--------|------|-------------|
| CEO Review (V1 rename) | CLEAR | 2026-04-02 | HOLD SCOPE. Install script + rename. |
| Eng Review (V1 rename) | CLEAR | 2026-04-02 | DRY fix, migration sequencing, Vitest. |
| CEO Review (V2 plan) | CLEAR | 2026-04-02 | SELECTIVE EXPANSION. 9 proposals, 9 accepted. |
| Eng Review (V2 plan) | CLEAR | 2026-04-02 | 7 issues, 3 critical gaps. All resolved. |
| Design Review (V2 plan) | CLEAR | 2026-04-02 | 5/10 → 8/10. 9 design decisions added. |
| Outside Voice (Eng) | Resolved | 2026-04-02 | Quiz identity, Windows, celebration, backup. |
| Outside Voice (Design) | Resolved | 2026-04-02 | 5 critical + 4 high gaps. All resolved. |

**VERDICT:** CEO + ENG + DESIGN CLEARED. Ready to implement.

## TODOS Added from V2 Reviews

- **P2: Quiz validation with students** — collect feedback from 3+ students post-V2 ship. Key question: "你觉得每个词根学完后的小测验有用吗？还是想直接学下一个？"
- **P3: Word of the Day dedup** — track last 7 shown words to avoid repeats within a week. Add `recentWotD: string[]` field.

## npm / Install Info (unchanged from V1)

- **Package:** `@derekhut/alvy` (scoped, public)
- **Install:** `npm install -g @derekhut/alvy`
- **CLI command:** `alvy`
- **Data:** `~/.alvy/data.json`
- **Known issue:** `EACCES` on `~/.npm/_cacache/` — fix with `sudo chown -R $(whoami) ~/.npm`

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
