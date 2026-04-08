#!/usr/bin/env python3
"""
Phase 1: Extract & Cross-Reference

Loads TOEFL word list, cross-references with engra's words.csv and root YAMLs,
classifies each word into tiers, and writes build/extracted.json.
"""

import csv
import json
import re
import sys
from pathlib import Path

import yaml

from config import (
    TOEFL_JSON, WORDS_CSV, ROOTS_DIR, ROOTS_JSON, GLOSSARIES_DIR,
    EXTRACTED_JSON, BUILD_DIR,
    FREQ_HIGH_THRESHOLD, FREQ_MED_THRESHOLD,
    CEFR_HIGH, CEFR_MED, CEFR_LOW,
)


def load_toefl_words() -> list[str]:
    """Load the TOEFL glossary word list."""
    with open(TOEFL_JSON, "r", encoding="utf-8") as f:
        words = json.load(f)
    print(f"  Loaded {len(words)} TOEFL words")
    return words


def load_existing_words() -> set[str]:
    """Load already-known words from current roots.json."""
    with open(ROOTS_JSON, "r", encoding="utf-8") as f:
        roots = json.load(f)
    known = set()
    for root_entry in roots:
        for w in root_entry.get("words", []):
            known.add(w["word"].lower())
    print(f"  Loaded {len(known)} existing words from roots.json")
    return known


def load_words_csv() -> dict[str, dict]:
    """
    Load words.csv, deduplicate by word (keep row with most tags).
    Returns dict: word -> {phonetic, meaning, roots, tags, tag_count, exchange}
    """
    word_map: dict[str, dict] = {}
    with open(WORDS_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get("name", "").strip().lower()
            if not name:
                continue
            tags = row.get("tags", "").strip()
            tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
            tag_count = len(tag_list)

            entry = {
                "phonetic": row.get("phonetic", "").strip(),
                "meaning": row.get("meaning", "").strip(),
                "roots": row.get("roots", "").strip(),
                "tags": tag_list,
                "tag_count": tag_count,
                "exchange": row.get("exchange", "").strip(),
            }

            # Keep row with most tags (most metadata)
            if name not in word_map or tag_count > word_map[name]["tag_count"]:
                word_map[name] = entry

    print(f"  Loaded {len(word_map)} unique words from words.csv")
    return word_map


def load_all_glossaries() -> dict[str, set[str]]:
    """Load all glossary files and return word -> set of glossary names."""
    word_glossaries: dict[str, set[str]] = {}
    for gfile in GLOSSARIES_DIR.glob("*.json"):
        glossary_name = gfile.stem
        with open(gfile, "r", encoding="utf-8") as f:
            words = json.load(f)
        for w in words:
            wl = w.lower().strip()
            if wl not in word_glossaries:
                word_glossaries[wl] = set()
            word_glossaries[wl].add(glossary_name)
    print(f"  Loaded glossary membership for {len(word_glossaries)} words")
    return word_glossaries


def find_word_in_yaml_tree(node: dict, target: str) -> dict | None:
    """Recursively walk a YAML root tree to find a word node."""
    if node.get("name", "").lower() == target:
        return node
    for child in node.get("children", []):
        result = find_word_in_yaml_tree(child, target)
        if result:
            return result
    return None


_yaml_cache: dict[str, dict | None] = {}

def load_root_yaml(root_name: str) -> dict | None:
    """Load a root YAML file, with caching. Returns None if not found."""
    if root_name in _yaml_cache:
        return _yaml_cache[root_name]

    yml_path = ROOTS_DIR / f"{root_name}.yml"
    if not yml_path.exists():
        _yaml_cache[root_name] = None
        return None

    try:
        with open(yml_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
        _yaml_cache[root_name] = data
        return data
    except Exception:
        _yaml_cache[root_name] = None
        return None


def parse_engra_mnemonic(mnemonic: str, word_meaning_zh: str) -> tuple[str | None, str | None]:
    """
    Parse engra mnemonic format into Alvy's breakdown and derivation.

    Example input:  'n.【re-回，duc 引；"引回" →】'
    Example output: ('re-(回) + duc-(引)', 're(回) + duc(引) → 引回 → 减少')
    """
    if not mnemonic:
        return None, None

    # Extract content between 【...】
    match = re.search(r'【(.+?)】', mnemonic)
    if not match:
        return None, None

    content = match.group(1)

    # Parse morpheme segments: patterns like "re-回" or "duc 引" or "-tion 名词后缀"
    # Common patterns: "prefix 义", "prefix-义", "prefix…义"
    parts = []
    # Split on common delimiters: ；, ，, ; but not inside quotes
    segments = re.split(r'[；;]', content)

    for seg in segments:
        seg = seg.strip()
        if not seg or seg.startswith('"') or seg.startswith('"') or seg.startswith('→'):
            continue
        # Split further on ，
        subsegments = re.split(r'，', seg)
        for subseg in subsegments:
            subseg = subseg.strip()
            if not subseg or subseg.startswith('"') or subseg.startswith('"') or subseg.startswith('→'):
                continue
            # Try to extract morpheme and meaning
            # Patterns: "re-回" "duc 引" "-tion 名词后缀" "fore 前"
            m = re.match(r'^(-?\w+[-]?)\s*(.+)$', subseg)
            if m:
                morpheme = m.group(1).strip()
                meaning = m.group(2).strip()
                # Clean up meaning - remove trailing punctuation
                meaning = meaning.rstrip('，,；;')
                parts.append((morpheme, meaning))

    if not parts:
        return None, None

    # Build breakdown: "re-(回) + duc-(引)"
    breakdown_parts = []
    for morpheme, meaning in parts:
        # Normalize morpheme: ensure trailing dash for prefixes
        breakdown_parts.append(f"{morpheme}({meaning})")
    breakdown = " + ".join(breakdown_parts)

    # Build derivation: "re(回) + duc(引) → 引回 → 减少"
    derivation_parts = []
    for morpheme, meaning in parts:
        clean_morpheme = morpheme.rstrip("-").lstrip("-")
        derivation_parts.append(f"{clean_morpheme}({meaning})")
    derivation_chain = " + ".join(derivation_parts)

    # Try to extract the quoted intermediate meaning
    quote_match = re.search(r'["""](.+?)["""]', content)
    if quote_match:
        intermediate = quote_match.group(1)
        derivation_chain += f" → {intermediate}"

    # Add final meaning
    if word_meaning_zh:
        # Take first meaning (before comma)
        final = word_meaning_zh.split("，")[0].split(",")[0].strip()
        # Remove POS prefix like "n. " "v. " "adj. "
        final = re.sub(r'^[a-z]+\.\s*', '', final)
        if final and not derivation_chain.endswith(final):
            derivation_chain += f" → {final}"

    return breakdown, derivation_chain


def compute_frequency(word: str, csv_entry: dict | None, glossary_map: dict[str, set[str]]) -> str:
    """Determine toefl_frequency tier for a word."""
    glossaries = glossary_map.get(word, set())
    tags = csv_entry["tags"] if csv_entry else []

    # Check CEFR level overrides
    for tag in tags:
        if tag in CEFR_HIGH:
            return "high"
    for tag in tags:
        if tag in CEFR_MED:
            return "medium"
    for tag in tags:
        if tag in CEFR_LOW:
            return "low"

    # Count glossary appearances
    glossary_count = len(glossaries)
    if glossary_count >= FREQ_HIGH_THRESHOLD:
        return "high"
    elif glossary_count >= FREQ_MED_THRESHOLD:
        return "medium"
    else:
        return "low"


def extract_meaning_zh(csv_entry: dict | None, yaml_node: dict | None) -> str:
    """Extract Chinese meaning, preferring CSV (more complete)."""
    if csv_entry and csv_entry.get("meaning"):
        # Clean up: remove "n. " prefix style, keep Chinese
        meaning = csv_entry["meaning"]
        # The meaning field contains POS + Chinese, e.g. "n. 益处，好处"
        return meaning
    if yaml_node and yaml_node.get("meaning"):
        return yaml_node["meaning"]
    return ""


def extract_phonetic(csv_entry: dict | None, yaml_node: dict | None) -> str:
    """Extract phonetic, preferring CSV."""
    if csv_entry and csv_entry.get("phonetic"):
        return csv_entry["phonetic"]
    if yaml_node and yaml_node.get("phonetic"):
        # Strip brackets: ［...］ → /.../
        ph = yaml_node["phonetic"]
        ph = ph.strip("［］[]")
        return ph
    return ""


def run():
    print("Phase 1: Extract & Cross-Reference")
    print("=" * 50)

    # 1. Load all sources
    print("\nLoading sources...")
    toefl_words = load_toefl_words()
    existing_words = load_existing_words()
    csv_map = load_words_csv()
    glossary_map = load_all_glossaries()

    # 2. Filter to new words only (not in existing roots.json)
    new_words = [w.lower().strip() for w in toefl_words if w.lower().strip() not in existing_words]
    print(f"\n  {len(toefl_words)} TOEFL words - {len(existing_words)} existing = {len(new_words)} new words to process")

    # 3. Process each word
    results = []
    tier_counts = {"tier1": 0, "tier2": 0, "tier3": 0}

    for word in new_words:
        csv_entry = csv_map.get(word)
        root_names_str = csv_entry["roots"] if csv_entry and csv_entry.get("roots") else ""
        root_names = [r.strip() for r in root_names_str.split(",") if r.strip()] if root_names_str else []

        yaml_node = None
        yaml_root_name = None
        yaml_root_data = None
        mnemonic = None

        # Try to find word in root YAMLs
        for rn in root_names:
            root_data = load_root_yaml(rn)
            if root_data:
                node = find_word_in_yaml_tree(root_data, word)
                if node:
                    yaml_node = node
                    yaml_root_name = rn
                    yaml_root_data = root_data
                    mnemonic = node.get("mnemonic")
                    break

        # If not found via CSV roots, still no yaml_node
        # Classify tier
        meaning_zh = extract_meaning_zh(csv_entry, yaml_node)
        phonetic = extract_phonetic(csv_entry, yaml_node)
        frequency = compute_frequency(word, csv_entry, glossary_map)

        breakdown = None
        derivation = None

        if yaml_node and mnemonic:
            # Tier 1: has mnemonic, can auto-parse
            tier = 1
            breakdown, derivation = parse_engra_mnemonic(mnemonic, meaning_zh)
            tier_counts["tier1"] += 1
        elif root_names:
            # Tier 2: has root mapping but no mnemonic
            tier = 2
            tier_counts["tier2"] += 1
        else:
            # Tier 3: no root mapping at all
            tier = 3
            tier_counts["tier3"] += 1

        entry = {
            "word": word,
            "tier": tier,
            "root_names": root_names,
            "primary_root": yaml_root_name or (root_names[0] if root_names else None),
            "phonetic": phonetic,
            "meaning_zh": meaning_zh,
            "breakdown": breakdown,
            "derivation": derivation,
            "mnemonic_raw": mnemonic,
            "toefl_frequency": frequency,
            # Root-level metadata from YAML (if available)
            "root_meaning": yaml_root_data.get("meaning") if yaml_root_data else None,
        }
        results.append(entry)

    # 4. Write output
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    with open(EXTRACTED_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\nResults:")
    print(f"  Tier 1 (has mnemonic, auto-parse): {tier_counts['tier1']}")
    print(f"  Tier 2 (has root, no mnemonic):    {tier_counts['tier2']}")
    print(f"  Tier 3 (no root mapping):           {tier_counts['tier3']}")
    print(f"  Total: {len(results)}")
    print(f"\n  Written to {EXTRACTED_JSON}")


if __name__ == "__main__":
    run()
