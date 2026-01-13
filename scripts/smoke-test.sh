#!/bin/bash
# Kometa Preview Studio - Smoke Test
#
# This script verifies that a preview job completed successfully by checking:
# 1. summary.json exists and has expected structure
# 2. Kometa exited with code 0
# 3. Write attempts were captured (blocked_write_attempts or captured_uploads)
# 4. Output images were generated (*_after.*)
#
# Usage:
#   ./scripts/smoke-test.sh <job-id>
#   ./scripts/smoke-test.sh          # Uses most recent job
#
# Exit codes:
#   0 - All checks passed
#   1 - Checks failed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
JOBS_DIR="${PROJECT_ROOT}/jobs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
log_fail() { echo -e "${RED}✗ FAIL${NC}: $1"; }
log_warn() { echo -e "${YELLOW}⚠ WARN${NC}: $1"; }
log_info() { echo -e "  INFO: $1"; }

# Find job directory
if [ -n "$1" ]; then
    JOB_ID="$1"
    JOB_DIR="${JOBS_DIR}/${JOB_ID}"
else
    # Find most recent job
    if [ ! -d "$JOBS_DIR" ]; then
        log_fail "Jobs directory not found: $JOBS_DIR"
        exit 1
    fi

    JOB_DIR=$(ls -td "${JOBS_DIR}"/*/ 2>/dev/null | head -1)
    if [ -z "$JOB_DIR" ]; then
        log_fail "No jobs found in $JOBS_DIR"
        exit 1
    fi
    JOB_ID=$(basename "$JOB_DIR")
fi

echo "========================================"
echo "Kometa Preview Studio - Smoke Test"
echo "========================================"
echo "Job ID: $JOB_ID"
echo "Job Dir: $JOB_DIR"
echo "----------------------------------------"

SUMMARY_FILE="${JOB_DIR}/output/summary.json"
OUTPUT_DIR="${JOB_DIR}/output"
FAILED=0

# Check 1: summary.json exists
echo ""
echo "Check 1: summary.json exists"
if [ -f "$SUMMARY_FILE" ]; then
    log_pass "summary.json found"
else
    log_fail "summary.json not found at $SUMMARY_FILE"
    FAILED=1
fi

# Check 2: Kometa exit code
echo ""
echo "Check 2: Kometa exit code"
if [ -f "$SUMMARY_FILE" ]; then
    EXIT_CODE=$(jq -r '.kometa_exit_code // "null"' "$SUMMARY_FILE" 2>/dev/null || echo "parse_error")
    if [ "$EXIT_CODE" = "0" ]; then
        log_pass "Kometa exited with code 0"
    elif [ "$EXIT_CODE" = "null" ] || [ "$EXIT_CODE" = "parse_error" ]; then
        log_fail "Could not read kometa_exit_code from summary.json"
        FAILED=1
    else
        log_fail "Kometa exited with code $EXIT_CODE (expected 0)"
        FAILED=1
    fi
else
    log_warn "Skipped (no summary.json)"
fi

# Check 3: Write blocking evidence
echo ""
echo "Check 3: Write blocking evidence (proxy captured uploads)"
if [ -f "$SUMMARY_FILE" ]; then
    BLOCKED_COUNT=$(jq -r '.blocked_write_attempts | length // 0' "$SUMMARY_FILE" 2>/dev/null || echo "0")
    CAPTURED_COUNT=$(jq -r '.captured_uploads_count // 0' "$SUMMARY_FILE" 2>/dev/null || echo "0")

    if [ "$BLOCKED_COUNT" -gt 0 ] || [ "$CAPTURED_COUNT" -gt 0 ]; then
        log_pass "Write blocking active: $BLOCKED_COUNT blocked requests, $CAPTURED_COUNT captured uploads"
    else
        log_fail "No write attempts captured (blocked=$BLOCKED_COUNT, captured=$CAPTURED_COUNT)"
        log_info "This may indicate Kometa didn't process any overlays, or proxy didn't intercept writes"
        FAILED=1
    fi
else
    log_warn "Skipped (no summary.json)"
fi

# Check 4: Output images generated
echo ""
echo "Check 4: Output images generated (*_after.*)"
if [ -d "$OUTPUT_DIR" ]; then
    OUTPUT_COUNT=$(find "$OUTPUT_DIR" -maxdepth 1 -name "*_after.*" -type f 2>/dev/null | wc -l)

    if [ "$OUTPUT_COUNT" -ge 5 ]; then
        log_pass "Found $OUTPUT_COUNT output images (expected 5)"
        find "$OUTPUT_DIR" -maxdepth 1 -name "*_after.*" -type f -exec basename {} \; | while read f; do
            log_info "  $f"
        done
    elif [ "$OUTPUT_COUNT" -gt 0 ]; then
        log_warn "Found $OUTPUT_COUNT output images (expected 5) - partial success"
        find "$OUTPUT_DIR" -maxdepth 1 -name "*_after.*" -type f -exec basename {} \; | while read f; do
            log_info "  $f"
        done
    else
        log_fail "No output images found in $OUTPUT_DIR"
        FAILED=1
    fi
else
    log_fail "Output directory not found: $OUTPUT_DIR"
    FAILED=1
fi

# Check 5: Missing targets
echo ""
echo "Check 5: Missing targets"
if [ -f "$SUMMARY_FILE" ]; then
    MISSING_COUNT=$(jq -r '.missing_targets | length // 0' "$SUMMARY_FILE" 2>/dev/null || echo "0")

    if [ "$MISSING_COUNT" -eq 0 ]; then
        log_pass "No missing targets"
    else
        log_warn "$MISSING_COUNT targets missing"
        jq -r '.missing_targets[]' "$SUMMARY_FILE" 2>/dev/null | while read target; do
            log_info "  Missing: $target"
        done
    fi
else
    log_warn "Skipped (no summary.json)"
fi

# Summary
echo ""
echo "========================================"
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}SMOKE TEST PASSED${NC}"
    echo "========================================"
    exit 0
else
    echo -e "${RED}SMOKE TEST FAILED${NC}"
    echo "========================================"
    echo ""
    echo "Troubleshooting tips:"
    echo "  - Check container logs: docker-compose logs backend"
    echo "  - Check job logs: cat ${JOB_DIR}/logs/container.log"
    echo "  - Verify Plex is accessible from Docker"
    echo "  - Ensure preview targets exist in your Plex library"
    exit 1
fi
