#!/usr/bin/env bash

# Debug script for Pi Zero 2W setup troubleshooting
echo "=== Pi Zero 2W Setup Debug Script ==="
echo "Date: $(date)"
echo

# Check if we're on the right hardware
echo "1. Hardware Information:"
if [ -f /proc/cpuinfo ]; then
    echo "   CPU Model: $(grep 'Model' /proc/cpuinfo | head -1)"
    echo "   Hardware: $(grep 'Hardware' /proc/cpuinfo | head -1)"
else
    echo "   /proc/cpuinfo not found"
fi

if [ -f /proc/device-tree/model ]; then
    echo "   Device Model: $(cat /proc/device-tree/model)"
else
    echo "   /proc/device-tree/model not found"
fi
echo

# Check memory
echo "2. Memory Information:"
if command -v free >/dev/null 2>&1; then
    free -h
else
    echo "   'free' command not available"
fi
echo

# Check disk space
echo "3. Disk Space:"
if command -v df >/dev/null 2>&1; then
    df -h /
else
    echo "   'df' command not available"
fi
echo

# Check if we're running as root
echo "4. User Information:"
echo "   Current user: $(whoami)"
echo "   User ID: $(id -u)"
echo "   Groups: $(id -G)"
echo

# Check bash version
echo "5. Shell Information:"
echo "   Bash version: $BASH_VERSION"
echo "   Shell: $SHELL"
echo

# Check if git is available
echo "6. Git Information:"
if command -v git >/dev/null 2>&1; then
    echo "   Git version: $(git --version)"
else
    echo "   Git not installed"
fi
echo

# Check if Node.js is available  
echo "7. Node.js Information:"
if command -v node >/dev/null 2>&1; then
    echo "   Node.js version: $(node --version)"
else
    echo "   Node.js not installed"
fi

if command -v npm >/dev/null 2>&1; then
    echo "   NPM version: $(npm --version)"
else
    echo "   NPM not installed"
fi
echo

# Check network connectivity
echo "8. Network Information:"
if command -v ping >/dev/null 2>&1; then
    echo "   Testing connectivity to github.com..."
    if ping -c 1 github.com >/dev/null 2>&1; then
        echo "   ✅ GitHub is reachable"
    else
        echo "   ❌ GitHub is NOT reachable"
    fi
else
    echo "   'ping' command not available"
fi
echo

# Check audio devices
echo "9. Audio Information:"
if [ -d /proc/asound ]; then
    echo "   Audio cards:"
    cat /proc/asound/cards 2>/dev/null || echo "   No audio cards found"
else
    echo "   ALSA not available"
fi
echo

# Test the actual setup.sh script argument parsing
echo "10. Setup Script Test:"
if [ -f "./setup.sh" ]; then
    echo "   Testing setup.sh argument parsing..."
    
    # Test help
    if bash ./setup.sh --help >/dev/null 2>&1; then
        echo "   ✅ --help works"
    else
        echo "   ❌ --help fails"
    fi
    
    # Test swap-during-build
    if bash ./setup.sh --swap-during-build --dry-run >/dev/null 2>&1; then
        echo "   ✅ --swap-during-build works"
    else
        echo "   ❌ --swap-during-build fails"
        echo "   Trying to run it for error details:"
        bash ./setup.sh --swap-during-build --dry-run 2>&1 | head -10
    fi
else
    echo "   setup.sh not found in current directory"
fi

echo
echo "=== Debug Complete ==="
echo "Please share this output to help troubleshoot the setup script issues."
