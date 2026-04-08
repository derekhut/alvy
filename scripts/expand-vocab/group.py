#!/usr/bin/env python3
"""
Phase 2: Group & Merge

Groups extracted words into root entries, merges with existing roots.json,
caps at 8 words per root, and determines root metadata.
"""

import json
import re
from collections import defaultdict
from pathlib import Path

import yaml

from config import (
    EXTRACTED_JSON, GROUPED_JSON, OVERFLOW_JSON, ROOTS_JSON,
    ROOTS_DIR, BUILD_DIR, MAX_WORDS_PER_ROOT,
)


def load_existing_roots() -> list[dict]:
    """Load the current roots.json."""
    with open(ROOTS_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def load_extracted() -> list[dict]:
    """Load Phase 1 output."""
    with open(EXTRACTED_JSON, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_root_name(name: str) -> str:
    """Normalize root name for matching (strip dashes, lowercase)."""
    return name.lower().strip().strip("-")


def load_root_yaml(root_name: str) -> dict | None:
    """Load a root YAML to get metadata."""
    yml_path = ROOTS_DIR / f"{root_name}.yml"
    if not yml_path.exists():
        return None
    try:
        with open(yml_path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except Exception:
        return None


def classify_root_type(root_name: str) -> str:
    """
    Determine if a root is a prefix, suffix, or root based on its name.
    Prefixes typically end with - or are common prefix morphemes.
    Suffixes typically start with -.
    """
    common_prefixes = {
        "re", "pre", "post", "anti", "un", "in", "im", "il", "ir",
        "dis", "mis", "non", "over", "under", "out", "sub", "super",
        "inter", "trans", "co", "counter", "de", "ex", "fore", "pro",
        "semi", "bi", "tri", "multi", "mono", "poly", "auto", "self",
        "hyper", "hypo", "ultra", "micro", "macro", "mega", "mini",
        "pseudo", "neo", "para", "extra", "intra", "circum", "peri",
    }
    common_suffixes = {
        "tion", "sion", "ment", "ness", "ity", "ence", "ance", "ous",
        "ive", "able", "ible", "ful", "less", "ly", "al", "ial",
        "ical", "ish", "ist", "ism", "er", "or", "ar", "ee", "eer",
        "ize", "ise", "ify", "ate", "en", "ward", "wise", "dom",
        "ship", "hood", "age", "ure", "th",
    }

    clean = normalize_root_name(root_name)
    if clean in common_prefixes:
        return "prefix"
    if clean in common_suffixes:
        return "suffix"
    return "root"


def guess_origin(root_name: str, yaml_data: dict | None) -> str:
    """Best-guess origin. Default to Latin for classical roots."""
    # Some common Greek roots
    greek_roots = {
        "graph", "gram", "log", "logy", "bio", "geo", "phon", "phone",
        "photo", "phil", "phob", "path", "poly", "mono", "auto", "tele",
        "micro", "macro", "mega", "psych", "chron", "dem", "crat",
        "theo", "therm", "hydr", "morph", "neur", "anthrop", "cosm",
        "crypt", "cycl", "dyn", "gen", "gon", "heli", "hetero", "homo",
        "ideo", "iso", "kine", "lith", "meta", "neo", "ortho", "pan",
        "para", "peri", "proto", "pseudo", "syn", "sym",
    }
    # Common Old English / Germanic
    english_roots = {
        "out", "over", "under", "up", "fore", "with", "self",
        "ward", "wise", "dom", "hood", "ship", "ful", "less",
    }

    clean = normalize_root_name(root_name)
    if clean in greek_roots:
        return "Greek"
    if clean in english_roots:
        return "Old English"
    return "Latin"


def detect_common_affixes(word: str) -> list[str]:
    """
    Detect common prefix/suffix morphemes in a word.
    Returns list of potential root names.
    """
    candidates = []

    # Common prefixes with their morpheme names
    prefix_map = {
        "re": "re", "pre": "pre", "un": "un", "in": "in", "im": "im",
        "dis": "dis", "mis": "mis", "over": "over", "under": "under",
        "out": "out", "sub": "sub", "super": "super", "inter": "inter",
        "trans": "trans", "anti": "anti", "counter": "counter",
        "de": "de", "ex": "ex", "pro": "pro", "non": "non",
        "fore": "fore", "semi": "semi", "co": "co",
    }

    # Common suffixes
    suffix_patterns = [
        (r"tion$", "tion"), (r"sion$", "sion"), (r"ment$", "ment"),
        (r"ness$", "ness"), (r"ity$", "ity"), (r"ence$", "ence"),
        (r"ance$", "ance"), (r"ous$", "ous"), (r"ive$", "ive"),
        (r"able$", "able"), (r"ible$", "ible"), (r"ful$", "ful"),
        (r"less$", "less"), (r"ize$", "ize"), (r"ify$", "ify"),
        (r"ate$", "ate"),
    ]

    for prefix, root in prefix_map.items():
        if word.startswith(prefix) and len(word) > len(prefix) + 2:
            candidates.append(root)

    for pattern, root in suffix_patterns:
        if re.search(pattern, word):
            candidates.append(root)

    return candidates


def frequency_sort_key(freq: str) -> int:
    """Sort key for toefl_frequency: high=0, medium=1, low=2."""
    return {"high": 0, "medium": 1, "low": 2}.get(freq, 3)


def find_related_roots(root_meaning: str, all_root_meanings: dict[str, str]) -> list[str]:
    """
    Find related roots based on antonym/synonym patterns in meanings.
    Simple heuristic: look for opposite meanings.
    """
    if not root_meaning:
        return []

    # Common antonym pairs
    antonym_pairs = [
        ("good", "bad"), ("big", "small"), ("up", "down"),
        ("in", "out"), ("before", "after"), ("with", "without"),
        ("together", "apart"), ("forward", "backward"),
        ("life", "death"), ("love", "hate"), ("new", "old"),
        ("write", "read"), ("push", "pull"), ("open", "close"),
        ("light", "dark"), ("many", "few"), ("one", "many"),
    ]

    related = []
    meaning_lower = root_meaning.lower()
    for root, meaning in all_root_meanings.items():
        if not meaning:
            continue
        other_lower = meaning.lower()
        for a, b in antonym_pairs:
            if (a in meaning_lower and b in other_lower) or \
               (b in meaning_lower and a in other_lower):
                related.append(root)
                break
    return related[:3]  # Cap at 3 related roots


def run():
    print("Phase 2: Group & Merge")
    print("=" * 50)

    # Load data
    print("\nLoading data...")
    existing_roots = load_existing_roots()
    extracted = load_extracted()
    print(f"  {len(existing_roots)} existing roots, {len(extracted)} extracted words")

    # Build lookup of existing roots by normalized name
    existing_by_name: dict[str, dict] = {}
    for root in existing_roots:
        norm = normalize_root_name(root["root"])
        existing_by_name[norm] = root

    # Build set of existing words across all roots
    existing_words = set()
    for root in existing_roots:
        for w in root.get("words", []):
            existing_words.add(w["word"].lower())

    # ── Step 1: Group words by root ──
    print("\nGrouping words by root...")
    root_groups: dict[str, list[dict]] = defaultdict(list)
    ungrouped: list[dict] = []

    for entry in extracted:
        word = entry["word"]
        if word.lower() in existing_words:
            continue  # Skip duplicates

        primary_root = entry.get("primary_root")
        root_names = entry.get("root_names", [])

        if primary_root:
            root_groups[primary_root].append(entry)
        elif root_names:
            root_groups[root_names[0]].append(entry)
        else:
            # Tier 3: try affix detection
            affixes = detect_common_affixes(word)
            if affixes:
                root_groups[affixes[0]].append(entry)
            else:
                ungrouped.append(entry)

    print(f"  {len(root_groups)} root groups, {len(ungrouped)} ungrouped words")

    # ── Step 2: Handle ungrouped words → association entries ──
    # Group ungrouped by first 3 letters as a loose association
    assoc_groups: dict[str, list[dict]] = defaultdict(list)
    for entry in ungrouped:
        word = entry["word"]
        if len(word) >= 4:
            prefix = word[:3]
            assoc_groups[prefix].append(entry)
        else:
            assoc_groups["misc"].append(entry)

    # Only keep association groups with 2+ words; rest go to "misc"
    misc_words = []
    real_assoc_groups = {}
    for prefix, words in assoc_groups.items():
        if len(words) >= 2:
            real_assoc_groups[prefix] = words
        else:
            misc_words.extend(words)

    if misc_words:
        if "misc" in real_assoc_groups:
            real_assoc_groups["misc"].extend(misc_words)
        else:
            real_assoc_groups["misc"] = misc_words

    # ── Step 3: Build root entries ──
    print("\nBuilding root entries...")
    new_roots = []
    overflow_entries = []
    all_root_meanings: dict[str, str] = {}

    for root_name, words in root_groups.items():
        # Sort by frequency (high first)
        words.sort(key=lambda w: frequency_sort_key(w.get("toefl_frequency", "low")))

        # Cap at MAX_WORDS_PER_ROOT
        if len(words) > MAX_WORDS_PER_ROOT:
            overflow_entries.extend(words[MAX_WORDS_PER_ROOT:])
            words = words[:MAX_WORDS_PER_ROOT]

        # Get root metadata from YAML
        yaml_data = load_root_yaml(root_name)
        root_meaning_raw = yaml_data.get("meaning", "") if yaml_data else ""
        root_type = classify_root_type(root_name)
        origin = guess_origin(root_name, yaml_data)

        # Determine root display name (with trailing dash for prefixes, leading for suffixes)
        if root_type == "prefix":
            display_name = root_name.rstrip("-") + "-"
        elif root_type == "suffix":
            display_name = "-" + root_name.lstrip("-")
        else:
            display_name = root_name

        # Check if this root already exists
        norm = normalize_root_name(root_name)
        existing_root = existing_by_name.get(norm)

        if existing_root:
            # Merge words into existing root
            existing_word_set = {w["word"].lower() for w in existing_root.get("words", [])}
            for w_entry in words:
                if w_entry["word"].lower() not in existing_word_set:
                    # Check total won't exceed cap
                    if len(existing_root["words"]) < MAX_WORDS_PER_ROOT:
                        existing_root["words"].append(build_word_entry(w_entry))
                    else:
                        overflow_entries.append(w_entry)
            # Keep existing root meaning
            all_root_meanings[norm] = existing_root.get("meaning_en", "")
        else:
            # Parse meaning_en from YAML meaning (often "义" format)
            meaning_en = root_meaning_raw or ""
            meaning_zh = ""
            if meaning_en:
                # The YAML meaning is often Chinese like "打" or "speak言，说"
                # Try to split: "speak言，说" → en="speak", zh="言，说"
                m = re.match(r'^([a-zA-Z\s,]+)(.*)$', meaning_en)
                if m:
                    meaning_en = m.group(1).strip().rstrip(",")
                    meaning_zh = m.group(2).strip()
                else:
                    # All Chinese
                    meaning_zh = meaning_en
                    meaning_en = ""

            root_entry = {
                "root": display_name,
                "type": root_type,
                "meaning_en": meaning_en,
                "meaning_zh": meaning_zh,
                "origin": origin,
                "related": [],  # Will be filled in pass 2
                "words": [build_word_entry(w) for w in words],
                "_needs_llm_meaning": not meaning_en,  # Flag for Phase 3
            }
            new_roots.append(root_entry)
            all_root_meanings[norm] = meaning_en

    # ── Handle association groups ──
    for prefix, words in real_assoc_groups.items():
        words.sort(key=lambda w: frequency_sort_key(w.get("toefl_frequency", "low")))
        if len(words) > MAX_WORDS_PER_ROOT:
            overflow_entries.extend(words[MAX_WORDS_PER_ROOT:])
            words = words[:MAX_WORDS_PER_ROOT]

        root_entry = {
            "root": prefix,
            "type": "association",
            "meaning_en": "",
            "meaning_zh": "",
            "origin": "",
            "related": [],
            "words": [build_word_entry(w) for w in words],
            "_needs_llm_meaning": True,
        }
        new_roots.append(root_entry)

    # ── Step 4: Fill in related roots ──
    print("  Computing related roots...")
    for root_entry in new_roots:
        norm = normalize_root_name(root_entry["root"])
        meaning = all_root_meanings.get(norm, "")
        if meaning:
            related = find_related_roots(meaning, all_root_meanings)
            # Format with dashes
            root_entry["related"] = [r for r in related if normalize_root_name(r) != norm]

    # ── Write outputs ──
    # Combine existing (possibly updated) + new
    all_roots = existing_roots + new_roots
    all_roots.sort(key=lambda r: normalize_root_name(r["root"]))

    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    with open(GROUPED_JSON, "w", encoding="utf-8") as f:
        json.dump(all_roots, f, ensure_ascii=False, indent=2)

    if overflow_entries:
        with open(OVERFLOW_JSON, "w", encoding="utf-8") as f:
            json.dump(overflow_entries, f, ensure_ascii=False, indent=2)

    # Count new words
    new_word_count = sum(
        len(r["words"]) for r in new_roots
    )
    merged_word_count = sum(
        len(r["words"]) for r in existing_roots
    ) - sum(
        len(r["words"]) for r in load_existing_roots()  # Original count
    )

    print(f"\nResults:")
    print(f"  New roots: {len(new_roots)}")
    print(f"  New words: {new_word_count}")
    print(f"  Words merged into existing roots: {merged_word_count}")
    print(f"  Overflow words: {len(overflow_entries)}")
    print(f"  Total roots: {len(all_roots)}")
    print(f"\n  Written to {GROUPED_JSON}")
    if overflow_entries:
        print(f"  Overflow at {OVERFLOW_JSON}")


def build_word_entry(entry: dict) -> dict:
    """Convert an extracted word entry into a RootWord-shaped dict."""
    return {
        "word": entry["word"],
        "phonetic": entry.get("phonetic", ""),
        "breakdown": entry.get("breakdown") or "",
        "derivation": entry.get("derivation") or "",
        "meaning_en": "",  # LLM will generate
        "meaning_zh": entry.get("meaning_zh", ""),
        "example": "",  # LLM will generate
        "example_zh": "",  # LLM will generate
        "toefl_frequency": entry.get("toefl_frequency", "low"),
        "_tier": entry.get("tier", 3),  # Internal: for Phase 3 to know what to generate
    }


if __name__ == "__main__":
    run()
