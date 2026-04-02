# alvy — Implementation Handoff

Last updated: 2026-04-02
Branch: main
Status: Rename DONE, npm publish + GitHub repo rename PENDING

## What Happened

V1 shipped as `toefl-roots` on 2026-04-01. Derek tested with students on 2026-04-01. Student feedback:

1. **Installation is hard** — most students don't have Node.js or git
2. **Windows build issues** — `npm run build` had problems on Windows
3. **Content expansion** — students want SAT vocab and AP subject support (e.g., AP Psychology)

On 2026-04-02: CEO Review + Eng Review decided to rename to `alvy`, add install script, add data migration, add tests. All code changes implemented same day.

## Implementation Status

### DONE

| Step | What | Status |
|------|------|--------|
| 1 | Rename all source references (9 source files) | DONE |
| 2 | Add package.json fields (engines, files, prepublishOnly, test) | DONE |
| 3 | Data migration in store.ts (export DATA_DIR, auto-migrate from ~/.toefl-roots/) | DONE |
| 4 | DRY fix: doctor.tsx imports DATA_DIR from store.ts | DONE |
| 5 | Vitest + 4 migration tests (migrate, already migrated, fresh start, corrupt) | DONE |
| 6 | install.sh (one-line macOS/Linux installer) | DONE |
| 7 | README.md rewrite (install flow, commands, uninstall) | DONE |
| 8 | Documentation updates (DESIGN.md, ARCHITECTURE.md, CLAUDE.md) | DONE |
| 9 | tsconfig.json: exclude __tests__ from tsc output | DONE |
| 10 | Build passes, all tests pass | DONE |

### PENDING (manual steps)

| Step | What | Notes |
|------|------|-------|
| 11 | `npm pack --dry-run` | Verify contents: dist/, package.json, README.md |
| 12 | `npm login` + `npm publish` | From Derek's machine. If 403 (name frozen), fall back to `alvy-cli` |
| 13 | `npx alvy doctor` | Verify from registry |
| 14 | Rename GitHub repo | Settings → Repository name → `alvy`. Update remote: `git remote set-url origin git@github.com:derekhut/alvy.git` |
| 15 | Verify on clean machine | `npm install -g alvy`, `alvy`, `alvy --version`, `alvy doctor` |
| 16 | Test install.sh on macOS | `curl -fsSL ... \| bash` end-to-end |
| 17 | Test data migration | Create fake `~/.toefl-roots/data.json`, install alvy, verify at `~/.alvy/data.json` |

### What was explicitly deferred

| Item | Why |
|------|-----|
| Standalone binaries (Bun compile) | Ink + yoga native bindings risk. Do it when content matures. |
| SAT/AP content expansion | Separate plan. Same root-based engine works for SAT. AP Psychology is a different content model. |
| Web app version | CLI is right for AI Camp coding students. Web app when audience expands. |
| Spaced repetition | V2, per TODOS.md |
| AI explore mode | V2, needs API key |
| CI/CD for npm publish | Manual publish is fine for solo dev |
| Homebrew/Scoop formula | Overkill for current audience |
| `toefl_frequency` field rename in roots.json | Keep as data field. Not user-facing. Rename later if SAT content is added. |

## What Changed (file-by-file)

### Source files

| File | What changed |
|------|-------------|
| `package.json` | name → `alvy`, bin → `alvy`, description drops "TOEFL", added engines/files/prepublishOnly/test, vitest devDep |
| `src/lib/store.ts` | DATA_DIR → `~/.alvy/`, exports `DATA_DIR` + `DATA_FILE`, added `OLD_DATA_DIR`/`OLD_DATA_FILE` + `migrateFromOldPath()` |
| `src/lib/types.ts` | Comment: `~/.toefl-roots/` → `~/.alvy/` |
| `src/index.tsx` | Help text + error message: `toefl-roots` → `alvy` |
| `src/components/doctor.tsx` | Imports `DATA_DIR` from store.ts (was hardcoded), removed os/path imports for data dir, title → `alvy 环境检查` |
| `src/components/dashboard.tsx` | Title: `toefl-roots` → `alvy` |
| `src/components/celebration.tsx` | `toefl-roots review` → `alvy review` |
| `src/components/review-session.tsx` | `toefl-roots` → `alvy` |
| `src/lib/progress.ts` | Stats header: `# TOEFL 词根学习进度` → `# 词根学习进度` |
| `tsconfig.json` | Added `"exclude": ["src/**/__tests__"]` to prevent test files in dist/ |

### New files

| File | What |
|------|------|
| `src/lib/__tests__/store.test.ts` | 4 Vitest migration tests using tmp dirs + mocked homedir |
| `install.sh` | One-line installer: sudo check, Node detection, nvm fallback, npm prefix fix, proxy verification, Chinese errors, logging to ~/.alvy/install.log |

### Documentation

| File | What changed |
|------|-------------|
| `README.md` | Full rewrite: alvy install flow (curl one-liner + Windows), commands table, data storage at ~/.alvy/, uninstall instructions, migration note |
| `DESIGN.md` | Title: `# Design System — alvy` |
| `ARCHITECTURE.md` | Full rewrite: all paths/commands → alvy, added migration docs, added install.sh + test file to file reference, removed "No tests yet" from What Does NOT Exist |
| `CLAUDE.md` (parent) | Section renamed to `alvy (formerly toefl-roots)`, paths → ~/.alvy/, added `npm test`, added install.sh to key files |

### NOT changed (intentional)

| File | Why |
|------|-----|
| `src/data/roots.json` | `toefl_frequency` is a data attribute, not user-facing branding |
| `src/lib/types.ts` line 10 | `toefl_frequency` type matches roots.json field |
| `handoff.md` | Historical record; references to old name are context |

## Review Status

| Review | Status | Date | Key Findings |
|--------|--------|------|-------------|
| CEO Review | CLEAR | 2026-04-02 | HOLD SCOPE. Install script + rename. Outside voice: 12 findings, all addressed. |
| Eng Review | CLEAR | 2026-04-02 | DRY fix, data migration sequencing, proxy verification, Vitest migration test. All implemented. |
| Outside Voice (CEO) | Resolved | 2026-04-02 | npm prefix EACCES (install.sh handles), Windows coverage (README), data migration (store.ts), form factor (CLI stays). |
| Outside Voice (Eng) | Resolved | 2026-04-02 | npm name risk (fallback plan), migration sequencing (ensureDir → migrate → load), rename sweep (grep verified), npm pack (pending manual step). |

## Architecture

```
toefl-roots/                 (directory name stays until GitHub repo rename)
  src/
    index.tsx              # Entry point, CLI command routing (meow), --version
    app.tsx                # Routes command to screen component
    components/
      daily-session.tsx    # State machine: dashboard → root-intro → word-detail → summary
      review-session.tsx   # Review weak roots (same flow, filtered selection)
      dashboard.tsx        # X/30 mastered + progress bar + streak
      root-lesson.tsx      # Root intro card: meaning, origin, related roots
      word-detail.tsx      # Single word: breakdown, derivation chain, example, Chinese
      session-summary.tsx  # XP earned, streak, words studied
      celebration.tsx      # All 30 roots mastered
      streak-header.tsx    # Streak counter + daily progress bar
      stats.tsx            # Export markdown progress summary
      doctor.tsx           # Environment checks (imports DATA_DIR from store.ts)
      explore.tsx          # V2 stub
    lib/
      __tests__/
        store.test.ts      # Vitest migration tests (4 cases)
      roots-db.ts          # Query functions over roots.json
      store.ts             # JSON read/write (~/.alvy/data.json), exports DATA_DIR/DATA_FILE, migration from ~/.toefl-roots/
      progress.ts          # Business logic
      ai.ts                # V2 stub
      types.ts             # TypeScript interfaces
    data/
      roots.json           # 30 entries × 5 words = 150 words
  install.sh               # One-line installer for macOS/Linux
  package.json             # name: "alvy", bin: { "alvy": ... }
  tsconfig.json            # Excludes __tests__ from compilation
  DESIGN.md
  ARCHITECTURE.md
```

## Key Decisions (unchanged from V1)

- Mastery = 5 words studied per root
- No quiz system (learning IS the derivation chain)
- Batch writes only (session end + SIGINT)
- CJK never bold, always dimmed
- All UI text in Chinese
- roots.json keeps `toefl_frequency` field as data attribute

## Data Model (unchanged except path)

Progress at `~/.alvy/data.json` (auto-migrated from `~/.toefl-roots/data.json` on first run).

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
