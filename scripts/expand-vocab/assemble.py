#!/usr/bin/env python3
"""
Phase 4: Assemble & Validate

Merges generated data into final roots.json, validates against TypeScript
interfaces, and writes the output.
"""

import json
import re
import sys
from pathlib import Path

from config import (
    GENERATED_JSON, ROOTS_JSON, BUILD_DIR,
    VALID_TYPES, VALID_FREQUENCIES,
)


def load_generated() -> list[dict]:
    """Load Phase 3 output."""
    with open(GENERATED_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_root_name(name: str) -> str:
    return name.lower().strip().strip("-")


def validate_word(word: dict, root_name: str) -> list[str]:
    """Validate a word entry against RootWord interface. Returns list of issues."""
    issues = []
    required_fields = ["word", "breakdown", "meaning_en", "meaning_zh",
                       "derivation", "example", "example_zh", "toefl_frequency"]

    for field in required_fields:
        if not word.get(field):
            issues.append(f"  [{root_name}] word '{word.get('word', '?')}': missing '{field}'")

    freq = word.get("toefl_frequency", "")
    if freq and freq not in VALID_FREQUENCIES:
        issues.append(f"  [{root_name}] word '{word.get('word', '?')}': invalid frequency '{freq}'")

    # Check phonetic format if present
    phonetic = word.get("phonetic", "")
    if phonetic and not (phonetic.startswith("/") or phonetic.startswith("[")):
        issues.append(f"  [{root_name}] word '{word.get('word', '?')}': phonetic not in IPA format: '{phonetic}'")

    # Check example contains the word
    example = word.get("example", "").lower()
    word_text = word.get("word", "").lower()
    if example and word_text and word_text not in example:
        issues.append(f"  [{root_name}] word '{word.get('word', '?')}': example doesn't contain the word")

    return issues


def validate_root(root: dict) -> list[str]:
    """Validate a root entry against RootEntry interface. Returns list of issues."""
    issues = []

    # Required root fields
    for field in ["root", "type", "meaning_en", "meaning_zh", "origin"]:
        if not root.get(field) and field not in ("meaning_en", "meaning_zh"):
            issues.append(f"  Root '{root.get('root', '?')}': missing '{field}'")

    root_type = root.get("type", "")
    if root_type and root_type not in VALID_TYPES:
        issues.append(f"  Root '{root.get('root', '?')}': invalid type '{root_type}'")

    if "related" not in root:
        issues.append(f"  Root '{root.get('root', '?')}': missing 'related' array")

    if "words" not in root or not root["words"]:
        issues.append(f"  Root '{root.get('root', '?')}': no words")
    else:
        for word in root["words"]:
            issues.extend(validate_word(word, root.get("root", "?")))

    return issues


def clean_root(root: dict) -> dict:
    """Remove internal pipeline fields and ensure proper structure."""
    cleaned = {
        "root": root.get("root", ""),
        "type": root.get("type", "root"),
        "meaning_en": root.get("meaning_en", ""),
        "meaning_zh": root.get("meaning_zh", ""),
        "origin": root.get("origin", "Latin"),
        "related": root.get("related", []),
        "words": [],
    }

    for word in root.get("words", []):
        clean_word = {
            "word": word["word"],
            "breakdown": word.get("breakdown", ""),
            "meaning_en": word.get("meaning_en", ""),
            "meaning_zh": word.get("meaning_zh", ""),
            "derivation": word.get("derivation", ""),
            "example": word.get("example", ""),
            "example_zh": word.get("example_zh", ""),
            "toefl_frequency": word.get("toefl_frequency", "low"),
        }
        # Only include phonetic if present
        if word.get("phonetic"):
            clean_word["phonetic"] = word["phonetic"]
        # Only include mnemonic if present
        if word.get("mnemonic"):
            clean_word["mnemonic"] = word["mnemonic"]

        cleaned["words"].append(clean_word)

    return cleaned


def run():
    print("Phase 4: Assemble & Validate")
    print("=" * 50)

    # Load data
    print("\nLoading generated data...")
    roots = load_generated()
    print(f"  {len(roots)} root entries loaded")

    # Remove internal fields and clean
    print("\nCleaning entries...")
    cleaned_roots = [clean_root(r) for r in roots]

    # Deduplicate roots by normalized name
    print("  Deduplicating...")
    seen_roots: dict[str, int] = {}
    deduped = []
    for root in cleaned_roots:
        norm = normalize_root_name(root["root"])
        if norm in seen_roots:
            # Merge words into existing
            existing_idx = seen_roots[norm]
            existing_words = {w["word"].lower() for w in deduped[existing_idx]["words"]}
            for w in root["words"]:
                if w["word"].lower() not in existing_words:
                    deduped[existing_idx]["words"].append(w)
                    existing_words.add(w["word"].lower())
        else:
            seen_roots[norm] = len(deduped)
            deduped.append(root)

    # Sort alphabetically
    deduped.sort(key=lambda r: normalize_root_name(r["root"]))

    # Deduplicate words across all roots
    print("  Deduplicating words across roots...")
    global_word_set: set[str] = set()
    for root in deduped:
        unique_words = []
        for w in root["words"]:
            wl = w["word"].lower()
            if wl not in global_word_set:
                global_word_set.add(wl)
                unique_words.append(w)
        root["words"] = unique_words

    # Remove roots with no words
    deduped = [r for r in deduped if r["words"]]

    # Validate
    print("\nValidating...")
    all_issues = []
    for root in deduped:
        all_issues.extend(validate_root(root))

    warnings = len(all_issues)
    if warnings > 0:
        print(f"  {warnings} validation warnings:")
        # Show first 20
        for issue in all_issues[:20]:
            print(issue)
        if warnings > 20:
            print(f"  ... and {warnings - 20} more")
    else:
        print("  All entries valid!")

    # Count stats
    total_words = sum(len(r["words"]) for r in deduped)
    words_with_all_fields = 0
    for root in deduped:
        for w in root["words"]:
            if all(w.get(f) for f in ["word", "breakdown", "meaning_en", "meaning_zh",
                                       "derivation", "example", "example_zh"]):
                words_with_all_fields += 1

    # Write output
    print("\nWriting final roots.json...")
    # Atomic write
    tmp_path = ROOTS_JSON.with_suffix(".json.tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)
        f.write("\n")
    tmp_path.rename(ROOTS_JSON)

    print(f"\nSummary:")
    print(f"  Total roots: {len(deduped)}")
    print(f"  Total words: {total_words}")
    print(f"  Words with all fields: {words_with_all_fields}")
    print(f"  Validation warnings: {warnings}")
    print(f"\n  Written to {ROOTS_JSON}")


if __name__ == "__main__":
    run()
