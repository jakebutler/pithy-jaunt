#!/usr/bin/env bash
# Bootstrap script - Downloads latest execution scripts from GitHub
# This allows updating scripts without rebuilding Docker images
#
# Environment variables:
#   SCRIPT_REPO - GitHub repo (default: jakebutler/pithy-jaunt)
#   SCRIPT_BRANCH - Branch/commit/tag (default: main)
#   SCRIPT_DISABLE_DOWNLOAD - Set to "true" to skip download and use image scripts

set -euo pipefail

# Configuration
SCRIPT_REPO="${SCRIPT_REPO:-jakebutler/pithy-jaunt}"
SCRIPT_BRANCH="${SCRIPT_BRANCH:-main}"  # Can be set to a specific commit SHA or tag
SCRIPT_DISABLE_DOWNLOAD="${SCRIPT_DISABLE_DOWNLOAD:-false}"
SCRIPT_BASE_URL="https://raw.githubusercontent.com/${SCRIPT_REPO}/${SCRIPT_BRANCH}/daytona"
SCRIPT_DIR="/app"

echo "[pj] ========================================"
echo "[pj] Bootstrap: Execution Script Loader"
echo "[pj] ========================================"

# Skip download if disabled (useful for testing or if GitHub is unavailable)
if [ "${SCRIPT_DISABLE_DOWNLOAD}" = "true" ]; then
    echo "[pj] Script download disabled, using scripts from image"
else
    echo "[pj] Repository: ${SCRIPT_REPO}"
    echo "[pj] Branch/Commit: ${SCRIPT_BRANCH}"
    echo "[pj] Base URL: ${SCRIPT_BASE_URL}"
    
    # Download scripts
    download_script() {
        local script_name=$1
        local target_path="${SCRIPT_DIR}/${script_name}"
        local url="${SCRIPT_BASE_URL}/${script_name}"
        
        echo "[pj] Downloading ${script_name}..."
        if curl -fsSL --max-time 10 -o "${target_path}" "${url}" 2>/dev/null; then
            # Verify it's not an error page (GitHub returns HTML for 404s)
            if head -1 "${target_path}" | grep -q "<!DOCTYPE html>"; then
                echo "[pj] ⚠️  ${script_name} not found at ${url}, using fallback from image"
                rm -f "${target_path}"
                return 1
            fi
            chmod +x "${target_path}" 2>/dev/null || true
            echo "[pj] ✅ Downloaded ${script_name}"
            return 0
        else
            echo "[pj] ⚠️  Failed to download ${script_name}, using fallback from image"
            return 1
        fi
    }
    
    # Download execution scripts (with fallback to image versions)
    download_script "execution.sh" || true
    download_script "agent-runner.py" || true
    download_script "system-prompt.md" || true
    download_script "system-prompt-file-generation.md" || true
    
    echo "[pj] ========================================"
    echo "[pj] Bootstrap complete"
    echo "[pj] ========================================"
fi

# Verify execution.sh exists and is executable
if [ ! -f "${SCRIPT_DIR}/execution.sh" ] || [ ! -x "${SCRIPT_DIR}/execution.sh" ]; then
    echo "[pj] ❌ ERROR: execution.sh not found or not executable"
    exit 1
fi

# Log which version we're using
echo "[pj] Using execution.sh from: $(readlink -f "${SCRIPT_DIR}/execution.sh" 2>/dev/null || echo "${SCRIPT_DIR}/execution.sh")"
echo "[pj] Execution.sh checksum: $(md5sum "${SCRIPT_DIR}/execution.sh" 2>/dev/null | cut -d' ' -f1 || echo "unknown")"

# Execute the script
exec "${SCRIPT_DIR}/execution.sh"
