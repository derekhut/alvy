# Architecture — alvy

## Summary

alvy is an interactive CLI study tool built with **Ink** (React for terminal) + **TypeScript**. It teaches through walkthrough-then-quiz sessions: students walk through learning material, then get quizzed for active recall. Supports four subjects: TOEFL word roots, AP Psychology, AP Computer Science Principles, and AP World History. Progress is persisted as JSON at `~/.alvy/data.json`.

## Multi-Subject Support

alvy supports multiple subjects. `alvy` (no args) shows a subject picker with arrow-key navigation. Direct commands still work: `alvy psych`, `alvy review`, etc.

- **Subject picker at launch** with remember-last (`settings.lastSubject` persisted)
- **Shared streak and XP** across all subjects (study any subject, streak continues)
- **Current subjects:** TOEFL word roots (30 roots × 5 words), AP Psychology (26 concepts / 130 terms), AP CSP (20 concepts / 72 terms), AP World History (batches 1-2: 10 concepts / 127 terms)
- **Generalized `useSessionFlow`** hook (Approach A: refactor to be content-agnostic, not parallel duplication)
- **Planned:** Namespaced `wordsStudied` array (`vocab:benefit`, `psych:adaptation`) to prevent collisions

See `handoff.md` "AP Subject Expansion" section for full decision log.

## Component Dependency Tree

```
index.tsx          CLI entry point (meow parses args, default → "pick")
  └─ app.tsx       Command router (state-based: "pick" → UpdatePrompt? → ProfileSetup? → SubjectPicker, then resolved command)
       ├─ update-prompt.tsx     Update available prompt (checks npm registry, skip or update)
       ├─ profile-setup.tsx     First-launch profile setup (name input + avatar picker)
       │    └─ avatar-picker.tsx    2×4 grid arrow-key avatar selector
       ├─ subject-picker.tsx    Arrow-key subject menu (TOEFL/AP Psych/AP CSP/AP WHAP, remember-last)
       ├─ profile-view.tsx      `alvy profile` — avatar, level, composite score, stats
       ├─ daily-session.tsx     TOEFL learning flow (state machine)
       │    ├─ dashboard.tsx        Launch screen (mastered count, streak, XP)
       │    ├─ streak-header.tsx    Reusable progress bar
       │    ├─ root-lesson.tsx      Root intro card (meaning, origin, related roots)
       │    ├─ word-detail.tsx      Single word (breakdown, derivation chain, example)
       │    ├─ session-summary.tsx  End-of-session stats
       │    └─ celebration.tsx      All 30 roots mastered
       ├─ psych-session.tsx     AP Psychology learning flow (same state machine)
       ├─ psych-review.tsx      AP Psychology review
       ├─ csp-session.tsx       AP CSP learning flow (same state machine)
       ├─ csp-review.tsx        AP CSP review
       ├─ whap-session.tsx      AP World History learning flow (same state machine)
       ├─ whap-review.tsx       AP World History review
       ├─ review-session.tsx    Review weak roots (same components as daily)
       ├─ stats.tsx             Export markdown progress summary (both subjects)
       ├─ doctor.tsx            Environment health checks
       └─ explore.tsx           V2 stub ("Coming in V2")
```

## Data Flow

```
roots.json ──(import at startup)──> roots-db.ts (in-memory array, query functions)

~/.alvy/data.json ──(loadData)──> store.ts ──> UserData (in-memory)
                                                    │
                                   progress.ts mutates UserData
                                   (markRootSeen, markWordStudied,
                                    addXP, updateStreak)
                                                    │
                                   store.ts ──(saveData)──> data.json
                                   (atomic write via tmp + rename)
```

- **roots-db.ts** loads `roots.json` once at import time. Read-only.
- **store.ts** reads/writes `~/.alvy/data.json`. Creates dir + file on first run. Auto-migrates from `~/.toefl-roots/data.json` if present. V1→V2→V3 migration chain. Backs up corrupt files to `data.backup.json`. Exports `DATA_DIR` and `DATA_FILE` for use by other modules (e.g., doctor.tsx).
- **progress.ts** contains all business logic. Operates on the in-memory `UserData` object. Never touches the filesystem directly.
- **levels.ts** contains level system logic: XP curve, level computation, composite score, level-up detection. Pure functions.
- **avatars.ts** contains avatar constants (8 avatars with emoji + Chinese label).

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
                                ┌────────────┼────────────┐
                                ▼                          ▼
                       ┌──────────────┐          ┌──────────────┐
                       │   summary    │          │ celebration  │
                       │  (XP, streak)│          │ (all 30 done)│
                       └──────────────┘          └──────────────┘
```

Phase type: `"dashboard" | "root-intro" | "word-detail" | "quiz-intro" | "quiz" | "quiz-feedback" | "continue-prompt" | "summary" | "celebration" | "empty"`

Navigation: **→** advances forward, **←** goes back (word→word, word→root-intro, root-intro→prev root, root-intro→dashboard), **Esc** quits and saves. Quiz uses **1**/**2** keys. Each daily session presents 3 roots (configurable via `dailyGoal`). Each root has 5 words.

## Key Design Decisions

| Decision | Detail |
|----------|--------|
| No quiz/drill | Learning IS the derivation chain walkthrough. No multiple choice, no right/wrong. |
| Mastery = 5 words studied | A root is "mastered" when `wordsStudied >= 5` (all its words seen). No accuracy metric. |
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
| `src/index.tsx` | CLI entry point. Parses commands with `meow`, defaults to `"pick"`, renders `<App>`. |
| `src/app.tsx` | Routes command to the correct top-level component. `"pick"` → UpdatePrompt (if update available) → SubjectPicker → resolved command. |
| `src/components/subject-picker.tsx` | Arrow-key subject menu. Shows per-subject progress, remembers last choice. |
| `src/components/daily-session.tsx` | State machine for the main learning flow. Manages phases, word/root indices, XP tracking. |
| `src/components/review-session.tsx` | Like daily-session but selects weak roots (fewest `wordsStudied`, already `seen`). |
| `src/components/dashboard.tsx` | Shows mastered count (X/30), streak, XP. Entry point to a session. |
| `src/components/root-lesson.tsx` | Displays root card: root, meaning (EN + ZH), origin, related roots. |
| `src/components/word-detail.tsx` | Displays one word: breakdown, derivation chain, meaning, example sentence. |
| `src/components/session-summary.tsx` | End-of-session: words studied, XP earned, streak status. |
| `src/components/celebration.tsx` | Graduation screen when all 30 roots are mastered. |
| `src/components/streak-header.tsx` | Reusable streak counter + daily progress bar. |
| `src/components/stats.tsx` | `alvy stats` — generates markdown progress summary. |
| `src/components/doctor.tsx` | `alvy doctor` — checks Node.js version, npm, UTF-8 locale, disk permissions. Imports `DATA_DIR` from store.ts. |
| `src/components/explore.tsx` | V2 stub. Shows "Coming in V2" message. |
| `src/lib/types.ts` | TypeScript interfaces: `UserData` (V3), `RootProgress`, `RootEntry`, `RootWord`, `UserProfile`, `LevelProgress`, `AvatarId`, `Command`, `Subject`. |
| `src/lib/store.ts` | Read/write `~/.alvy/data.json`. Auto-migrates from `~/.toefl-roots/`. V1→V2→V3 migration chain. Exports `DATA_DIR`, `DATA_FILE`. First-run init, corrupt-file backup, atomic writes. |
| `src/lib/progress.ts` | Business logic: `masteredCount()`, `addXP()`, `updateStreak()`, `markRootSeen()`, `markWordStudied()`, `selectNextMorphemes()`. |
| `src/lib/levels.ts` | Level system: `xpForLevel()`, `computeLevel()`, `xpToNextLevel()`, `getLevelName()`, `computeCompositeScore()`, `checkLevelUp()`. |
| `src/lib/avatars.ts` | Avatar constants: 8 avatars (scholar, panda, rocket, cat, star, dragon, phoenix, owl). |
| `src/components/profile-setup.tsx` | First-launch profile setup (name input → avatar picker). |
| `src/components/avatar-picker.tsx` | 2×4 grid arrow-key avatar selector. |
| `src/components/profile-view.tsx` | `alvy profile` — shows avatar, level, composite score, stats. |
| `src/lib/roots-db.ts` | Query layer over `roots.json`: `getAllRoots()`, `getRootByKey()`, `getRelatedMeanings()`. |
| `src/lib/psych-db.ts` | Query layer over `psych.json`: `getAllConcepts()`, `getConceptByKey()`, etc. |
| `src/lib/csp-db.ts` | Query layer over `csp.json`: `getAllTopics()`, `getTopicByKey()`, etc. |
| `src/lib/whap-db.ts` | Query layer over `whap.json`: `getAllTopics()`, `getTopicByKey()`, etc. |
| `src/lib/update-check.ts` | Version check against npm registry (2s timeout) + `runUpdate()` via `npm install -g`. |
| `src/components/update-prompt.tsx` | Update available prompt: arrow-key menu (立即更新/跳过), three phases (prompt/updating/done). |
| `src/lib/ai.ts` | V2 stub (OpenAI client placeholder). |
| `src/lib/__tests__/levels.test.ts` | Vitest level system tests (15 cases: xpForLevel, computeLevel, xpToNextLevel, getLevelName, compositeScore, checkLevelUp). |
| `src/lib/__tests__/store.test.ts` | Vitest migration tests (9 cases: migrate, already migrated, fresh start, V1→V3, V2→V3, V3 no re-migration, XP→level, corrupt source). |
| `src/data/roots.json` | 20 roots + 10 affixes = 30 entries × 5 words = 150 words. |
| `src/data/psych.json` | AP Psychology: 26 concepts × ~5 terms = 130 terms. |
| `src/data/csp.json` | AP CSP: 20 concepts × ~3-6 terms = 72 terms. |
| `src/data/whap.json` | AP World History batches 1-2: 10 concepts × ~6-22 terms = 127 terms. |
| `install.sh` | One-line installer for macOS/Linux. Installs Node.js via nvm if needed, configures npm prefix, installs alvy globally. |

## What Does NOT Exist (Yet)

Planned but not yet built:

| Name | Status |
|------|--------|
| `concept-intro.tsx` | Planned for AP Psych. Like `root-lesson.tsx` for concepts. |
| `term-detail.tsx` | Planned for AP Psych. Like `word-detail.tsx` for terms. |
| Generalized `useSessionFlow` | Current hook works for both subjects but still uses `RootEntry` types. |
| `mnemonicCache` | No AI mnemonics. V2 Phase 2 feature (phonetic/mnemonic fields exist in types). |

Previously referenced in stale docs but now exist:

| Name | Current status |
|------|---------------|
| `subject-picker.tsx` | EXISTS. Arrow-key subject menu with remember-last. |
| `psych-session.tsx` | EXISTS. AP Psychology daily session. |
| `psych-review.tsx` | EXISTS. AP Psychology review session. |
| `psych.json` | EXISTS. AP Psychology content (26 concepts / 130 terms). |
| `psych-db.ts` | EXISTS. Query layer over psych.json. |
| `csp-session.tsx` | EXISTS. AP CSP daily session. |
| `csp-review.tsx` | EXISTS. AP CSP review session. |
| `csp.json` | EXISTS. AP CSP content (20 concepts / 72 terms). |
| `csp-db.ts` | EXISTS. Query layer over csp.json. |
| `whap-session.tsx` | EXISTS. AP World History daily session. |
| `whap-review.tsx` | EXISTS. AP World History review session. |
| `whap.json` | EXISTS. AP World History content (batch 1: 5 concepts / 68 terms). |
| `whap-db.ts` | EXISTS. Query layer over whap.json. |
| `quiz.tsx` | EXISTS. Binary-choice quiz (English word → two Chinese meanings). |
| `quiz-intro.tsx` | EXISTS. Transition screen before quiz. |
| `selectReviewMorphemes()` | EXISTS in progress.ts. Prioritizes lowest accuracy roots. |
| `quizAccuracy` | EXISTS in RootProgress. Tracks correct/total per root. |
| Distractor selection | EXISTS in useSessionFlow. Draws from other roots' `meaning_zh`. |
