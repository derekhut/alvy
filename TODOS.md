# TODOS — alvy

Last updated: 2026-04-09 — v1.6.5 mastered removal + rotation fix

## P0: BLOCKER

### Decide AP Psych pedagogical model
**What:** Decide what the AP Psychology teaching flow looks like. Options: (A) Concept intro (researcher, real-world example, explanation) → term detail cards → quiz, (B) Term flashcards only, (C) something else.
**Why:** Blocks ALL AP Psych implementation. Can't define data types, UI components, or content schema without this decision. The derivation-chain walkthrough is what makes TOEFL mode special... AP Psych needs an equivalent.
**Context:** CEO review surfaced this as blocker on 2026-04-08. Eng review outside voice confirmed content types are NOT separable from pedagogy. The state machine refactor can proceed independently, but everything else waits.
**Depends on:** Derek's decision. No code dependency.
**Source:** CEO review (2026-04-08), eng review outside voice (2026-04-08)

## P1: Pre-AP-Psych

### ~~Fix markWordStudied counter inflation~~ — DONE
**What:** `markWordStudied()` only increments `rootProgress.wordsStudied` counter for new words now (guarded by `!data.wordsStudied.includes(word)`). Mastery concept was later removed entirely in v1.6.5, so counter inflation no longer gates any user-visible behavior — but the fix is still live for review-mode's internal `wordsStudied` bookkeeping.
**Source:** Eng review issue 9 (2026-04-08)

## P2: Product Questions

### Shared streak may hide per-subject study gaps
**What:** Evaluate whether streak should track per-subject consistency or remain shared. Current model: study any subject, streak continues. Risk: student studies TOEFL for 20 days, switches to AP Psych for 10 days, streak says "30 days" but TOEFL has a 10-day gap.
**Why:** Shared streak incentivizes "touch any subject to keep the flame alive" rather than "study consistently within a subject." For test prep, this may be the wrong incentive.
**Context:** CEO review decided shared streak (2026-04-08). Outside voice flagged this as a product concern. May be fine for a small student group... revisit after seeing usage patterns.
**Depends on:** Pedagogical model decision, real student usage data.
**Source:** Eng review outside voice (2026-04-08)

### Quiz validation with students
**What:** Collect feedback from 3+ students post-V2 ship. Key question: "你觉得每个词根学完后的小测验有用吗？还是想直接学下一个？"
**Source:** V2 eng review outside voice (earlier session)

### Word of the Day dedup
**What:** Track last 7 shown words to avoid repeats within a week. Add `recentWotD: string[]` field.
**Source:** V2 review (earlier session)

## P3: Tech Debt

### Consolidate dailyGoal duplication
**What:** Daily goal stored in both top-level `dailyGoal` and `settings.dailyGoal`. Drop the top-level duplicate, use `settings.dailyGoal` only.
**Why:** Reduces confusion, simplifies data model. Currently both get written (`index.tsx:40-46`) and `daily-session.tsx:20` reads from settings with fallback.
**Fix:** Bundle with next migration. Migration sets `settings.dailyGoal` from top-level value, drops top-level field.
**Depends on:** Nothing (V2→V3 migration shipped, can do in V3→V4 or as a separate cleanup).
**Source:** Eng review issue 10 (2026-04-08)

### Quiz layout for long-text distractors (AP Psych)
**What:** Current quiz component (`quiz.tsx`) displays two short Chinese meanings side by side. AP Psych term definitions will be full sentences. Need a different layout for long-text binary choices.
**Why:** UX breaks when quiz choices are multi-sentence definitions instead of 2-4 character words.
**Depends on:** Pedagogical model decision.
**Source:** Eng review outside voice (2026-04-08)
