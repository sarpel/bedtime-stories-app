#!/bin/bash

# Production Deployment Script
# Usage: ./scripts/deploy-production.sh

set -euo pipefail

# Configuration
APP_NAME="bedtime-stories"
DEPLOY_USER="deploy"
SERVER_HOST="${SERVER_HOST:-your-production-server.com}"
DEPLOY_PATH="/opt/${APP_NAME}"
BACKUP_PATH="/opt/${APP_NAME}/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Pre-deployment checks
pre_deploy_checks() {
    log "Running pre-deployment checks..."

    # Check if we're on the main branch
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "main" ]; then
        error "You must be on the main branch to deploy to production. Current branch: $current_branch"
    fi

    # Check if working directory is clean
    if [ -n "$(git status --porcelain)" ]; then
        error "Working directory is not clean. Please commit or stash your changes."
    fi

    # Run tests
    log "Running tests..."
    npm run test || error "Tests failed"

    # Security audit
    log "Running security audit..."
    npm run security:audit || warn "Security audit found issues"

    # Lint check
    log "Running linting..."
    npm run lint || error "Linting failed"

    log "Pre-deployment checks passed ✓"
}

# Build application
build_app() {
    log "Building application for production..."

    # Clean previous build
    rm -rf dist/

    # Install dependencies
    npm ci --only=production
    cd backend && npm ci --only=production && cd ..

    # Build frontend
    npm run build:production || error "Build failed"

    log "Application build completed ✓"
}

# Create deployment package
create_package() {
    log "Creating deployment package..."

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local package_name="${APP_NAME}_${timestamp}.tar.gz"

    # Create package
    tar -czf "$package_name" \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=.env \
        --exclude=*.log \
        dist/ backend/ package.json docker-compose.yml nginx.conf

    echo "$package_name"
}

# Deploy to server
deploy_to_server() {
    local package_name=$1

    log "Deploying to production server..."

    # Upload package
    scp "$package_name" "${DEPLOY_USER}@${SERVER_HOST}:/tmp/"

    # Deploy on server
    ssh "${DEPLOY_USER}@${SERVER_HOST}" << EOF
        set -euo pipefail

        # Create backup of current deployment
        if [ -d "${DEPLOY_PATH}/current" ]; then
            sudo cp -r "${DEPLOY_PATH}/current" "${BACKUP_PATH}/backup_$(date +%Y%m%d_%H%M%S)" || true
        fi

        # Extract new version
        cd /tmp
        tar -xzf "$package_name"

        # Stop services
        cd "${DEPLOY_PATH}"
        sudo docker-compose down || true

        # Move new version
        sudo rm -rf "${DEPLOY_PATH}/next" || true
        sudo mkdir -p "${DEPLOY_PATH}/next"
        sudo cp -r /tmp/dist "${DEPLOY_PATH}/next/"
        sudo cp -r /tmp/backend "${DEPLOY_PATH}/next/"
        sudo cp /tmp/package.json "${DEPLOY_PATH}/next/"
        sudo cp /tmp/docker-compose.yml "${DEPLOY_PATH}/next/"
        sudo cp /tmp/nginx.conf "${DEPLOY_PATH}/next/"

        # Preserve data directories
        if [ -d "${DEPLOY_PATH}/current/backend/database" ]; then
            sudo cp -r "${DEPLOY_PATH}/current/backend/database" "${DEPLOY_PATH}/next/backend/"
        fi
        if [ -d "${DEPLOY_PATH}/current/backend/audio" ]; then
            sudo cp -r "${DEPLOY_PATH}/current/backend/audio" "${DEPLOY_PATH}/next/backend/"
        fi

        # Atomic switch
        sudo mv "${DEPLOY_PATH}/current" "${DEPLOY_PATH}/previous" || true
        sudo mv "${DEPLOY_PATH}/next" "${DEPLOY_PATH}/current"

        # Start services
        cd "${DEPLOY_PATH}/current"
        sudo docker-compose up -d --build

        # Wait for health check
        sleep 30
    if curl -f http://localhost/health > /dev/null 2>&1; then
            echo "Deployment successful - health check passed"
        else
            echo "Health check failed - rolling back"
            sudo docker-compose down
            sudo mv "${DEPLOY_PATH}/current" "${DEPLOY_PATH}/failed"
            sudo mv "${DEPLOY_PATH}/previous" "${DEPLOY_PATH}/current"
            sudo docker-compose up -d
            exit 1
        fi

        # Cleanup
        rm -f "/tmp/$package_name"
        sudo rm -rf "${DEPLOY_PATH}/previous" || true
EOF

    # Cleanup local package
    rm -f "$package_name"

    log "Deployment completed successfully ✓"
}

# Health check
post_deploy_check() {
    log "Running post-deployment health check..."

    # Wait a bit for services to stabilize
    sleep 10

    # Check if application is responding
    if curl -f "http://${SERVER_HOST}/health" > /dev/null 2>&1; then
        log "Production health check passed ✓"
    else
        error "Production health check failed"
    fi
}

# Main deployment process
main() {
    log "Starting production deployment for ${APP_NAME}..."

    pre_deploy_checks
    build_app

    local package_name
    package_name=$(create_package)

    deploy_to_server "$package_name"
    post_deploy_check

    log "Production deployment completed successfully! 🚀"
    log "Application is available at: http://${SERVER_HOST}"
}

# Run main function
main "$@"
