"""Shared configuration for the expand-vocab pipeline."""

from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
ALVY_DIR = SCRIPT_DIR.parent.parent
PROJECT_DIR = ALVY_DIR.parent  # self-learn/
ENGRA_DIR = PROJECT_DIR / "engra"

# Engra sources
TOEFL_JSON = ENGRA_DIR / "dict" / "glossaries" / "TOEFL.json"
WORDS_CSV = ENGRA_DIR / "dict" / "words.csv"
ROOTS_DIR = ENGRA_DIR / "dict" / "roots"
GLOSSARIES_DIR = ENGRA_DIR / "dict" / "glossaries"

# Alvy source / target
ROOTS_JSON = ALVY_DIR / "src" / "data" / "roots.json"

# Build artifacts
BUILD_DIR = SCRIPT_DIR / "build"
EXTRACTED_JSON = BUILD_DIR / "extracted.json"
GROUPED_JSON = BUILD_DIR / "grouped.json"
GENERATED_JSON = BUILD_DIR / "generated.json"
GENERATE_CHECKPOINT = BUILD_DIR / "generate-checkpoint.json"
OVERFLOW_JSON = BUILD_DIR / "overflow.json"

# ── Constants ──────────────────────────────────────────────────────────
MAX_WORDS_PER_ROOT = 8

# TOEFL frequency tiers based on glossary tag count
FREQ_HIGH_THRESHOLD = 6   # appears in >= 6 glossaries → high
FREQ_MED_THRESHOLD = 4    # appears in 4-5 glossaries → medium

# CEFR level overrides
CEFR_HIGH = {"CEFR-A1", "CEFR-A2", "CEFR-B1"}
CEFR_MED = {"CEFR-B2", "CEFR-C1"}
CEFR_LOW = {"CEFR-C2"}

# ── Claude API ─────────────────────────────────────────────────────────
CLAUDE_MODEL = "claude-sonnet-4-5-20250929"
BATCH_SIZE = 20
API_DELAY_SECONDS = 1.0

# ── Validation ─────────────────────────────────────────────────────────
VALID_TYPES = {"root", "prefix", "suffix", "association"}
VALID_FREQUENCIES = {"high", "medium", "low"}
