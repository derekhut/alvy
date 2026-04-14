# alvy — Implementation Handoff

Last updated: 2026-04-14
Branch: update_version
Status: V1 SHIPPED as `@derekhut/alvy@1.0.0` | V2 IN PROGRESS (Phase 1 COMPLETE, Phase 2 next) | AP Psych COMPLETE (36 concepts / 607 terms) | AP CSP COMPLETE (35 concepts / 385 terms, full CED coverage of Big Ideas 1-5) | AP WHAP COMPLETE (19 concepts / 255 terms) | AP Micro COMPLETE (36 concepts / 499 terms, all 6 Units, authored in 6 parallel batches) | **AP Macro COMPLETE (42 concepts / 492 terms, all 6 Units, fully wired via SubjectRegistry)** | Update flow REWRITTEN (no auto-relaunch) | Gamification Phase A LIVE (levels, ASCII art avatars, profile, composite score) | **SubjectRegistry refactor LANDED** (v1.7.0 LOCAL — 15 per-subject files collapsed into 1 SubjectDB factory + 2 generic components + 1 registry) | **CEO-review follow-ups LANDED** (`resolveCommand` extracted with 9 unit tests, `Subject`/`Command` derived from `SUBJECT_IDS`, `SUBJECT_TO_SESSION_COMMAND` deleted, `generateStatsSummary` defaults removed) | **Quiz mode LANDED** (刷卡片/刷题 mode picker after subject selection, 20 random questions per session, `alvy test`/`alvy <sub> test` CLI support)

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
- **daily-session**: `markSeen: true, showContinuePrompt: true`, starts at `"dashboard"` phase
- **review-session**: `markSeen: false, showContinuePrompt: false`, starts at `"intro"` or `"empty"`

### Step 3: Readability fix
- Chinese definitions, translations, examples, section labels → regular white text (not dimmed)
- Dim reserved ONLY for navigation hints ("← →", "esc") and progress indicators ("词根 1/3")
- Updated DESIGN.md text hierarchy and CJK considerations to match

### Step 4: q-key exit (now Esc)
- Originally q-key, now Esc — handled via `useSessionFlow` hook — `quit()` fires `saveData()` + `exit()` in all phases
- Esc from continue-prompt goes to summary first (not immediate quit)

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
- **Quiz accuracy tracking**: `recordQuizResult()` in progress.ts, called from `answerQuiz` in hook
- **Review selection**: `selectReviewMorphemes()` uses eng review #1 criteria: `!quizAccuracy || accuracy < 0.8 || wordsStudied < 5`

### Step 6: Quiz accuracy tracking
- **progress.ts**: Added `recordQuizResult()`, `needsReview()`, `selectReviewMorphemes()`
- **useSessionFlow.ts**: `answerQuiz()` now calls `recordQuizResult()` for every quiz answer (correct or wrong)
- **review-session.tsx**: Replaced inline sort with `selectReviewMorphemes()` — prioritizes lowest accuracy, never-quizzed, and under-studied roots
- **progress.test.ts**: 15 new tests (recordQuizResult ×4, needsReview ×6, selectReviewMorphemes ×5). Total: 50 tests
- Review criteria per eng review #1: `!quizAccuracy || (correct/total < 0.8) || wordsStudied < 5`

### Step 7: Continue-after-session flow
- After completing daily batch quiz, shows `continue-prompt` phase instead of `summary`
- Enter → `continueSession()`: selects next batch via `selectNextMorphemes()`, increments `sessionBatch`
- q → `goToSummary()`: shows session summary and exits
- **Bonus XP**: `sessionBatch > 0` gives +15 XP per word (base 10 + 5 bonus) instead of +10
- `SessionSummary` shows "(含奖励)" indicator when in bonus mode
- New component: `continue-prompt.tsx`

### Step 8: Custom daily goal
- `--goal N` CLI flag (1-10) persists to `settings.dailyGoal` and `dailyGoal`
- Daily session reads `settings.dailyGoal` with fallback to `dailyGoal`
- No interactive config screen — flag-based for simplicity

### Step 9: Subject picker at launch
- `alvy` (no args) now shows arrow-key subject picker instead of going straight to TOEFL daily session
- Six subjects: TOEFL 词根 (30 roots), AP 心理学 (36/607), AP 计算机科学原理 (35/385), AP 世界历史 (19/255), AP 微观经济学 (36/499), AP 宏观经济学 (42/492). All subjects are now driven from a single `SubjectRegistry` (`src/lib/subjects.ts`). Per-subject rows show shared XP/studied counts (no mastered counter after v1.6.5).
- Remember-last: `settings.lastSubject` persisted, cursor pre-highlights previous choice
- Direct commands still work: `alvy psych`, `alvy review`, etc. (no picker shown)
- **types.ts**: Added `Subject` type, `"pick"` to `Command` union, `lastSubject?` to settings
- **subject-picker.tsx**: New component with `useInput` for arrow keys, DESIGN.md compliant
- **app.tsx**: State-based routing — `"pick"` renders SubjectPicker, `onSelect` saves lastSubject and resolves to `"daily"` or `"psych"`
- **index.tsx**: Default command changed from `"daily"` to `"pick"`
- **store.ts**: Updated `PersistedData` to include `lastSubject` field

### Step 10: Arrow-key navigation with back support
- **→ (right arrow)** replaces Enter for all card navigation (dashboard → root-intro → word-detail → quiz-intro etc.)
- **← (left arrow)** goes back: word→previous word, first word→root-intro, root-intro→previous root's last word, first root→dashboard
- **Esc** replaces `q` for quit everywhere (saves data)
- **Enter** removed as navigation key (only kept in subject picker for selection)
- Quiz still uses `1`/`2` keys, arrows ignored during quiz
- Nav hints moved inside cards as dimmed `← →` / `esc` indicators (no more `按回车...` text)
- **useSessionFlow.ts**: Added `goBack()` action with full back-navigation logic
- **All 4 session components**: Replaced `key.return` → `key.rightArrow`, `input === "q"` → `key.escape`, added `key.leftArrow` → `goBack()`
- **All card components**: Replaced old hint text below cards with `justifyContent="space-between"` hint rows

### Step 11: Auto-update checker
- **update-check.ts**: `checkForUpdate()` fetches latest version from npm registry (2s timeout), compares with local `package.json` version using semver. `runUpdate()` runs `npm install -g @derekhut/alvy@latest`.
- **update-prompt.tsx**: Shows update prompt when newer version available. Arrow-key menu: "立即更新" / "跳过". Three phases: prompt → updating → done. Esc to skip.
- **app.tsx**: Runs `checkForUpdate()` on mount (only in picker mode). Shows `UpdatePrompt` before `SubjectPicker` if update available. `onSkip` dismisses and continues to picker.
- Non-blocking: 2s timeout, failures silently ignored (returns null). Direct commands (`alvy psych`, etc.) skip the check entirely.

### Step 12: Gamification Phase A (levels, avatars, profile, composite score)
- **Data model V3**: `UserProfile` (displayName, avatar, createdAt), `LevelProgress` (level, compositeScore, totalStudyDays, totalCorrectQuiz, totalQuizAttempts, totalWordsStudied), `AvatarId` union type (18 avatars)
- **V2→V3 migration** in `store.ts`: backfills `levelProgress` from existing quiz data (`rootProgress.quizAccuracy`) and XP. Computes initial level from `xp.total`. Backs up before migration. Remaps old emoji avatar IDs to "robot" default.
- **Level system** (`levels.ts`): XP curve `50 * level²` (Level 2 = 200 XP, Level 10 = 5000 XP, Level 20 = 20000 XP). Capped at level 20. Numeric display only (`Lv.N`), no Chinese titles.
- **Composite score**: `accuracy × 0.5 + consistency × 0.3 + volume × 0.2` (0-100 scale). Accuracy = quiz %, consistency = streak/30, volume = wordsStudied/200.
- **Avatar constants** (`avatars.ts`): 18 ASCII art avatars (duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, robot, cactus, rabbit, mushroom, bear, alien). Each has multi-line `art` (3 lines), Chinese `label`, and compact `inline` for headers.
- **Profile setup** (`profile-setup.tsx`): Two-step first-launch flow (name input → avatar picker). Esc defaults to "学生"/duck. No external dependency (built name input with raw `useInput`).
- **Profile setup gate** in `app.tsx`: `"pick" → UpdatePrompt? → ProfileSetup? → SubjectPicker`
- **Level-up detection** in `useSessionFlow.ts`: tracks quiz attempts/correct in `levelProgress`, calls `checkLevelUp()` at end of batch, exposes `levelUp` state.
- **UI updates**: Dashboard shows full 3-line ASCII art avatar + name + level badge with progress bar. Subject picker shows full 3-line ASCII art avatar + name + `Lv.N` in header. Session summary shows level-up notification (`Lv.N → Lv.N`). Streak header shows `Lv.N`. Profile view shows full multi-line ASCII art. All three views use the same horizontal layout: art left, name/level right-aligned to bottom.
- **`alvy profile` command**: Shows profile card with full ASCII art, name, level, composite score, stats.
- **Tests**: 10 new level tests + 4 new store migration tests (including old avatar ID remap). Total: 75 tests passing.
- **Phase B planned**: Email login via Supabase OTP, cloud data sync. Not yet implemented.

### Gotchas / bugs caught during implementation

1. **React state batching on phase transitions**: After the last quiz question, `advanceAfterFeedback()` originally set `quizQuestion = null` then called `finishRoot()`. React could render with `phase="quiz"` but `quizQuestion=null`, causing "Cannot read properties of null". Fix: don't null out `quizQuestion` — let it stay until phase changes away from quiz phases.

2. **Quiz direction was initially wrong**: Original design doc said "Chinese meaning prominently, English choices". User corrected: English word is the question (you see the word, recall the meaning), Chinese meanings are the choices. This is standard vocabulary testing.

3. **`selectNextMorphemes` picked mastered short concepts over partially-studied longer ones** (fixed 2026-04-09): The old "all seen" branch sorted by absolute `wordsStudied` ascending. For TOEFL (5 words per root, uniform) this was fine, but for CSP (1–6 terms per concept, uneven) a 1/1-mastered `Collaboration` always beat a 4/6-partial `The Internet`. Fix: three-tier selection in `progress.ts`. Tier 1 unseen (unchanged), Tier 2 seen-but-not-mastered sorted by **completion ratio** (`wordsStudied / words.length`) with lastStudied tie-break, Tier 3 all-mastered falls through to pure lastStudied review mode. Mastered concepts are filtered out of Tier 2 entirely. Added 3 regression tests. **Obsoleted by gotcha #4 (mastered removal).**

4. **"Mastered" concept removed entirely** (2026-04-09, v1.6.5): After the tier-ratio fix above, the fundamental premise of "mastery" was still wrong for uneven-length concepts and created a forced "全部词根学习完成" celebration page that users didn't want. Removed: `masteredCount()`, `seenCount()`, the `celebration` phase, dashboard's progress row, streak-header's 📚 column, subject-picker's mastered counter, `generateStatsSummary`'s 已掌握/已学习 lines, and `celebration.tsx` itself. Renamed `checkCelebration → showContinuePrompt` in `useSessionFlow`. `selectNextMorphemes` collapsed to a single-tier `lastStudied`-only sort. Users can now study indefinitely — rotation runs forever. `RootProgress.seen`/`wordsStudied` are kept (internal-only) because `needsReview`/`selectReviewMorphemes` still read them for the review mode.

5. **Stale-closure bug in `advanceWord → finishRoot`** (fixed 2026-04-09, v1.6.5): In `useSessionFlow.ts`, `advanceWord` cloned `data`, called `markWordStudied(newData, ...)` (writing a fresh ISO `lastStudied`), then synchronously called `finishRoot()` from the same render's closure. `finishRoot` cloned `data` *again* from its own stale closure, overwriting the just-written `lastStudied`. Disk state persisted the old timestamp → all concepts stayed at the same day-precision seed → `localeCompare`'s stable sort returned the first N concepts in JSON order forever. **Symptom:** in a CSP session users would never reach "The Internet" (#14) and beyond — they'd cycle through the first 3 concepts on every batch. **Fix:** `finishRoot` now accepts an optional `draft?: UserData` parameter; `advanceWord` threads its `newData` through. `advanceAfterFeedback` passes a fresh `{ ...data }` for calling-convention consistency (its quiz path is async, so it wasn't technically affected). Added a `selectNextMorphemes rotation` regression test that simulates 4 batches of 3 picks across 10 concepts and asserts all 10 get seen. Also fixed a stale assertion in `markWordStudied` test that expected day-only `YYYY-MM-DD` (it's now full ISO).

6. **Auto-relaunch broke arrow keys after update** (fixed 2026-04-09, v1.6.9): The original `relaunchAlvy()` after a successful `npm install -g` did `spawn("alvy", [], { detached: true, shell: true, stdio: "inherit" })` then `process.exit(0)`. The new alvy process inherited the parent's TTY in a half-initialized raw-mode state — Ink's `useInput` couldn't read key codes, so arrow keys and Esc were dead in the new launch screen. **Fix:** removed `relaunchAlvy()` entirely; on success the prompt now says "更新成功！请重新运行 alvy" and exits cleanly so the user manually re-runs `alvy` (fresh stdin). Also rewrote `runUpdate()` from blocking `execSync` to async `spawn` with a cancellable `ChildProcess` handle, 60s SIGTERM/5s SIGKILL watchdog, line-buffered stdout, stderr ring buffer for error reporting, and a `done` guard so `onDone` fires exactly once across error/close/timeout events. The update prompt is now opt-in: subject picker shows "📦 按 u 更新" hint instead of blocking the entire launch flow. Added 11 vitest tests covering exit/error/cancel/timeout/buffering paths. 81 tests pass.

## V2 Plan Overview

**Source of truth:** `~/.gstack/projects/derekhut-alvy/ceo-plans/2026-04-02-alvy-v2-full-overhaul.md`

16 features across 4 phases. CEO review mode: SELECTIVE EXPANSION (9 proposals, 9 accepted, 0 deferred). All three reviews cleared.

### Target State
60 roots (300 words) at launch, growing to 200+ via content pipeline. Quiz system with accuracy tracking. Continue-or-quit session flow. q-key exit everywhere. Shareable progress cards. Streak freeze. Content importer. Custom daily goals. Speed round. Root family tree. Animated progress. Sound effects (opt-in). Word of the Day. Welcome ceremony.

## V3 Data Model

### UserData (V3) — IMPLEMENTED
```typescript
UserData {
  version: 3                        // V1→V2→V3 migration chain
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
    quizAccuracy?: {                // quiz performance per root ✅
      correct: number
      total: number
    }
  }>
  wordsStudied: string[]            // cleaned to string[] only
  settings?: {                      // user preferences
    sound: boolean                  // default: false
    dailyGoal: number               // persisted custom goal
    lastSubject?: Subject           // remember-last subject for picker ✅
  }
  profile?: {                       // V3: student profile (set on first launch)
    displayName: string             // max 8 chars
    avatar: AvatarId                // 18 ASCII art options: duck/goose/blob/cat/dragon/octopus/owl/penguin/turtle/snail/ghost/axolotl/robot/cactus/rabbit/mushroom/bear/alien
    createdAt: string               // ISO date
  }
  levelProgress: {                  // V3: level system
    level: number                   // 1-20, computed from XP
    compositeScore: number          // 0-100, blended metric
    totalStudyDays: number
    totalCorrectQuiz: number        // aggregated from all quizzes
    totalQuizAttempts: number
    totalWordsStudied: number
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

### V1 → V2 → V3 Migration — IMPLEMENTED
Field-level backfill inside `loadData()` in store.ts. Backs up data.json before migration write. V2→V3 backfills `levelProgress` from existing `rootProgress.quizAccuracy` and `xp.total`. Computes initial level from XP. No separate migration step.

## V2 State Machine — IMPLEMENTED

```
V1:  dashboard → root-intro → word-detail(x5) → summary

V2:  dashboard → root-intro → word-detail(x5) → quiz-intro → quiz(x5) → continue-prompt
                                                                            │
                                                              [→] → next batch (bonus XP +5/word) ✅
                                                              [Esc] → summary → exit ✅

     Back nav (←): word-detail → prev word → root-intro → prev root's last word → dashboard
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
- Bonus: +5 XP per word if studying beyond dailyGoal (continue mode, sessionBatch > 0) ✅
- Quiz: +15 XP per correct answer (**visible** feedback, cyan flash) ✅
- XP summary shown at session end, not during learn-by-reading ✅
- `sessionBatch` counter tracks which batch the student is on (batch > 0 = bonus mode) ✅

## Test Status

| File | Tests | Coverage |
|------|-------|----------|
| `progress.test.ts` | 41 cases | All 9 functions after "mastered" removal: updateStreak, addXP, markRootSeen, markWordStudied (full ISO timestamp), selectNextMorphemes (incl. rotation regression covering 10 concepts × 4 batches), generateStatsSummary, recordQuizResult, needsReview, selectReviewMorphemes |
| `store.test.ts` | 9 cases | Path migration, V1→V3 backfill, V2→V3 migration, V3 no re-migration, XP→level computation, old avatar ID remap, corrupt data, fresh start |
| `levels.test.ts` | 20 cases | xpForLevel boundaries, computeLevel edges, xpToNextLevel progress, compositeScore blending, checkLevelUp detection |
| `update-check.test.ts` | 11 cases | runUpdate spawn lifecycle, cancel, watchdog SIGTERM→SIGKILL, line buffering, single-fire onDone; checkForUpdate happy path + failure modes |
| `subject-db.test.ts` | 4 cases | createSubjectDB factory: getAll round-trip, getRelatedMeanings filter, distractor never-same, "未知" fallback |
| `subjects.test.ts` | 7 cases | SUBJECT_LIST length=6 in display order, id/key match, db.getCount > 0, cliToken uniqueness, command uniqueness, AP/TOEFL reviewMeaningSummary divergence, SUBJECT_TO_SESSION_COMMAND completeness |
| **Total** | **92 pass** | |

Tests NOT yet written (from test plan):
- Quiz distractor edge cases
- Continue session mid-batch transition (component-level, needs Ink test renderer)
- Custom goal validation (CLI flag parsing, needs integration test)
- Bonus XP (sessionBatch) (component-level)
- Hook-level stale-closure regression for `advanceWord → finishRoot` (covered at pure-function level by `selectNextMorphemes rotation`, but a hook-level test would need `ink-testing-library`)

## Implementation Sequence

```
Phase 1 (Foundation + Quiz):
  0. ✅ Write progress.test.ts (full test suite, BEFORE any V2 code)
  1. ✅ Data model changes (types.ts, store.ts migration, version field)
  2. ✅ Extract useSessionFlow() hook (DRY daily-session + review-session)
  3. ✅ Readability fix (dim → white for content text, update DESIGN.md)
  4. ✅ q-key exit everywhere (already handled via useSessionFlow hook)
  5. ✅ Quiz system (quiz-intro → quiz(x5), binary choice, per-root)
  6. ✅ Quiz accuracy tracking in progress.ts
  7. ✅ Continue-after-session flow (continue-prompt, bonus XP, sessionBatch)
  8. ✅ Custom daily goal (--goal N flag, 1-10, persisted)

  9. ✅ Subject picker at launch (arrow-key menu, remember-last, "pick" command)

  10. ✅ Arrow-key navigation (← → replaces Enter, Esc replaces q, goBack() action)
  11. ✅ Auto-update checker (npm registry check, update prompt before subject picker)

  12. ✅ Gamification Phase A (levels, avatars, profile, composite score, level-up, `alvy profile`)

Phase 2 (Content):
  13. Richer word format (phonetic, mnemonic fields in types + word-detail)
  14. Content importer tool (fail-fast validation, all-or-nothing merge)
  15. Expand to 60 roots using importer

Phase 3 (Engagement):
  13. Speed round mode (immediate timer feedback on same screen)
  14. Streak freeze
  15. Shareable progress card
  16. Word of the Day (simple random for V2.0)
  17. Animated progress bar (300ms fill)
  18. Sound effects (opt-in, quiz-only)

Phase 4 (Polish):
  19. Installation ceremony (instant render, ASCII art + tagline)
  20. Upgrade welcome (dashboard banner, not separate screen)
  21. Root family tree
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
    index.tsx              # Entry point, CLI routing, default → "pick", --goal N
    app.tsx                # Routes command: "pick" → UpdatePrompt? → SubjectPicker → resolved command
    components/
      update-prompt.tsx    # ✅ NEW: update available prompt (立即更新/跳过)
      profile-setup.tsx    # ✅ NEW: first-launch profile (name + avatar picker)
      avatar-picker.tsx    # ✅ NEW: 3×6 grid arrow-key ASCII art avatar selector (18 avatars)
      subject-picker.tsx   # ✅ Arrow-key subject menu (TOEFL/AP Psych/AP CSP, remember-last)
      profile-view.tsx     # ✅ NEW: `alvy profile` — avatar, level, composite score, stats
      daily-session.tsx    # ✅ Thin wrapper → useSessionFlow()
      review-session.tsx   # ✅ Thin wrapper → useSessionFlow() (filtered selection)
      quiz-intro.tsx       # ✅ NEW: transition screen before quiz
      quiz.tsx             # ✅ NEW: English word → two Chinese choices
      continue-prompt.tsx  # ✅ NEW: continue-or-quit after daily goal
      welcome.tsx          # Phase 4: first-run ASCII welcome ceremony
      update-prompt.tsx     # ✅ NEW: update available prompt (立即更新/跳过)
      speed-round.tsx      # Phase 3: timed quiz from all studied words
      share.tsx            # Phase 3: plain text progress card to stdout
      import.tsx           # Phase 2: JSON content importer (fail-fast)
      tree.tsx             # Phase 4: root family tree ASCII diagram
      config.tsx           # Step 8: persistent settings (goal, sound)
      dashboard.tsx        # Avatar + level + streak + continue CTA (no mastered row after v1.6.5)
      root-lesson.tsx      # ✅ Root intro card (content text white)
      word-detail.tsx      # ✅ Single word display (content text white)
      session-summary.tsx  # XP earned, streak, words studied
      # celebration.tsx removed in v1.6.5 (no more "全部词根学习完成" page)
      streak-header.tsx    # Streak counter + daily progress bar
      stats.tsx            # Export markdown progress summary
      doctor.tsx           # Environment checks
      explore.tsx          # Placeholder (AI explore, deferred)
    hooks/
      useSessionFlow.ts    # ✅ Shared session state machine
    lib/
      __tests__/
        store.test.ts      # ✅ 9 tests (migration + V2→V3 backfill)
        progress.test.ts   # ✅ 29 tests (all business logic)
        levels.test.ts     # ✅ 15 tests (level system + composite score)
      roots-db.ts          # Query functions over roots.json
      store.ts             # ✅ JSON persistence, V1→V2→V3 migration, backup
      progress.ts          # ✅ Business logic (Set branch cleaned)
      levels.ts            # ✅ NEW: level system, composite score, level-up detection (no level names)
      avatars.ts           # ✅ NEW: 18 ASCII art avatar constants (art + label + inline)
      types.ts             # ✅ TypeScript interfaces (V3 fields)
      update-check.ts      # ✅ NEW: npm registry version check + runUpdate()
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
| 1 | Quiz-quit data gap | Fix review selection: `!quizAccuracy \|\| (correct/total < 0.8) \|\| wordsStudied < 5` | ✅ Done |
| 2 | V2 migration strategy | Field-level backfill in `loadData()`, backup before write | ✅ Done |
| 3 | Bonus XP tracking | Add `sessionBatch` counter, batch > 0 = bonus mode | ✅ Done |
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
npm test               # Run tests (Vitest, 78 passing)
node dist/index.js     # Subject picker → daily session
node dist/index.js review   # Review weak roots
node dist/index.js profile  # View profile (avatar, level, composite score)
node dist/index.js stats    # Export progress
node dist/index.js doctor   # Environment check
```

## AP Subject Expansion (CEO Review 2026-04-08)

**Status:** CEO review complete. 1 open decision (pedagogical model). Blocked on that decision before implementation.

**Source of truth:** `~/.gstack/projects/derekhut-alvy/2026-0408-main-design-ap-subjects.md`

### What was decided

| # | Decision | Choice |
|---|----------|--------|
| 1 | First AP subject | AP Psychology (memorization-heavy, maps to walkthrough+quiz) |
| 2 | Implementation approach | A: Generalize `useSessionFlow` to be content-agnostic |
| 3 | Review mode | HOLD SCOPE (no expansions) |
| 4 | CLI interface | Just `alvy` with subject picker at launch |
| 5 | Subject picker friction | Remember last-used subject, auto-select on repeat visits |
| 6 | Streak model | Shared across subjects (study any subject, streak continues) |
| 7 | `alvy review` | Keep for TOEFL vocab, don't build for AP Psych |
| 8 | Stats output | Combined (both subjects in `alvy stats`) |
| 9 | `wordsStudied` collision | Prefix with subject namespace: `vocab:benefit`, `psych:adaptation` |
| 10 | dailyGoal | No changes for now |

### What's been built

- Subject picker at launch (step 9) — `alvy` shows arrow-key menu, remembers last choice
- AP Psychology session and review (`alvy psych`, `alvy psych review`) — reuses same state machine
- `psych.json` content file (36 concepts / 607 terms, full CED coverage), `psych-db.ts` query layer
- AP CSP session and review (`alvy csp`, `alvy csp review`) — same pattern as AP Psych
- `csp.json` content file (20 concepts / 72 terms), `csp-db.ts` query layer
- AP World History session and review (`alvy whap`, `alvy whap review`) — same pattern as AP CSP
- `whap.json` content file (19 concepts / 255 terms, COMPLETE), `whap-db.ts` query layer
- AP Microeconomics session and review (`alvy micro`, `alvy micro review`)
- `micro.json` content file (36 concepts / 499 terms, COMPLETE), `micro-db.ts` query layer
- AP Macroeconomics session and review (`alvy macro`, `alvy macro review`) — wired via the SubjectRegistry (no per-subject component or db file)
- `macro.json` content file (42 concepts / 492 terms, COMPLETE)
- `Subject` type (`"toefl" | "psych" | "csp" | "whap" | "micro" | "macro"`), `"pick"` command, `lastSubject` in settings
- **SubjectRegistry refactor** (v1.7.0 LOCAL): every subject now lives as one row in `src/lib/subjects.ts`. The 5 per-subject db files and 10 per-subject session/review components were collapsed into one `createSubjectDB()` factory + one `<SubjectSession>` and one `<SubjectReview>` component. The CLI parser, picker, app router, and stats loop all read from `SUBJECT_LIST`.
- **CEO-review follow-ups** (after the 9-commit refactor): three small commits on `update_version` tightened the registry's "single source of truth" claim. (1) The inline CLI parser was extracted to `src/lib/cli-parse.ts` as a pure `resolveCommand(input1, input2)` function with 9 unit tests covering every branch including the `cliToken: ""` TOEFL short-circuit. (2) The `Subject` type is now derived from `SUBJECT_IDS as const` in `subjects.ts` (type-only import, no runtime cycle); `Command` is derived from `Subject` via template literal types. The dead `SUBJECT_TO_SESSION_COMMAND` map was deleted — its one production caller now reads `SUBJECTS[subject].sessionCommand` directly. (3) `generateStatsSummary`'s `"词根学习"`/`"单词"` default args were removed (the only real caller in `stats.tsx` always passes them from the registry). Net: adding a new AP subject is now a **2-file change** (`src/data/<sub>.json` + one row in `subjects.ts`, including its id in `SUBJECT_IDS`). Tests: 92 → **102**.

### Quiz mode (刷题模式) — v1.7.1

- **Mode picker** after subject selection: 刷卡片 (existing session flow) or 刷题 (standalone quiz)
- **Quiz flow**: 20 random two-choice questions from all words in the subject, +15 XP per correct answer, streak + level-up at end
- **Quiz summary**: shows correct/total (green ≥80%, red <80%), XP earned, streak, level-up. Arrow-key selection list at bottom: 再刷一轮 (restart with new questions) / 回到主界面 (back to subject picker). Test commands rendered inline in `app.tsx` (not via `COMMAND_RENDERERS`) so `onBack` can reset `resolved` state.
- **CLI**: `alvy test` (TOEFL), `alvy psych test`, `alvy csp test`, etc.
- **Design change**: quiz feedback colors changed from cyan/dusty-rose to green `#00D26A` / red `#FF4444`
- **New files**: `src/hooks/useQuizFlow.ts`, `src/components/quiz-summary.tsx`, `src/components/subject-test.tsx`, `src/components/mode-picker.tsx`
- **Modified**: `types.ts` (QuizQuestion extracted, Command extended with test commands), `subjects.ts` (testCommand field), `cli-parse.ts` (test command matching), `quiz.tsx` (new colors), `app.tsx` (mode picker flow + test command routing), `index.tsx` (help text), `DESIGN.md` (color update + decision log)
- **Tests**: `cli-parse.test.ts` expanded (9→12 cases), new `quiz-flow.test.ts` (4 cases)

### What's still open

**Pedagogical model refinement for AP Psych.** Current implementation reuses the same walkthrough pattern (concept intro → term detail → quiz). The derivation-chain walkthrough is what makes TOEFL vocab mode special. AP Psych may benefit from a different pedagogical approach:

- Option A: Concept intro (name, explanation, researcher, real-world example) → term detail cards → quiz (current)
- Option B: Something more tailored to psychology concepts

Derek can iterate on this based on student feedback.

### Architecture (Approach A: Generalize)

The CEO review initially chose Approach B (parallel track, copy session code). An outside voice challenged this: `useSessionFlow.ts` is 300 lines hardwired to `RootEntry`/`RootWord` types. Copying it means maintaining two near-identical state machines. Derek switched to Approach A: generalize the hook to be content-agnostic, then add AP Psych as a second content type.

Key refactoring needed:
- `useSessionFlow.ts`: make generic over content type (not hardwired to `RootEntry`)
- `roots-db.ts`: the hook currently imports this singleton directly. Needs content injection instead.
- `types.ts`: add `conceptProgress` to `UserData`, add `activeSubject` field
- `store.ts`: V2→V3 migration (default `conceptProgress: {}`, `activeSubject: "vocab"`)
- `store.ts`: update `PersistedData` interface and `saveData()` field list

Files built (post SubjectRegistry refactor):
- `src/data/psych.json` (36 concepts / 607 terms, full CED coverage)
- `src/data/csp.json` (35 concepts / 385 terms, full CED coverage of Big Ideas 1-5)
- `src/data/whap.json` (19 concepts / 255 terms, COMPLETE)
- `src/data/micro.json` (36 concepts / 499 terms, full CED coverage of Units 1-6)
- `src/data/macro.json` (42 concepts / 492 terms, full CED coverage of Units 1-6)
- `src/components/subject-picker.tsx` (arrow-key menu, remember-last, reads `SUBJECT_LIST`)
- `src/components/subject-session.tsx` (generic daily session, parameterized by `{ subject: Subject }`)
- `src/components/subject-review.tsx` (generic review session)
- `src/lib/subjects.ts` (SubjectRegistry — 6 SubjectConfig rows + SUBJECT_LIST + SUBJECT_TO_SESSION_COMMAND)
- `src/lib/subject-db.ts` (`createSubjectDB(data)` factory exposing getAll/getCount/getByKey/getRelatedMeanings/getDistractorMeaning)

Files deleted in the SubjectRegistry refactor (15 total):
- 10 per-subject components: `daily-session.tsx`, `review-session.tsx`, `psych-session.tsx`, `psych-review.tsx`, `csp-session.tsx`, `csp-review.tsx`, `whap-session.tsx`, `whap-review.tsx`, `micro-session.tsx`, `micro-review.tsx`
- 5 per-subject db files: `roots-db.ts`, `psych-db.ts`, `csp-db.ts`, `whap-db.ts`, `micro-db.ts`

Files still needed:
- `src/components/concept-intro.tsx` (like `root-lesson.tsx` for concepts, if pedagogical model changes)
- `src/components/term-detail.tsx` (like `word-detail.tsx` for terms, if pedagogical model changes)

### Content structure (AP Psych)

```
Unit (9 College Board units)
  └── Concept (~7-8 per unit, ~70 total)
        └── Term (~4-5 per concept, ~300+ total)
```

Derek has the content. AI can help format it into the JSON schema.

### Outside voice findings (2026-04-08, Claude subagent)

11 issues found, 5 presented as cross-model tensions:
1. **Hook duplication** → resolved: switched to Approach A (generalize)
2. **wordsStudied collision** → resolved: prefix with subject namespace
3. **Subject picker friction** → resolved: remember last subject
4. **dailyGoal semantics** → deferred: no changes for now
5. **Pedagogical model** → open: Derek thinking about it

Other findings noted but not blocking:
- Quiz distractor quality may differ for AP Psych (definitions vary in length/structure)
- Content authoring is the real bottleneck (Derek has content, so mitigated)
- V2→V3 migration needed in store.ts — ✅ Done (gamification Phase A)
- Removing `alvy review` should NOT delete existing TOEFL review code

## What Was Explicitly Deferred (V2)

| Item | Why |
|------|-----|
| Standalone binaries (Bun compile) | Ink + yoga native bindings risk |
| Web app version | CLI is right for AI Camp coding students |
| Spaced repetition (FSRS) | V3, per TODOS.md. Needs V2 quiz data first. |
| AI explore mode | Needs API key |
| CI/CD for npm publish | Manual publish fine for solo dev |
| Homebrew/Scoop formula | Overkill for current audience |
