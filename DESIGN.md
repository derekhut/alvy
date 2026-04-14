# Design System — alvy

## Product Context
- **What this is:** Terminal-based TOEFL vocabulary tool using 新东方词根词缀记忆法
- **Who it's for:** Chinese high school/college students preparing for TOEFL
- **Space/industry:** Education, language learning, CLI tool
- **Project type:** Interactive CLI app (Ink/React for terminal)

## Aesthetic Direction
- **Direction:** Late-night study companion
- **Mood:** Calm, warm, slightly gamified. Not dev-tool sterile, not Duolingo-childish. Feels like a smart friend sharing a system with you.
- **Inspiration:** charm.sh ecosystem, 新东方 vocabulary books, gaming UI palettes

## Color Palette (ANSI 256)
- **Approach:** Expressive — violet/amber as identity colors
- **Primary accent:** `#AF5FFF` (ANSI 135) — electric violet. Root highlights, active items, titles.
- **Reward/XP:** `#FFAF00` (ANSI 214) — warm amber. Streaks, XP, earned progress numbers.
- **Success:** `#00D26A` — bright green. Correct answers ✓, positive feedback.
- **Error:** `#FF4444` — bright red. Wrong answers ✗, clear signal.
- **Dimmed:** `#6C6C6C` (ANSI 242) — warm gray. Navigation hints and progress indicators only.
- **Borders:** `#4E4E4E` (ANSI 239) — cool slate. Structural, recedes.

## Text Hierarchy
- **Bold + violet:** Root being studied, app title
- **Bold + white:** English words (vocabulary)
- **Regular + white:** Content text — Chinese definitions, translations, examples, section labels (never bold CJK — loses stroke clarity)
- **Regular + dim:** Navigation hints only — "按回车继续 →", progress indicators "词根 1/3"
- **Italic + dim:** Mnemonics, encouragement, "the app's voice"
- **Bold + amber:** Numbers that matter (XP, streak count)

## Borders
- **Round corners** `╭╮╰╯` for content cards (lessons, words, results) — modern, soft
- **Dim single lines** `───` for section dividers
- Double borders `╔╗╚╝` are unused after v1.6.5 (celebration screen removed)

## Emoji Strategy
Emojis are punctuation, not decoration. One emoji per context, never two in a row.
- 🔥 streak
- ⭐ XP
- 🌙 daily goal complete
- No emoji on wrong answers (silence is more powerful)
- No emoji in menus
- 📚 and 🌱 (mastered count / celebration) retired in v1.6.5 with the mastered concept

## Spacing
- Dense but rhythmic
- 1-line padding inside cards, 1 blank line between sections (never 2)
- 2-space left margin globally (`paddingLeft={2}`)
- Content never starts at column 0

## CJK Considerations
- Left-align everything (never center mixed CJK/English)
- Use `string-width` for column calculations if needed
- Chinese content text in regular white (not dimmed)
- Never bold CJK characters
- Display Chinese in read-only contexts only

## Interface Language
All UI text in Chinese. English only for vocabulary content itself.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-01 | Violet/amber palette | Gaming UI feel, not dev-tool. Stands out from every other CLI learning tool. |
| 2026-04-01 | 新东方 derivation chains | Core learning mechanism — students see HOW parts create meaning. |
| 2026-04-01 | No quiz/multiple choice | Learning is the derivation, not guessing from options. |
| 2026-04-01 | Chinese UI text | Product is for Chinese students. |
| 2026-04-01 | Dusty rose for errors | "Not quite." reframes wrong answers as teaching moments. **Superseded 2026-04-14** — see below. |
| 2026-04-14 | Green ✓ / Red ✗ quiz feedback | `#00D26A` correct, `#FF4444` wrong. Chinese students expect intuitive green/red signal — dusty rose was too subtle. Quiz summary also uses green (≥80%) / red (<80%). |
| 2026-04-01 | Amber border on celebration card | Exception to slate border rule. Double border + amber = trophy moment. Only celebration screen used this. **Retired 2026-04-09** when the celebration/mastered concept was removed in v1.6.5. |
| 2026-04-02 | Content text white, dim nav only | Chinese definitions/examples were unreadable on dark terminals. Dim reserved for navigation hints. |
| 2026-04-09 | ASCII art avatars in profile/dashboard | 18 ASCII art avatars, full 3-line art in profile, dashboard, and subject picker. |
| 2026-04-09 | Level badge format `Lv.N` | Compact format with amber number, no titles. Progress bar in violet. |
| 2026-04-09 | Remove "mastered" concept (v1.6.5) | Mastery counter and celebration page were wrong for uneven-length concept sets (e.g. CSP 1–6 terms). Users now rotate indefinitely by oldest `lastStudied`. Dashboard, streak-header, subject-picker, stats summary, and `celebration.tsx` all simplified. |
