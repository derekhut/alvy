# alvy Refactor — SubjectRegistry + Generic Sessions + Macro Wiring

**Plan status:** Verified against `update_version` branch on 2026-04-10. Baseline `npm test` = **81 passing**. Ready for execution.

## Step 0 — Snapshot this plan to the repo (BEFORE Commit 1)

Before any code changes, copy this entire plan to `/Users/derekhu/Documents/project/self-learn/alvy/plan_refactor.md` as a checked-in tracking artifact. The repo copy is the working reference; this `~/.claude/plans/` copy is the planning-mode artifact. They start identical and the repo copy is updated as commits land (e.g. checking off completed batches).

## Context

The alvy CLI grew from 1 subject (TOEFL) to 5 wired subjects (TOEFL + 4 AP) with AP Macroeconomics content shipped but unwired. Each subject was added by **copy-pasting** the previous one, leaving:

- **10 nearly-identical session/review components** (1,810 LoC, 95%+ duplicated; differ only in db imports, label strings, and one Chinese subject name).
- **5 nearly-identical db files** (300 LoC, 98% duplicated; differ only in the JSON import name and cosmetic export names).
- **9–10 inline-literal subject sites** scattered across `types.ts`, `store.ts`, `dashboard.tsx`, `progress.ts`, `subject-picker.tsx`, `app.tsx`, `index.tsx`, `stats.tsx` that all need editing for every new subject — confirmed in MEMORY.md as the project's current pain point.
- **Unused dead code**: `src/lib/ai.ts` stub, `src/components/explore.tsx`, `getDataPath()` in store.ts, `inline` field on `AvatarDef`, `_totalRoots`/`_allRoots` params on `generateStatsSummary`, unused `totalRoots`/`getAllUnits` props on `Dashboard` and `StreakHeader`.

The user wants an **aggressive refactor** that introduces a `SubjectRegistry`, collapses the 5 db files into one factory, collapses the 10 session/review components into one generic pair, and **validates the refactor by wiring AP Macro through the new registry as the final step**. After this, adding a new AP subject is a ~25-line edit in 3 files (today: ~488 lines across 9–10 files).

The existing infrastructure makes this achievable cheaply:
- `src/hooks/useSessionFlow.ts` is **already** fully generic — every subject-specific knob is already a hook prop.
- `RootEntry`/`RootWord` types are already content-agnostic.
- Tests live in `src/lib/__tests__/` and never import session components or db files — **the 81-test surface is unaffected** by the component/db cutover.

**Outcome:** ~2,500 LoC deleted, ~640 LoC added (net ~1,860 LoC reduction, 16 prod files removed, 4 added), test count rises from 81 → 90, AP Macro becomes the 6th wired subject, and the SubjectRegistry pattern carries forward to AP Environmental Science (already queued at `ap_environment.md`) and any future subject.

---

## Architecture overview

### `src/lib/subject-db.ts` (NEW)
Generic factory that takes a parsed JSON array and returns a `SubjectDB` object exposing `getAll`, `getCount`, `getByKey`, `getRelatedMeanings`, `getDistractorMeaning`. Mechanically identical to today's per-subject db implementations but parameterized over the data array.

### `src/lib/subjects.ts` (NEW)
Single source of truth for every subject. A `Record<Subject, SubjectConfig>` literal where each entry encodes:
- **Identity**: `id`, `pickerLabel`, `dashboardTitle`, `reviewIntroTitle`, `emptyHintCmd`
- **Vocabulary**: `unitNoun` (词根/概念), `wordNoun` (单词/术语), `emptyNoun`
- **Component knobs**: `rootLessonLabels`, `wordDetailDerivationLabel`, `hideFrequency`, `quizTitle`
- **Review-list rendering**: `reviewMeaningSummary: (entry) => string` — TOEFL returns full `meaning_zh`; the 4 AP subjects return `meaning_zh.split("：")[0]`
- **CLI**: `sessionCommand`, `reviewCommand`, `cliToken` (empty string for TOEFL since it uses bare `daily`/`review`)
- **Data**: `db: SubjectDB` = `createSubjectDB(jsonData)`

Plus a derived `SUBJECT_LIST: SubjectConfig[]` array in display order, and a `SUBJECT_TO_SESSION_COMMAND` map for the picker handoff.

### `src/components/subject-session.tsx` (NEW)
Generic session component. Props: `{ subject: Subject }`. Looks up `SUBJECTS[subject]`, calls `selectNextMorphemes(initialData, cfg.db.getAll(), dailyGoal)`, and renders the same phase-switch as today's session components but parameterized via `cfg.*`. Replaces all 5 `*-session.tsx` files. Starts at `"dashboard"`, `markSeen: true`.

### `src/components/subject-review.tsx` (NEW)
Generic review component. Props: `{ subject: Subject }`. Mirrors today's `*-review.tsx` files but parameterized. Replaces all 5 `*-review.tsx` files. Starts at `"intro"` or `"empty"`, `markSeen: false`, `showContinuePrompt: false`. The empty-state and intro-card text stay inline (no new component) but pull every label from the registry — `cfg.reviewIntroTitle`, `cfg.unitNoun`, `cfg.emptyNoun`, `cfg.emptyHintCmd`, `cfg.reviewMeaningSummary(entry)`.

### `src/app.tsx` (REWRITTEN)
Replaces the 30-line `switch(resolved)` with a `Record<Command, () => React.ReactElement>` map, built from `SUBJECT_LIST.flatMap(...)` for the subject commands and with `stats`/`doctor`/`profile` as manual entries. `handleSelect(subject)` becomes `setResolved(SUBJECT_TO_SESSION_COMMAND[subject])`. ~140 lines → ~80.

### `src/index.tsx` (REWRITTEN parser)
`validCommands` becomes a `new Set(["stats", "doctor", "profile", "pick", ...SUBJECT_LIST.flatMap(s => [s.sessionCommand, s.reviewCommand])])`. The compound parser becomes a `SUBJECT_LIST.find(s => s.cliToken && s.cliToken === input && input2 === "review")` lookup. The TOEFL `alvy review` bare path still works because TOEFL has `cliToken: ""` (short-circuits the find) and `reviewCommand: "review"` is in the validCommands set already.

### `src/components/subject-picker.tsx` (SIMPLIFIED)
The hardcoded `subjects: SubjectOption[]` array becomes `SUBJECT_LIST.map(s => ({ key: s.id, label: s.pickerLabel }))`.

### `src/components/stats.tsx` (SIMPLIFIED)
Drops the 5 hardcoded db imports. `useEffect` becomes `for (const s of SUBJECT_LIST) console.log(generateStatsSummary(data, s.dashboardTitle, s.wordNoun));`.

### `src/lib/progress.ts:generateStatsSummary` (SIMPLIFIED)
Signature changes from `(data, _totalRoots, _allRoots?, subject?: "toefl"|"psych"|"micro")` to `(data, title: string, wordNoun: string)`. The two unused params are deleted; the inline subject ternary is replaced with the two passed strings. **Decision: pass plain strings, not a `SubjectConfig`** — avoids importing `subjects.ts` from `progress.ts` (which would create a `subjects.ts → progress.ts → subjects.ts` cycle since `subjects.ts` already pulls in callbacks that touch progress logic).

---

## Files modified or created

### New files
- `src/lib/subject-db.ts` (~50 LoC)
- `src/lib/subjects.ts` (~140 LoC for 5 subjects, ~165 for 6)
- `src/components/subject-session.tsx` (~150 LoC)
- `src/components/subject-review.tsx` (~170 LoC)
- `src/lib/__tests__/subject-db.test.ts` (~80 LoC, 4 tests)
- `src/lib/__tests__/subjects.test.ts` (~50 LoC, 5 tests)

### Files deleted
- `src/components/daily-session.tsx`, `review-session.tsx`
- `src/components/psych-session.tsx`, `psych-review.tsx`
- `src/components/csp-session.tsx`, `csp-review.tsx`
- `src/components/whap-session.tsx`, `whap-review.tsx`
- `src/components/micro-session.tsx`, `micro-review.tsx`
- `src/components/explore.tsx` (unreferenced)
- `src/lib/roots-db.ts`, `psych-db.ts`, `csp-db.ts`, `whap-db.ts`, `micro-db.ts`
- `src/lib/ai.ts` (unreferenced V2 stub)

### Files edited (cleanup + cutover)
- `src/lib/types.ts` — add `"macro"` to `Subject` and `Command` unions (Commit 8)
- `src/lib/store.ts` — replace inline `lastSubject` literal with `Subject`; remove dead `getDataPath()`
- `src/lib/progress.ts` — `generateStatsSummary` signature change
- `src/lib/avatars.ts` — remove `inline` field from interface and all 18 entries
- `src/lib/__tests__/progress.test.ts` — update `generateStatsSummary` call sites for new signature
- `src/components/dashboard.tsx` — drop unused `totalRoots`/`getAllUnits`/`subject` props; take `title: string` instead
- `src/components/streak-header.tsx` — drop unused `totalRoots`/`getAllUnits` props
- `src/app.tsx` — registry-driven dispatch
- `src/index.tsx` — registry-driven validCommands + compound parser; help text update
- `src/components/subject-picker.tsx` — registry-driven array

### Doc files
- `alvy/handoff.md` — bump test count, document SubjectRegistry, list macro as 6th wired subject
- `alvy/ARCHITECTURE.md` — update component tree, replace "5 db files / 10 session components" wording, remove the "macro runtime wiring TODO" rows
- `/Users/derekhu/Documents/project/self-learn/CLAUDE.md` — bump test count 81→90, mark macro as fully wired

---

## Commit sequence (9 commits)

- [ ] Step 0 — Snapshot plan to repo
- [ ] Commit 1 — chore: cleanup dead code (no behavior change)
- [ ] Commit 2 — refactor: introduce SubjectDB factory
- [ ] Commit 3 — refactor: introduce SubjectRegistry (5 subjects)
- [ ] Commit 4 — refactor: Dashboard takes title prop
- [ ] Commit 5 — feat: add SubjectSession and SubjectReview generic components
- [ ] Commit 6 — refactor: dispatch via SubjectRegistry, delete 10 per-subject components (CUTOVER)
- [ ] Commit 7 — refactor: tighten Subject literal types
- [ ] Commit 8 — feat: wire AP Macroeconomics via SubjectRegistry (VALIDATION)
- [ ] Commit 9 — docs: refresh handoff/ARCHITECTURE/CLAUDE for SubjectRegistry

See `~/.claude/plans/` planning artifact for full commit-by-commit detail and risk register.
