#!/bin/bash

# Update existing services to use kris-idp.org instead of kris-idp.duckdns.org
# This script automates Phase 2 of the NGINX proxy deployment

set -e  # Exit on any error

GITHUB_ORG="krisaccsyn"
SERVICES=("krisacc-svc-1" "krisacc-svc-2" "krisacc-svc-3" "krisacc-svc-4")
OLD_HOST="kris-idp.duckdns.org"
NEW_HOST="kris-idp.org"

echo "=================================="
echo "Update Service Ingress Hosts"
echo "=================================="
echo ""
echo "This script will update 4 services to use kris-idp.org"
echo "Services: ${SERVICES[@]}"
echo ""
echo "Prerequisites:"
echo "  - GitHub CLI (gh) installed and authenticated"
echo "  - Write access to repositories"
echo ""

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "❌ Error: GitHub CLI (gh) is not installed"
    echo ""
    echo "Install with:"
    echo "  brew install gh"
    echo ""
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Error: Not authenticated with GitHub"
    echo ""
    echo "Authenticate with:"
    echo "  gh auth login"
    echo ""
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""
read -p "Continue with updates? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Starting updates..."
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

SUCCESS_COUNT=0
FAILED_SERVICES=()

for SERVICE in "${SERVICES[@]}"; do
    echo "----------------------------------------"
    echo "Processing: $SERVICE"
    echo "----------------------------------------"

    REPO="${GITHUB_ORG}/${SERVICE}"
    SERVICE_DIR="${TEMP_DIR}/${SERVICE}"

    # Clone the repository
    echo "  → Cloning repository..."
    if ! gh repo clone "$REPO" "$SERVICE_DIR" -- --quiet 2>/dev/null; then
        echo "  ❌ Failed to clone repository"
        FAILED_SERVICES+=("$SERVICE (clone failed)")
        continue
    fi

    cd "$SERVICE_DIR"

    # Check if helm/values.yaml exists
    if [ ! -f "helm/values.yaml" ]; then
        echo "  ❌ helm/values.yaml not found"
        FAILED_SERVICES+=("$SERVICE (no helm/values.yaml)")
        continue
    fi

    # Check current host value
    CURRENT_HOST=$(grep "^  host:" helm/values.yaml | awk '{print $2}' || echo "")
    echo "  → Current host: $CURRENT_HOST"

    if [ "$CURRENT_HOST" = "$NEW_HOST" ]; then
        echo "  ✅ Already using $NEW_HOST (skipping)"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        continue
    fi

    # Update the host
    echo "  → Updating host to: $NEW_HOST"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|host: ${OLD_HOST}|host: ${NEW_HOST}|g" helm/values.yaml
    else
        # Linux
        sed -i "s|host: ${OLD_HOST}|host: ${NEW_HOST}|g" helm/values.yaml
    fi

    # Verify the change
    NEW_HOST_CHECK=$(grep "^  host:" helm/values.yaml | awk '{print $2}' || echo "")
    if [ "$NEW_HOST_CHECK" != "$NEW_HOST" ]; then
        echo "  ❌ Update verification failed"
        FAILED_SERVICES+=("$SERVICE (update failed)")
        continue
    fi

    # Commit and push
    echo "  → Committing changes..."
    git add helm/values.yaml
    git commit -m "Update ingress host to kris-idp.org" --quiet

    echo "  → Pushing to GitHub..."
    if git push --quiet; then
        echo "  ✅ Successfully updated $SERVICE"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "  ❌ Failed to push changes"
        FAILED_SERVICES+=("$SERVICE (push failed)")
    fi

    echo ""
done

echo "=========================================="
echo "Update Summary"
echo "=========================================="
echo ""
echo "✅ Successfully updated: $SUCCESS_COUNT / ${#SERVICES[@]} services"

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo ""
    echo "❌ Failed services:"
    for FAILED in "${FAILED_SERVICES[@]}"; do
        echo "  - $FAILED"
    done
    echo ""
    echo "You'll need to update these manually via GitHub web UI."
fi

echo ""
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Sync services in ArgoCD:"
echo "   argocd app sync krisacc-svc-1"
echo "   argocd app sync krisacc-svc-2"
echo "   argocd app sync krisacc-svc-3"
echo "   argocd app sync krisacc-svc-4"
echo ""
echo "2. Test service accessibility:"
echo "   curl https://kris-idp.org/krisacc-svc-1/health"
echo "   curl https://kris-idp.org/krisacc-svc-2/health"
echo "   curl https://kris-idp.org/krisacc-svc-3/health"
echo "   curl https://kris-idp.org/krisacc-svc-4/health"
echo ""
echo "See DEPLOY_NGINX_PROXY.md for full deployment guide."
echo ""
