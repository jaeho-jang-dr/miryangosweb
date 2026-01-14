#!/bin/bash
# ===================================
# Miryang Orthopedic Web - Claude CLI Auto Start (Git Bash)
# ===================================

echo ""
echo "========================================"
echo " Miryang Orthopedic Web - Claude Setup"
echo "========================================"
echo ""

# 1. Change to project directory
cd "/d/Entertainments/DevEnvironment/miryangosweb"
echo "[1/4] Changed to project directory: $(pwd)"

# 2. Check if antigravity-claude-proxy is running
echo "[2/4] Checking antigravity-claude-proxy..."
if netstat -ano | grep -q ":9097"; then
    echo "      Proxy already running on port 9097"
else
    echo "      Starting antigravity-claude-proxy on port 9097..."
    (antigravity-claude-proxy &)
    sleep 3
    echo "      Proxy started successfully"
fi

# 3. Verify environment
echo "[3/4] Verifying environment..."
if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "      WARNING: ANTHROPIC_API_KEY not set"
    echo "      Please set it in your environment variables"
else
    echo "      ANTHROPIC_API_KEY is set"
fi

# 4. Start Claude CLI
echo "[4/4] Starting Claude CLI..."
echo ""
echo "========================================"
echo " Claude CLI Ready"
echo "========================================"
echo ""
echo "Project: Miryang Orthopedic Web"
echo "Path: /d/Entertainments/DevEnvironment/miryangosweb"
echo "Proxy: http://localhost:9097"
echo ""
echo "Starting Claude..."
echo ""

# Start Claude CLI
claude
