#!/usr/bin/env bash
#
# Run the full expand-vocab pipeline.
# Usage: ./run_pipeline.sh [--limit N] [--dry-run] [--skip-generate]
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Parse args
LIMIT=""
DRY_RUN=""
SKIP_GENERATE=""

for arg in "$@"; do
  case $arg in
    --limit=*) LIMIT="--limit ${arg#*=}" ;;
    --limit)   shift; LIMIT="--limit $1" ;;
    --dry-run) DRY_RUN="--dry-run" ;;
    --skip-generate) SKIP_GENERATE="1" ;;
  esac
done

echo "========================================"
echo "  Alvy Vocabulary Expansion Pipeline"
echo "========================================"
echo ""

# Ensure build dir exists
mkdir -p build

# Phase 1
echo ">>> Phase 1: Extract & Cross-Reference"
python3 extract.py
echo ""

# Phase 2
echo ">>> Phase 2: Group & Merge"
python3 group.py
echo ""

# Phase 3
if [ -z "$SKIP_GENERATE" ]; then
  echo ">>> Phase 3: LLM Generation"
  python3 generate.py $LIMIT $DRY_RUN
  echo ""
else
  echo ">>> Phase 3: SKIPPED (--skip-generate)"
  # Copy grouped.json as generated.json so Phase 4 can run
  cp build/grouped.json build/generated.json
  echo ""
fi

# Phase 4
echo ">>> Phase 4: Assemble & Validate"
python3 assemble.py
echo ""

echo "========================================"
echo "  Pipeline complete!"
echo "========================================"
