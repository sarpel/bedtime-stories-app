# Pi Zero 2W Setup Troubleshooting Guide

## Step 1: Basic Environment Check

Run this on your Pi to check the environment:

```bash
# Check if you're on Pi Zero 2W
cat /proc/device-tree/model

# Check available memory
free -h

# Check disk space
df -h

# Check if running as root
whoami
```

## Step 2: Download and Test Debug Script

```bash
# Clone or update the repository
cd /home/pi
git clone https://github.com/sarpel/bedtime-stories-app.git
cd bedtime-stories-app

# OR if already cloned:
cd bedtime-stories-app
git pull origin main

# Make debug script executable and run it
chmod +x debug-setup.sh
bash debug-setup.sh
```

## Step 3: Manual Setup Script Testing

```bash
# Test the setup script step by step
chmod +x setup.sh

# Test help (should work without root)
bash setup.sh --help

# Test the problematic option
bash setup.sh --swap-during-build --dry-run

# If that fails, try with sudo
sudo bash setup.sh --swap-during-build --dry-run
```

## Step 4: Check Line Endings (if script fails)

If the script gives errors like `$'\r': command not found`, the line endings are wrong:

```bash
# Check file format
file setup.sh

# Fix line endings if needed
sed -i 's/\r$//' setup.sh

# Or use dos2unix if available
dos2unix setup.sh
```

## Step 5: Common Issues and Solutions

### Issue: "Unknown option: --swap-during-build"
**Solution**: The script version is outdated. Make sure you have the latest version from main branch.

### Issue: Permission denied errors
**Solution**: Run with sudo:
```bash
sudo bash setup.sh --swap-during-build
```

### Issue: Line ending errors ($'\r': command not found)
**Solution**: Fix line endings:
```bash
sed -i 's/\r$//' setup.sh
```

### Issue: Out of memory during build
**Solution**: Enable swap first:
```bash
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=512/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

## Step 6: Manual Installation (if setup.sh still fails)

```bash
# 1. Install dependencies
sudo apt update
sudo apt install -y git nodejs npm nginx

# 2. Clone and build app
cd /opt
sudo git clone https://github.com/sarpel/bedtime-stories-app.git storyapp
cd storyapp
sudo npm install
cd backend && sudo npm install && cd ..
sudo npm run build

# 3. Setup service (basic)
sudo cp backend/systemd-storyapp.service /etc/systemd/system/
sudo systemctl enable storyapp
sudo systemctl start storyapp
```

## Step 7: Get Help

If nothing works, run the debug script and share the output:

```bash
bash debug-setup.sh > debug-output.txt
cat debug-output.txt
```

Share the debug-output.txt content for further assistance.
