# Architecture — alvy

## Summary

alvy is an interactive CLI vocabulary tool built with **Ink** (React for terminal) + **TypeScript**. It teaches word roots using 新东方-style derivation chains — no quiz, no multiple choice. Students walk through each root and its 5 derived words, reading morpheme breakdowns and Chinese translations. Progress is persisted as JSON at `~/.alvy/data.json`.

## Component Dependency Tree

```
index.tsx          CLI entry point (meow parses args)
  └─ app.tsx       Command router (switch on "daily" | "review" | "stats" | "doctor")
       ├─ daily-session.tsx     Main learning flow (state machine)
       │    ├─ dashboard.tsx        Launch screen (mastered count, streak, XP)
       │    ├─ streak-header.tsx    Reusable progress bar
       │    ├─ root-lesson.tsx      Root intro card (meaning, origin, related roots)
       │    ├─ word-detail.tsx      Single word (breakdown, derivation chain, example)
       │    ├─ session-summary.tsx  End-of-session stats
       │    └─ celebration.tsx      All 30 roots mastered
       ├─ review-session.tsx    Review weak roots (same components as daily)
       ├─ stats.tsx             Export markdown progress summary
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
- **store.ts** reads/writes `~/.alvy/data.json`. Creates dir + file on first run. Auto-migrates from `~/.toefl-roots/data.json` if present. Backs up corrupt files to `data.backup.json`. Exports `DATA_DIR` and `DATA_FILE` for use by other modules (e.g., doctor.tsx).
- **progress.ts** contains all business logic. Operates on the in-memory `UserData` object. Never touches the filesystem directly.

## Session State Machine

```
┌───────────┐
│ dashboard │──(Enter)──┐
└───────────┘           │
                        ▼
              ┌────────────────┐
        ┌────>│  root-intro    │──(Enter)──┐
        │     │  (Root N/M)    │           │
        │     └────────────────┘           │
        │                                  ▼
        │                        ┌──────────────────┐
        │                        │  word-detail      │──(Enter)──┐
        │                        │  (Word N/5)       │           │
        │                        └──────────────────┘           │
        │                                  ▲                     │
        │                                  └──(more words)──────┘
        │                                            │
        │                                     (root complete)
        │                                            │
        └───────(more roots)─────────────────────────┤
                                                     │
                                              (session complete)
                                                     │
                                    ┌────────────────┼────────────────┐
                                    ▼                                  ▼
                           ┌──────────────┐                  ┌──────────────┐
                           │   summary    │                  │ celebration  │
                           │  (XP, streak)│                  │ (all 30 done)│
                           └──────────────┘                  └──────────────┘
```

Phase type: `"dashboard" | "root-intro" | "word-detail" | "summary" | "celebration"`

Each daily session presents 3 roots (configurable via `dailyGoal`). Each root has 5 words. The student presses Enter to advance through each screen.

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
| `src/index.tsx` | CLI entry point. Parses commands with `meow`, renders `<App>`. |
| `src/app.tsx` | Routes command to the correct top-level component. |
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
| `src/lib/types.ts` | TypeScript interfaces: `UserData`, `RootProgress`, `RootEntry`, `RootWord`, `Command`. |
| `src/lib/store.ts` | Read/write `~/.alvy/data.json`. Auto-migrates from `~/.toefl-roots/`. Exports `DATA_DIR`, `DATA_FILE`. First-run init, corrupt-file backup, atomic writes. |
| `src/lib/progress.ts` | Business logic: `masteredCount()`, `addXP()`, `updateStreak()`, `markRootSeen()`, `markWordStudied()`, `selectNextMorphemes()`. |
| `src/lib/roots-db.ts` | Query layer over `roots.json`: `getAllRoots()`, `getRootByKey()`, `getRelatedMeanings()`. |
| `src/lib/ai.ts` | V2 stub (OpenAI client placeholder). |
| `src/lib/__tests__/store.test.ts` | Vitest migration tests (4 cases: migrate, already migrated, fresh start, corrupt source). |
| `src/data/roots.json` | 20 roots + 10 affixes = 30 entries × 5 words = 150 words. |
| `install.sh` | One-line installer for macOS/Linux. Installs Node.js via nvm if needed, configures npm prefix, installs alvy globally. |

## What Does NOT Exist

These are frequently referenced in stale documentation but were never built:

| Name | Why it doesn't exist |
|------|---------------------|
| `word-drill.tsx` | No quiz system. Learning is derivation chain walkthrough, not multiple choice. |
| `result.tsx` | No correct/wrong feedback — there are no questions to answer. |
| `drillAccuracy` | No accuracy tracking. Mastery is based on `wordsStudied` count, not quiz scores. |
| `wordHistory` | No per-word attempt tracking. `wordsStudied` is a flat array of word strings. |
| `mnemonicCache` | No AI mnemonics. V2 feature. |
| `updateDrillAccuracy()` | No such function in progress.ts. |
| `selectReviewMorphemes()` | Review session uses the same `selectNextMorphemes()` with a filter for `seen` roots. |
| Distractor selection | No distractors — there are no multiple choice questions. |
