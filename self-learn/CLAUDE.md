## gstack

- For all web browsing, use the `/browse` skill from gstack. Never use `mcp__claude-in-chrome__*` tools.
- Available skills: `/autoplan`, `/benchmark`, `/browse`, `/canary`, `/careful`, `/codex`, `/connect-chrome`, `/cso`, `/design-consultation`, `/design-review`, `/document-release`, `/freeze`, `/gstack-upgrade`, `/guard`, `/investigate`, `/land-and-deploy`, `/office-hours`, `/plan-ceo-review`, `/plan-design-review`, `/plan-eng-review`, `/qa`, `/qa-only`, `/retro`, `/review`, `/setup-browser-cookies`, `/setup-deploy`, `/ship`, `/unfreeze`

## Design System
Always read toefl-roots/DESIGN.md before making any visual or UI decisions.
All colors, text hierarchy, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## toefl-roots

### Architecture
Ink (React for terminal) + TypeScript CLI. State machine pattern for session flow (`dashboard → root-intro → word-detail → summary`). JSON persistence at `~/.toefl-roots/data.json` with atomic writes. No external API calls in V1.

See `toefl-roots/ARCHITECTURE.md` for the full component tree and data flow.

### Data Model
- **UserData**: `streak` (current/longest/lastDate), `xp` (total/today), `dailyGoal` (default 3), `rootProgress` (per-root: seen, wordsStudied, lastStudied), `wordsStudied` (flat string array)
- **Mastery**: a root is mastered when `wordsStudied >= 5` (all its words seen). No accuracy metric — there is no quiz.
- **XP**: +10 per word studied, unconditional. No penalty.

### Development Commands
```bash
cd toefl-roots
npm run build          # Compile TypeScript
npm run dev            # Watch mode
node dist/index.js     # Run daily session
node dist/index.js review   # Review weak roots
node dist/index.js stats    # Export progress
node dist/index.js doctor   # Environment check
```

### Coding Conventions
- All UI text in Chinese (DESIGN.md `Interface Language` rule)
- Never bold CJK characters (loses stroke clarity)
- Import paths use `.js` extensions (ESM)
- Atomic writes: write to `.tmp` then `rename()`
- No test suite yet

### Key Files
| File | Purpose |
|------|---------|
| `toefl-roots/DESIGN.md` | Design system (colors, typography, CJK rules) |
| `toefl-roots/ARCHITECTURE.md` | Component tree, data flow, state machine |
| `toefl-roots/src/lib/progress.ts` | All business logic |
| `toefl-roots/src/lib/store.ts` | Data persistence |
| `toefl-roots/src/lib/types.ts` | TypeScript interfaces |
| `toefl-roots/src/data/roots.json` | 30 roots × 5 words = 150 vocabulary items |