#!/bin/bash

# Verification script for monitoring stack deployment
# Checks that all required files exist and validates YAML syntax

set -e

echo "=========================================="
echo "Monitoring Stack Verification"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Track errors
ERRORS=0

echo ""
echo -e "${YELLOW}Checking required files...${NC}"

# List of required files
FILES=(
    "namespace.yaml"
    "prometheus/rbac.yaml"
    "prometheus/configmap.yaml"
    "prometheus/deployment.yaml"
    "prometheus/service.yaml"
    "prometheus/ingress.yaml"
    "grafana/secret.yaml"
    "grafana/configmap-datasource.yaml"
    "grafana/configmap-dashboards-provider.yaml"
    "grafana/configmap-dashboard-idp.yaml"
    "grafana/deployment.yaml"
    "grafana/service.yaml"
    "grafana/ingress.yaml"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (MISSING)"
        ERRORS=$((ERRORS + 1))
    fi
done

echo ""
echo -e "${YELLOW}Validating YAML syntax...${NC}"

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        if kubectl apply --dry-run=client -f "$file" &> /dev/null; then
            echo -e "${GREEN}✓${NC} $file (valid)"
        else
            echo -e "${RED}✗${NC} $file (invalid YAML)"
            ERRORS=$((ERRORS + 1))
        fi
    fi
done

echo ""
echo -e "${YELLOW}Checking for TODOs in configuration...${NC}"

# Check for placeholder values that need to be updated
if grep -q "<EC2_PRIVATE_IP>" prometheus/configmap.yaml 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC} Prometheus ConfigMap contains <EC2_PRIVATE_IP> placeholder"
    echo "   Update with: ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \"hostname -I\""
fi

if grep -q "changeme-secure-password" grafana/secret.yaml 2>/dev/null; then
    echo -e "${YELLOW}⚠${NC} Grafana Secret contains default password"
    echo "   Update grafana/secret.yaml with a strong password"
fi

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Ready to deploy:"
    echo "  bash deploy.sh"
else
    echo -e "${RED}✗ Found $ERRORS error(s)${NC}"
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi
echo "=========================================="
