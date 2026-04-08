#!/usr/bin/env python3
"""
Phase 3: LLM Generation

Uses Claude API to fill missing fields (meaning_en, example, example_zh,
breakdown, derivation, phonetic) with batched requests and checkpointing.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

from config import (
    GROUPED_JSON, GENERATED_JSON, GENERATE_CHECKPOINT, BUILD_DIR,
    CLAUDE_MODEL, BATCH_SIZE, API_DELAY_SECONDS,
)


def load_grouped() -> list[dict]:
    """Load Phase 2 output."""
    with open(GROUPED_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def load_checkpoint() -> dict[str, dict]:
    """Load checkpoint if it exists. Returns word -> generated fields."""
    if GENERATE_CHECKPOINT.exists():
        with open(GENERATE_CHECKPOINT, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_checkpoint(checkpoint: dict[str, dict]):
    """Save checkpoint atomically."""
    tmp = GENERATE_CHECKPOINT.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(checkpoint, f, ensure_ascii=False, indent=2)
    tmp.rename(GENERATE_CHECKPOINT)


def collect_words_needing_generation(roots: list[dict]) -> list[dict]:
    """
    Collect all words that need LLM generation.
    Returns list of {word, tier, root_name, root_meaning, existing_fields...}
    """
    needs_gen = []
    for root in roots:
        root_name = root["root"]
        needs_root_meaning = root.get("_needs_llm_meaning", False)

        for word_entry in root.get("words", []):
            tier = word_entry.get("_tier", 0)
            if tier == 0:
                # Existing word from roots.json, skip
                continue

            needs_gen.append({
                "word": word_entry["word"],
                "tier": tier,
                "root_name": root_name,
                "root_type": root["type"],
                "root_meaning_en": root.get("meaning_en", ""),
                "root_meaning_zh": root.get("meaning_zh", ""),
                "existing_phonetic": word_entry.get("phonetic", ""),
                "existing_meaning_zh": word_entry.get("meaning_zh", ""),
                "existing_breakdown": word_entry.get("breakdown", ""),
                "existing_derivation": word_entry.get("derivation", ""),
                "toefl_frequency": word_entry.get("toefl_frequency", "low"),
                "_needs_root_meaning": needs_root_meaning,
            })

    return needs_gen


def build_prompt(batch: list[dict]) -> str:
    """Build the Claude API prompt for a batch of words."""
    words_desc = []
    for i, w in enumerate(batch):
        desc = f"""Word {i+1}: "{w['word']}"
  - Root: {w['root_name']} (type: {w['root_type']})
  - Root meaning (EN): {w['root_meaning_en'] or 'UNKNOWN - please generate'}
  - Root meaning (ZH): {w['root_meaning_zh'] or 'UNKNOWN - please generate'}
  - Tier: {w['tier']}
  - Existing phonetic: {w['existing_phonetic'] or 'NONE'}
  - Existing meaning_zh: {w['existing_meaning_zh'] or 'NONE'}
  - Existing breakdown: {w['existing_breakdown'] or 'NONE'}
  - Existing derivation: {w['existing_derivation'] or 'NONE'}
  - TOEFL frequency: {w['toefl_frequency']}"""
        words_desc.append(desc)

    words_text = "\n\n".join(words_desc)

    return f"""You are helping build a TOEFL vocabulary learning app. Generate missing fields for each word below.

For each word, provide ALL of these fields in a JSON array:
1. "word" - the word itself (copy exactly)
2. "phonetic" - IPA pronunciation (e.g. "/ˈbɛnɪfɪt/"). Use the existing value if provided and correct, otherwise generate.
3. "meaning_en" - concise English definition (1 sentence, under 15 words)
4. "meaning_zh" - Chinese definition with part of speech (e.g. "n. 益处，好处"). Use existing if provided and correct.
5. "breakdown" - morpheme breakdown in format: "prefix-(义) + root-(义) + suffix(义)". Use existing if provided.
6. "derivation" - 新东方-style derivation chain: "prefix(义) + root(义) → intermediate meaning → final meaning". Use existing if provided.
7. "example" - a natural English example sentence using the word (appropriate for TOEFL level)
8. "example_zh" - Chinese translation of the example sentence

If the word has a root with UNKNOWN meaning, also provide:
9. "root_meaning_en" - English meaning of the root morpheme
10. "root_meaning_zh" - Chinese meaning of the root morpheme

IMPORTANT RULES:
- breakdown format: morphemes separated by " + ", each with Chinese meaning in parentheses
- derivation format: "morph(义) + morph(义) → intermediate → final" using → arrows
- phonetic MUST be in IPA with slashes: /.../
- example MUST actually contain the word
- meaning_en should be the most common TOEFL-relevant definition
- All Chinese text should be in simplified Chinese

{words_text}

Respond with a JSON array of objects, one per word. No markdown, just the JSON array."""


def call_claude_api(client, prompt: str) -> list[dict]:
    """Call Claude API and parse response."""
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
        timeout=120.0,
    )

    text = response.content[0].text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first and last lines (```json and ```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines)

    try:
        result = json.loads(text)
        if isinstance(result, list):
            return result
        return [result]
    except json.JSONDecodeError as e:
        print(f"    WARNING: Failed to parse API response: {e}")
        print(f"    Response preview: {text[:200]}...")
        return []


def validate_word_result(result: dict, expected_word: str) -> bool:
    """Validate that an API result has all required fields."""
    if result.get("word", "").lower() != expected_word.lower():
        return False

    required = ["phonetic", "meaning_en", "meaning_zh", "breakdown",
                 "derivation", "example", "example_zh"]
    for field in required:
        if not result.get(field):
            return False

    # Phonetic should have slashes
    ph = result.get("phonetic", "")
    if not (ph.startswith("/") and ph.endswith("/")):
        # Try to fix
        result["phonetic"] = f"/{ph.strip('/')}"
        if not result["phonetic"].endswith("/"):
            result["phonetic"] += "/"

    # Example should contain the word
    if expected_word.lower() not in result.get("example", "").lower():
        return False

    return True


def run():
    parser = argparse.ArgumentParser(description="Phase 3: LLM Generation")
    parser.add_argument("--limit", type=int, default=0,
                        help="Limit number of words to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be processed without API calls")
    args = parser.parse_args()

    # Ensure unbuffered output
    sys.stdout.reconfigure(line_buffering=True)

    print("Phase 3: LLM Generation")
    print("=" * 50)

    # Check API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and not args.dry_run:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set.")
        print("  export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)

    # Load data
    print("\nLoading grouped data...")
    roots = load_grouped()
    words = collect_words_needing_generation(roots)
    checkpoint = load_checkpoint()

    # Filter already-generated words
    remaining = [w for w in words if w["word"] not in checkpoint]
    print(f"  {len(words)} words need generation, {len(checkpoint)} already in checkpoint")
    print(f"  {len(remaining)} remaining to process")

    if args.limit > 0:
        remaining = remaining[:args.limit]
        print(f"  Limited to {args.limit} words")

    if args.dry_run:
        print(f"\nDry run: would process {len(remaining)} words in {(len(remaining) + BATCH_SIZE - 1) // BATCH_SIZE} batches")
        tier_counts = {}
        for w in remaining:
            t = w["tier"]
            tier_counts[t] = tier_counts.get(t, 0) + 1
        for t in sorted(tier_counts):
            print(f"  Tier {t}: {tier_counts[t]} words")
        return

    # Initialize API client
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
    except ImportError:
        print("ERROR: anthropic package not installed. Run: pip install anthropic")
        sys.exit(1)

    # Process in batches
    batches = [remaining[i:i + BATCH_SIZE] for i in range(0, len(remaining), BATCH_SIZE)]
    total_batches = len(batches)
    success_count = 0
    fail_count = 0

    print(f"\nProcessing {len(remaining)} words in {total_batches} batches...")
    print(f"  Model: {CLAUDE_MODEL}")
    print(f"  Batch size: {BATCH_SIZE}")

    for batch_idx, batch in enumerate(batches):
        print(f"\n  Batch {batch_idx + 1}/{total_batches} ({len(batch)} words)...")

        prompt = build_prompt(batch)
        try:
            results = call_claude_api(client, prompt)
        except Exception as e:
            print(f"    ERROR: API call failed: {e}")
            # Save checkpoint and continue
            save_checkpoint(checkpoint)
            print(f"    Checkpoint saved. Retry later.")
            time.sleep(API_DELAY_SECONDS * 2)
            continue

        # Match results to batch words
        results_by_word = {r.get("word", "").lower(): r for r in results}
        batch_success = 0
        batch_fail = 0

        for w in batch:
            word = w["word"]
            result = results_by_word.get(word.lower())

            if result and validate_word_result(result, word):
                checkpoint[word] = result
                batch_success += 1
                success_count += 1
            else:
                batch_fail += 1
                fail_count += 1
                if result:
                    print(f"    WARN: Validation failed for '{word}'")
                else:
                    print(f"    WARN: No result returned for '{word}'")

        print(f"    Success: {batch_success}, Failed: {batch_fail}")

        # Save checkpoint after each batch
        save_checkpoint(checkpoint)

        # Rate limit delay
        if batch_idx < total_batches - 1:
            time.sleep(API_DELAY_SECONDS)

    # ── Apply checkpoint to roots ──
    print(f"\nApplying {len(checkpoint)} generated entries to roots...")
    roots_needing_meaning = {}

    for root in roots:
        for word_entry in root.get("words", []):
            word = word_entry["word"]
            if word in checkpoint:
                gen = checkpoint[word]
                word_entry["phonetic"] = gen.get("phonetic", word_entry.get("phonetic", ""))
                word_entry["meaning_en"] = gen.get("meaning_en", "")
                word_entry["meaning_zh"] = gen.get("meaning_zh", word_entry.get("meaning_zh", ""))
                word_entry["breakdown"] = gen.get("breakdown", word_entry.get("breakdown", ""))
                word_entry["derivation"] = gen.get("derivation", word_entry.get("derivation", ""))
                word_entry["example"] = gen.get("example", "")
                word_entry["example_zh"] = gen.get("example_zh", "")

                # Root meaning if provided
                if gen.get("root_meaning_en") and not root.get("meaning_en"):
                    root["meaning_en"] = gen["root_meaning_en"]
                if gen.get("root_meaning_zh") and not root.get("meaning_zh"):
                    root["meaning_zh"] = gen["root_meaning_zh"]

    # Write output
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    with open(GENERATED_JSON, "w", encoding="utf-8") as f:
        json.dump(roots, f, ensure_ascii=False, indent=2)

    print(f"\nResults:")
    print(f"  Successfully generated: {success_count}")
    print(f"  Failed: {fail_count}")
    print(f"  Total in checkpoint: {len(checkpoint)}")
    print(f"\n  Written to {GENERATED_JSON}")


if __name__ == "__main__":
    run()
