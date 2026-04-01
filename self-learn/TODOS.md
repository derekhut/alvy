# TODOS

## P1 — Blocking

### Price validation conversations (May-June)
- **What:** Once Derek's departure is public (end of April), have explicit pricing conversations with 5-10 alumni parents during May-June. Not selling. Telling them what's next and asking what they think about pricing.
- **Why:** The CEO review outside voice's strongest challenge: "quitting before validating." These conversations give price validation 2-3 months before July launch, at zero cost and zero conflict of interest (departure is already public).
- **Effort:** S (human: 5-10 conversations over 2 months)
- **Depends on:** Departure announcement (end of April)
- **Context:** Key question to ask: "I'm planning to offer AI Camp independently after June. I'm thinking about charging around 28-30K per coaching cycle. What's your honest reaction?" Their answers determine whether 30K is right, too high, or too low. This is the single most important de-risking action in the entire plan. Added from CEO review (2026-03-30).

### Set up tracking spreadsheet
- **What:** Create a simple spreadsheet (Feishu/Lark or Google Sheets) to track parent conversations, student progress, competition deadlines, and payments
- **Why:** With 15-30 parent conversations and 6-15 students, WeChat messages alone won't scale. Need a single source of truth for the pipeline. Without funnel data (contacted → responded → enrolled → paid), Derek can't diagnose WHERE conversion breaks.
- **Effort:** S (10 minutes)
- **Depends on:** Nothing
- **Context:** Columns: parent name, student name, outreach date, response, enrolled Y/N, payment status, coaching start date, competition target, submission status, portfolio-worthy Y/N. Must exist before first parent conversation in July. Promoted from P2 by CEO review (2026-03-30): observability gap, can't diagnose conversion problems without data.

### Write price negotiation script
- **What:** Pre-commit Derek's response for when parents negotiate on price. "Can you do 20K?" "What about a sibling discount?" "We paid nothing last year."
- **Why:** Shanghai parents negotiate everything. Without a pre-committed response, Derek will make inconsistent decisions under pressure. One discount sets a precedent that spreads through parent WeChat groups.
- **Effort:** S (human: 30 min)
- **Depends on:** Price validation conversations (May-June)
- **Context:** The script should cover: (1) standard ask for discount, (2) "it was free before" objection, (3) sibling/referral discounts, (4) payment plan requests. Pre-commit means Derek decides BEFORE the conversation, not during it. Added from CEO review (2026-03-30).

### Define student selection criteria
- **What:** Decide whether AI Camp has an application/interview process or is open enrollment for anyone who pays
- **Why:** The free-era students were self-selected for high motivation. Paying parents might push reluctant kids into the program. A reluctant student wastes Derek's most scarce resource: time. And produces weak outcomes that hurt the brand.
- **Effort:** S (human: 1 hour thinking)
- **Depends on:** Nothing
- **Context:** Options: (1) open enrollment (anyone who pays), (2) brief WeChat conversation to assess student interest, (3) short application (student writes what they want to build). Even a 5-minute filter conversation prevents the worst-case scenario of a parent paying 24K for a kid who doesn't want to be there. Added from CEO review outside voice (2026-03-30).

### Research H2 2026 competition calendar
- **What:** Identify 3-5 specific AI/tech competitions with H2 2026 submission windows. Include dates, eligibility, format, and past difficulty level.
- **Why:** This is the BLOCKING open question from the vision doc. Parents will ask "what competition is my child entering?" in enrollment conversations. Without specific targets, the coaching cycle timeline can't be set.
- **Effort:** S (human: 2-3 hours research / CC: can assist)
- **Depends on:** Nothing
- **Context:** Known competitions: Google Gemma hackathon (timing TBD), Apple Swift Student Challenge (usually Feb deadline), WeChat Mini Program Challenge (timing TBD), IOAI (August 2026 in Kazakhstan), WAICY (global, ages 6-18). Need to confirm H2 2026 windows. Fallback: if no major competitions in H2 2026, coaching can target Q1 2027 competitions with earlier start. Added from CEO review (2026-03-30), flagged by outside voice as zero mitigation plan for BLOCKING dependency.

## P2 — Before Launch

### Define cold acquisition channel for 2027
- **What:** Research and choose a growth channel beyond the 33 alumni family warm list. Options: Xiaohongshu content, Douyin short-form video, school partnerships, WeChat content marketing, referral incentive programs.
- **Why:** The warm list has a ceiling. If AI Camp converts 8-15 alumni families in H2 2026, growth in 2027 requires a channel that reaches parents who don't already know Derek. If Phase 1 succeeds, Phase 2 starts January 2027. Starting research in January means the first stranger inquiry might not come until Q2 2027.
- **Effort:** M (human: ~1 week research / CC: competitive analysis)
- **Depends on:** Coaching model proven with paying students (H2 2026)
- **Context:** Start research October-November 2026 while Phase 1 coaching is underway, not January 2027. Promoted from P3 by CEO review (2026-03-30): prevents Q1 2027 cold start.

### Define re-enrollment model and retention assumptions
- **What:** Figure out the re-enrollment rate assumption. Competition coaching is project-based: competition ends, engagement ends. What percentage of students do a second cycle? How does this affect 2027 revenue projections?
- **Why:** The 2027 target of 15-20 students depends on whether that's all new or some returning. If every cycle requires full re-acquisition, the sales burden never decreases and "brand does the selling" in Phase 3 must work much harder.
- **Effort:** S (human: 1 hour thinking)
- **Depends on:** Phase 1 data (first cohort completion)
- **Context:** Derek's insight: the core delivery is building a public product, competitions are add-ons. Students can stay enrolled across multiple cycles/competitions, extending the payment relationship. This reframe (product-building core + competition add-ons) should be captured in the business model. Added from CEO review outside voice (2026-03-30).

### Define freelancer-to-brand transition mechanism
- **What:** Identify the specific, concrete mechanism by which "Derek coaching kids on WeChat" becomes "AI Camp the brand." The outside voice's sharpest challenge: what's the forcing function?
- **Why:** The vision doc describes a brand trajectory (Phases 1-4) but the transition from solo freelancer to recognized brand has no defined mechanism. Proof requires new results, which requires Derek coaching, which doesn't scale. The flywheel has a human bottleneck.
- **Effort:** M (human: ~2 hours deep thinking / CC: research)
- **Depends on:** Phase 1 results
- **Context:** Potential mechanisms: (1) alumni network that self-organizes, (2) content library that teaches without Derek, (3) hired junior coaches trained on Derek's methodology, (4) licensed methodology to other educators, (5) Camp format with higher student:coach ratio. None of these exist yet. The question is which one to invest in first. Added from CEO review outside voice (2026-03-30).

## P2 — TOEFL Word Root CLI (V2)

### Weekly digest report
- **What:** Auto-generate a weekly markdown summary of student's word root study activity: roots mastered, study progress, streak length. Exportable as image for WeChat sharing.
- **Why:** Retention feature. Makes the tool sticky after the first week. Students share progress in study groups. Ties into AI Camp brand (visible proof of learning).
- **Effort:** S (human: 2-3 hours / CC: 15 min)
- **Depends on:** TOEFL Word Root CLI V1 shipped + 1 week of student usage data
- **Context:** Format: "This week: 8 roots mastered, 40 words studied, streak: 7 days." Can be rendered as terminal output or exported as markdown. Added from CEO review (2026-04-01). Updated for TOEFL pivot (2026-04-01).

### Parent-friendly progress report
- **What:** Generate a one-page summary of student's TOEFL word root study habits and progress for parents. Shows roots mastered, study consistency, streak history, and morphemes completed.
- **Why:** Parents paying 24-30K for AI Camp coaching want proof of value. This report shows "your child mastered 20 word roots and 10 affixes this month, 100 words studied." Directly supports AI Camp business model.
- **Effort:** M (human: 1 week / CC: 30 min)
- **Depends on:** TOEFL Word Root CLI V1 shipped + 2-4 weeks of student data
- **Context:** Could be markdown, PDF, or terminal output. The key insight: parents don't need to run the CLI. Derek runs the report and sends it via WeChat. This is a coaching tool, not a student tool. V1 has `toefl-roots stats` as a simpler version of this. Added from CEO review (2026-04-01). Updated for TOEFL pivot (2026-04-01).

### Spaced repetition algorithm
- **What:** Implement SM-2 or FSRS (Free Spaced Repetition Scheduler) for optimal root review scheduling. Instead of sequential root progression, schedule reviews of previously mastered roots at increasing intervals based on study recency. Note: V1 has no quiz/drill system — mastery is based on words studied, not accuracy scores.
- **Why:** Turns the tool from "linear root progression" into "intelligent vocabulary retention system." The science is clear: spaced repetition produces better long-term retention than massed practice. Standard in every serious study tool (Anki, Quizlet, Memrise).
- **Effort:** M (human: 1 week / CC: 30 min)
- **Depends on:** TOEFL Word Root CLI V1 shipped. Requires per-root study history (V1 stores rootProgress per morpheme with wordsStudied count and lastStudied date).
- **Context:** FSRS is the state-of-the-art algorithm, targeting 90% recall. Open source implementation available. V1's review mode covers weak-root review manually. Spaced repetition automates the scheduling. Added from CEO review (2026-04-01). Updated for TOEFL pivot (2026-04-01).

## P3 — TOEFL Word Root CLI (V3+)

### Terminal achievements/badges
- **What:** Unlock badges at milestones: "First Root Mastered," "7-Day Streak," "All Roots Complete," "Perfect Study Session." Display on launch screen dashboard.
- **Why:** Gamification layer on top of streaks+XP. Provides milestone recognition and screenshot-worthy moments. More meaningful once students have a community to show badges to.
- **Effort:** S (human: 2 hours / CC: 15 min)
- **Depends on:** TOEFL Word Root CLI V1 shipped + streak system working
- **Context:** Badges without a community are just console.log messages. V1 has a completion celebration screen. Badges extend that concept to intermediate milestones. Consider adding alongside a study buddy or leaderboard feature. Added from CEO review (2026-04-01). Updated for TOEFL pivot (2026-04-01).

## P3 — Post-Launch

### State student IP ownership policy
- **What:** Explicitly state in enrollment materials that students own all intellectual property they create during AI Camp coaching
- **Why:** Parents paying 24K+ want to know who owns what their child builds. Explicit IP ownership is a trust builder. Some enrichment programs claim rights to student work for marketing, which creates resentment.
- **Effort:** S (human: 15 min, one paragraph)
- **Depends on:** Enrollment materials being drafted
- **Context:** The policy should be simple: "Your child owns everything they build. AI Camp may use project descriptions and results for marketing with your permission." This aligns with the parent permission collection process in the tactical doc. Added from CEO review (2026-03-30).
