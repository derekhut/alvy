# Architecture — alvy

## Summary

alvy is an interactive CLI study tool built with **Ink** (React for terminal) + **TypeScript**. It teaches through walkthrough-then-quiz sessions: students walk through learning material, then get quizzed for active recall. Supports six live subjects (TOEFL word roots, AP Psychology, AP Computer Science Principles, AP World History, AP Microeconomics, AP Macroeconomics) — all driven from a single `SubjectRegistry` (`src/lib/subjects.ts`) and rendered by a single pair of generic `SubjectSession` / `SubjectReview` components. Progress is persisted as JSON at `~/.alvy/data.json`.

## Multi-Subject Support

alvy supports multiple subjects. `alvy` (no args) shows a subject picker with arrow-key navigation. Direct commands still work: `alvy psych`, `alvy review`, etc.

- **Subject picker at launch** with remember-last (`settings.lastSubject` persisted)
- **Shared streak and XP** across all subjects (study any subject, streak continues)
- **SubjectRegistry**: every subject is one row in `src/lib/subjects.ts`. The CLI parser, picker, app dispatch, and stats all read from `SUBJECT_LIST` — adding a new subject is a **2-file change** (`src/data/<sub>.json` + one row in `subjects.ts`, including its id in `SUBJECT_IDS`). The `Subject` and `Command` type unions in `types.ts` derive from `SUBJECT_IDS` automatically.
- **Current subjects:**
  - TOEFL word roots — 30 roots × 5 words = 150 vocabulary items
  - AP Psychology — 36 concepts / 607 terms (full CED, Units 1-5)
  - AP CSP — 35 concepts / 385 terms (full CED, all 5 Big Ideas)
  - AP World History — 19 concepts / 255 terms
  - AP Microeconomics — 36 concepts / 499 terms (full CED, Units 1-6)
  - AP Macroeconomics — 42 concepts / 492 terms (full CED, Units 1-6)
- **Generic session components**: one `<SubjectSession>` and one `<SubjectReview>` (both take `{ subject: Subject }`) replace the 10 per-subject components that existed before the v1.7.0 refactor. Both render the same shared phase machinery via `useSessionFlow`, parameterized by knobs from the registry (`dashboardTitle`, `unitNoun`, `wordNoun`, `rootLessonLabels`, `hideFrequency`, `wordDetailDerivationLabel`, `quizTitle`, `reviewMeaningSummary`).
- **`createSubjectDB(data)` factory** (`src/lib/subject-db.ts`): one function replaces the 5 per-subject db files. Exposes `getAll`, `getCount`, `getByKey`, `getRelatedMeanings`, `getDistractorMeaning`.
- **Planned:** Namespaced `wordsStudied` array (`vocab:benefit`, `psych:adaptation`) to prevent collisions

See `handoff.md` "AP Subject Expansion" section for full decision log.

## Component Dependency Tree

```
index.tsx          CLI entry point (meow parses args; delegates to resolveCommand from src/lib/cli-parse.ts — pure function with 9 unit tests)
  └─ app.tsx       Command router (COMMAND_RENDERERS map sourced from SUBJECT_LIST: "pick" → ProfileSetup? → SubjectPicker, with opt-in UpdatePrompt overlay)
       ├─ update-prompt.tsx     Update prompt — opt-in (user presses `u` from picker). Async spawn() update with cancel + watchdog. No auto-relaunch (v1.6.9): user re-runs `alvy` manually after success.
       ├─ profile-setup.tsx     First-launch profile setup (name input + avatar picker)
       │    └─ avatar-picker.tsx    3×6 grid arrow-key ASCII art avatar selector (18 avatars)
       ├─ subject-picker.tsx    Arrow-key subject menu (reads SUBJECT_LIST, remember-last)
       ├─ profile-view.tsx      `alvy profile` — avatar, level, composite score, stats
       ├─ subject-session.tsx   Generic learning flow ({ subject: Subject } prop). Looks up SUBJECTS[subject] and parameterizes the shared phase machinery. Replaces all 5 per-subject *-session.tsx files.
       │    ├─ dashboard.tsx        Launch screen (avatar + level + streak + XP, takes title prop)
       │    ├─ streak-header.tsx    Reusable progress bar
       │    ├─ root-lesson.tsx      Root intro card (meaning, origin, related roots; takes optional labels)
       │    ├─ word-detail.tsx      Single word/term (takes optional derivationLabel + hideFrequency)
       │    ├─ quiz-intro.tsx       Transition screen before quiz (takes optional title)
       │    ├─ quiz.tsx             Binary-choice quiz
       │    ├─ continue-prompt.tsx  Continue-or-quit after daily goal
       │    └─ session-summary.tsx  End-of-session stats
       │    # celebration.tsx deleted in v1.6.5 (mastered concept removed)
       ├─ subject-review.tsx    Generic review session ({ subject: Subject }). Replaces all 5 per-subject *-review.tsx files. Empty-state and intro card text pulled from registry.
       ├─ stats.tsx             Export markdown progress summary (loops over SUBJECT_LIST)
       └─ doctor.tsx            Environment health checks
```

## Data Flow

```
roots.json + psych.json + csp.json + whap.json + micro.json + macro.json
   │
   └─(import at startup)─> subjects.ts (SUBJECT_LIST + SUBJECTS map)
                                │
                                └─ each entry calls createSubjectDB(data) → SubjectDB
                                   (getAll/getCount/getByKey/getRelatedMeanings/getDistractorMeaning)

~/.alvy/data.json ──(loadData)──> store.ts ──> UserData (in-memory)
                                                    │
                                   progress.ts mutates UserData
                                   (markRootSeen, markWordStudied,
                                    addXP, updateStreak)
                                                    │
                                   store.ts ──(saveData)──> data.json
                                   (atomic write via tmp + rename)
```

- **subjects.ts** is the single source of truth for every subject. Each row holds identity (`id`, `pickerLabel`, `dashboardTitle`), vocabulary (`unitNoun`, `wordNoun`), component knobs (`rootLessonLabels`, `quizTitle`, `hideFrequency`, `wordDetailDerivationLabel`), CLI tokens (`cliToken`, `sessionCommand`, `reviewCommand`), a `reviewMeaningSummary` callback, and a `db: SubjectDB` instance. The 6 JSON files are read once at import time.
- **subject-db.ts** is the factory that turns each subject's JSON array into a `SubjectDB`. Pure read-only.
- **store.ts** reads/writes `~/.alvy/data.json`. Creates dir + file on first run. Auto-migrates from `~/.toefl-roots/data.json` if present. V1→V2→V3 migration chain. Backs up corrupt files to `data.backup.json`. Exports `DATA_DIR` and `DATA_FILE` for use by other modules (e.g., doctor.tsx).
- **progress.ts** contains all business logic. Operates on the in-memory `UserData` object. Never touches the filesystem directly.
- **levels.ts** contains level system logic: XP curve, level computation, composite score, level-up detection. Pure functions. No level names — numeric `Lv.N` only.
- **avatars.ts** contains 18 ASCII art avatar constants. Each has `art` (3-line string array), `label` (Chinese name), and `inline` (compact single-line, legacy). Dashboard, subject picker, and profile view all display the full 3-line `art`.

## Session State Machine

```
┌───────────┐
│ dashboard │──(→)──┐
└───────────┘       │
      ▲             ▼
      │   ┌────────────────┐
      │┌─>│  root-intro    │──(→)──┐
      ││  │  (Root N/M)    │       │
  (←) ││  └────────────────┘       │
      ││          ▲                ▼
      ││      (←) │      ┌──────────────────┐
      │└──────────┤      │  word-detail      │──(→)──┐
      └───────────┘      │  (Word N/5)       │       │
                         └──────────────────┘       │
                                  ▲ │                │
                              (←) │ └──(more words)─┘
                                  │          │
                                  │   (root complete)
                                  │          │
                  (more roots)───────────────┤
                                             │
                                      (session complete)
                                             │
                                ┌────────────┼───────────────┐
                                ▼                             ▼
                       ┌──────────────┐          ┌────────────────────┐
                       │   summary    │          │  continue-prompt   │
                       │  (XP, streak)│          │ (next batch or q?) │
                       └──────────────┘          └────────────────────┘
```

Phase type: `"dashboard" | "intro" | "root-intro" | "word-detail" | "quiz-intro" | "quiz" | "quiz-feedback" | "continue-prompt" | "summary" | "empty"` (celebration phase removed in v1.6.5)

Navigation: **→** advances forward, **←** goes back (word→word, word→root-intro, root-intro→prev root, root-intro→dashboard), **Esc** quits and saves. Quiz uses **1**/**2** keys. Each daily session presents 3 roots (configurable via `dailyGoal`). Each root has 5 words.

## Key Design Decisions

| Decision | Detail |
|----------|--------|
| No quiz/drill | Learning IS the derivation chain walkthrough. No multiple choice, no right/wrong. |
| No mastery concept (v1.6.5+) | Mastery counter removed entirely. Users rotate through concepts indefinitely by oldest `lastStudied`. Review mode still uses internal `wordsStudied`/`quizAccuracy` to select weak roots. |
| XP = +10 per word, unconditional | Every word studied earns 10 XP. No penalty, no bonus. `addXP(data, 10)` per word. |
| Sequential root discovery | Unseen roots are served in `roots.json` order. After all seen, pick least-studied. |
| Atomic writes | `saveData()` writes to `.tmp` then `rename()`. Prevents corruption on crash. |
| Chinese UI | All interface text is Chinese per DESIGN.md. English only for vocabulary content. |
| Never bold CJK | Chinese text is dimmed, never bold — preserves stroke clarity. |
| Batch saves | Data saved at session end + SIGINT handler. Not after every word. |
| Data migration | Auto-migrates from `~/.toefl-roots/` on first run. Silent copy, no user notice. |

## File-by-File Reference

| File | Purpose |
|------|---------|
| `src/index.tsx` | CLI entry point. Parses commands with `meow`, defaults to `"pick"`, renders `<App>`. `validCommands` and the compound parser fold over `SUBJECT_LIST`. |
| `src/app.tsx` | Routes command to the correct top-level component via a `COMMAND_RENDERERS` map sourced from `SUBJECT_LIST`. `"pick"` → SubjectPicker → resolved command. Update check runs in background; SubjectPicker shows "📦 按 u 更新" hint if a new version is available, opening UpdatePrompt on demand. |
| `src/components/subject-picker.tsx` | Arrow-key subject menu. Reads `SUBJECT_LIST`, shows full ASCII art avatar + name/level, remembers last choice. |
| `src/components/subject-session.tsx` | Generic learning flow ({ subject: Subject }). Looks up `SUBJECTS[subject]` and parameterizes the shared phase machinery via `useSessionFlow`. Replaces all 5 per-subject `*-session.tsx` files. |
| `src/components/subject-review.tsx` | Generic review session ({ subject: Subject }). Replaces all 5 per-subject `*-review.tsx` files. Empty-state and intro card text pulled from registry. |
| `src/components/dashboard.tsx` | Shows full ASCII art avatar + name/level, streak, XP. Takes a `title: string` prop. (Mastered count row removed in v1.6.5.) |
| `src/components/root-lesson.tsx` | Displays root/concept card. Takes optional `labels` to swap "词根"/"概念" terminology. |
| `src/components/word-detail.tsx` | Displays one word/term. Takes optional `derivationLabel` and `hideFrequency`. |
| `src/components/session-summary.tsx` | End-of-session: words studied, XP earned, streak status. |
| `src/components/streak-header.tsx` | Reusable streak counter + daily progress bar. |
| `src/components/stats.tsx` | `alvy stats` — loops over `SUBJECT_LIST` and prints one markdown summary per subject. |
| `src/components/doctor.tsx` | `alvy doctor` — checks Node.js version, npm, UTF-8 locale, disk permissions. Imports `DATA_DIR` from store.ts. |
| `src/lib/types.ts` | TypeScript interfaces: `UserData` (V3), `RootProgress`, `RootEntry`, `RootWord`, `UserProfile`, `LevelProgress`, `AvatarId`. **`Subject` is derived** from `SUBJECT_IDS` in `subjects.ts` via a type-only import; `Command` is derived from `Subject` via template literal types (`${APSubject}-review`) plus the TOEFL `"daily"`/`"review"` literals and the global commands. No hand-edits required when adding a subject. |
| `src/lib/store.ts` | Read/write `~/.alvy/data.json`. Auto-migrates from `~/.toefl-roots/`. V1→V2→V3 migration chain. Exports `DATA_DIR`, `DATA_FILE`. First-run init, corrupt-file backup, atomic writes. `lastSubject` typed as `Subject` (not an inline literal). |
| `src/lib/progress.ts` | Business logic: `addXP()`, `updateStreak()`, `markRootSeen()`, `markWordStudied()` (full ISO timestamp), `selectNextMorphemes()` (single-tier oldest-first), `recordQuizResult()`, `needsReview()`, `selectReviewMorphemes()`, `generateStatsSummary(data, title, wordNoun)` — `title` and `wordNoun` are required (no defaults; the only caller is `stats.tsx` which always passes `cfg.dashboardTitle` and `cfg.wordNoun` from the registry). `masteredCount`/`seenCount` removed in v1.6.5. |
| `src/lib/levels.ts` | Level system: `xpForLevel()`, `computeLevel()`, `xpToNextLevel()`, `computeCompositeScore()`, `checkLevelUp()`. |
| `src/lib/avatars.ts` | 18 ASCII art avatar constants (duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, robot, cactus, rabbit, mushroom, bear, alien). |
| `src/components/profile-setup.tsx` | First-launch profile setup (name input → avatar picker). |
| `src/components/avatar-picker.tsx` | 3×6 grid arrow-key ASCII art avatar selector (18 avatars). |
| `src/components/profile-view.tsx` | `alvy profile` — shows full ASCII art, name, level, composite score, stats. |
| `src/lib/subjects.ts` | **SubjectRegistry**. `SUBJECT_IDS` (the literal id list — single source of truth for the `Subject` type), `SUBJECTS: Record<Subject, SubjectConfig>` (one row per subject), and `SUBJECT_LIST` (display order). Adding a new subject is one row here (including its id in `SUBJECT_IDS`) plus one JSON file in `data/`. |
| `src/lib/subject-db.ts` | `createSubjectDB(data)` factory. Returns a `SubjectDB` with `getAll`/`getCount`/`getByKey`/`getRelatedMeanings`/`getDistractorMeaning`. Replaces 5 per-subject db files. |
| `src/lib/cli-parse.ts` | `resolveCommand(input1, input2)` — pure CLI parser. Returns `Command \| null`. Handles `pick`, bare TOEFL `review`, compound `<sub> review`, and globals (`stats`, `doctor`, `profile`). Folds over `SUBJECT_LIST` so it auto-extends to new subjects. Caller (`index.tsx`) prints usage + exits on `null`. |
| `src/lib/update-check.ts` | Version check against npm registry (2s timeout) + async `runUpdate()` via `spawn("npm install -g")`. Returns a `ChildProcess` handle for cancellation. 60s SIGTERM/5s SIGKILL watchdog, line-buffered stdout, stderr ring buffer. `onDone` fires exactly once. Covered by 11 vitest tests. |
| `src/components/update-prompt.tsx` | Opt-in update prompt: arrow-key menu (立即更新/跳过), three phases (prompt/updating/done). User can press esc/q/ctrl+c to cancel mid-update. After success, instructs user to re-run `alvy` manually (no auto-relaunch — see Gotcha #6). |
| `src/lib/__tests__/levels.test.ts` | Vitest level system tests (20 cases: xpForLevel, computeLevel, xpToNextLevel, compositeScore, checkLevelUp). |
| `src/lib/__tests__/store.test.ts` | Vitest migration tests (9 cases: migrate, already migrated, fresh start, V1→V3, V2→V3, V3 no re-migration, XP→level, old avatar ID remap, corrupt source). |
| `src/lib/__tests__/subject-db.test.ts` | Vitest factory tests (4 cases: round-trip, related-meanings filter, distractor never-same, "未知" fallback). |
| `src/lib/__tests__/subjects.test.ts` | Vitest registry tests (8 cases: list length=6 ordering, id/key match, db.getCount > 0, cliToken uniqueness, command uniqueness, AP/TOEFL reviewMeaningSummary divergence, `SUBJECT_IDS` matches `SUBJECT_LIST` ordering, every `SUBJECT_IDS` entry resolves in `SUBJECTS`). |
| `src/lib/__tests__/cli-parse.test.ts` | Vitest CLI parser tests (9 cases: bare → `pick`, bare `review` → TOEFL review, single subject token, compound `<sub> review`, 6th-subject compound, `toefl` token rejected, garbage rejected, `<sub> garbage` falls through to session, globals pass through). |
| `src/data/roots.json` | 20 roots + 10 affixes = 30 entries × 5 words = 150 words. |
| `src/data/psych.json` | AP Psychology: 36 concepts / 607 terms (full CED coverage, Units 1-5). |
| `src/data/csp.json` | AP CSP: 35 concepts / 385 terms (full CED coverage, all 5 Big Ideas). |
| `src/data/whap.json` | AP World History: 19 concepts / 255 terms. |
| `src/data/micro.json` | AP Microeconomics: 36 concepts / 499 terms (full CED coverage, Units 1-6). |
| `src/data/macro.json` | AP Macroeconomics: 42 concepts / 492 terms (full CED coverage, Units 1-6). |
| `install.sh` | One-line installer for macOS/Linux. Installs Node.js via nvm if needed, configures npm prefix, installs alvy globally. |

## What Does NOT Exist (Yet)

Planned but not yet built:

| Name | Status |
|------|--------|
| `concept-intro.tsx` | Planned for AP Psych. Like `root-lesson.tsx` for concepts. Currently `root-lesson.tsx` is reused via the registry's `rootLessonLabels` knob. |
| `term-detail.tsx` | Planned for AP Psych. Like `word-detail.tsx` for terms. Currently `word-detail.tsx` is reused via `wordDetailDerivationLabel` + `hideFrequency` knobs. |
| `mnemonicCache` | No AI mnemonics. V2 Phase 2 feature (phonetic/mnemonic fields exist in types). |
| AP Environmental Science | Source draft at `ap_environment.md` queued for next subject. Adding it via the SubjectRegistry is a **2-file change** (`src/data/env.json` + one row in `subjects.ts`). |
