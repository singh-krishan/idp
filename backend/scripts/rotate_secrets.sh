#!/bin/bash
#
# Secret Rotation Script for IDP Platform
#
# This script helps rotate sensitive credentials and secrets.
# Run this periodically (e.g., every 90 days) to maintain security.
#
# Usage: ./scripts/rotate_secrets.sh

set -e

echo "========================================"
echo "IDP Platform Secret Rotation"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env from .env.example first"
    exit 1
fi

# Create backup of current .env
BACKUP_FILE=".env.backup.$(date +%Y%m%d_%H%M%S)"
cp .env "$BACKUP_FILE"
echo -e "${GREEN}✓${NC} Created backup: $BACKUP_FILE"
echo ""

# Function to generate random secret
generate_secret() {
    openssl rand -hex 32
}

# Function to update env variable
update_env_var() {
    local var_name=$1
    local new_value=$2

    # Check if variable exists in .env
    if grep -q "^${var_name}=" .env; then
        # Update existing variable (macOS compatible)
        sed -i '' "s|^${var_name}=.*|${var_name}=${new_value}|" .env
        echo -e "${GREEN}✓${NC} Updated ${var_name}"
    else
        # Add new variable
        echo "${var_name}=${new_value}" >> .env
        echo -e "${GREEN}✓${NC} Added ${var_name}"
    fi
}

# Rotate JWT Secret Key
echo "=== JWT Secret Key ==="
echo "Rotating JWT secret will invalidate all existing user sessions."
read -p "Rotate JWT_SECRET_KEY? (yes/no): " rotate_jwt

if [ "$rotate_jwt" = "yes" ]; then
    NEW_JWT_SECRET=$(generate_secret)
    update_env_var "JWT_SECRET_KEY" "$NEW_JWT_SECRET"
    echo -e "${YELLOW}⚠${NC}  All users will need to login again"
else
    echo "Skipped JWT_SECRET_KEY rotation"
fi
echo ""

# Rotate Database Password
echo "=== Database Password ==="
echo "Rotating database password requires updating both .env and PostgreSQL."
read -p "Rotate database password? (yes/no): " rotate_db

if [ "$rotate_db" = "yes" ]; then
    echo ""
    echo "Steps to rotate database password:"
    echo "1. Generate new password: openssl rand -base64 32"
    echo "2. Update PostgreSQL password:"
    echo "   docker-compose exec postgres psql -U idp -d idp_db"
    echo "   ALTER USER idp WITH PASSWORD 'new_password';"
    echo "3. Update DATABASE_URL in .env"
    echo "4. Update docker-compose.yml POSTGRES_PASSWORD"
    echo "5. Restart services: docker-compose restart"
    echo ""
    echo -e "${YELLOW}Manual steps required - see above${NC}"
else
    echo "Skipped database password rotation"
fi
echo ""

# GitHub Token
echo "=== GitHub Token ==="
echo "GitHub tokens should be rotated from GitHub Settings:"
echo "https://github.com/settings/tokens"
read -p "Have you rotated your GitHub token? (yes/no): " rotated_github

if [ "$rotated_github" = "yes" ]; then
    read -p "Enter new GitHub token: " new_github_token
    update_env_var "GITHUB_TOKEN" "$new_github_token"
else
    echo -e "${YELLOW}⚠${NC}  Remember to rotate GitHub token periodically"
fi
echo ""

# ArgoCD Password
echo "=== ArgoCD Password ==="
echo "ArgoCD password should be rotated from ArgoCD UI or CLI:"
echo "argocd account update-password --account admin --current-password <old> --new-password <new>"
read -p "Have you rotated your ArgoCD password? (yes/no): " rotated_argocd

if [ "$rotated_argocd" = "yes" ]; then
    read -sp "Enter new ArgoCD password: " new_argocd_password
    echo ""
    update_env_var "ARGOCD_PASSWORD" "$new_argocd_password"
else
    echo -e "${YELLOW}⚠${NC}  Remember to rotate ArgoCD password periodically"
fi
echo ""

# Summary
echo "========================================"
echo "Secret Rotation Summary"
echo "========================================"
echo ""
echo "✓ Backup created: $BACKUP_FILE"
echo "✓ .env file updated"
echo ""
echo "Next steps:"
echo "1. Review changes: diff .env $BACKUP_FILE"
echo "2. Update docker-compose.yml if needed"
echo "3. Restart services: docker-compose restart"
echo "4. Test login and functionality"
echo "5. Update any CI/CD pipelines with new secrets"
echo "6. Update production secrets (AWS Secrets Manager, Vault, etc.)"
echo ""
echo -e "${GREEN}Secret rotation completed!${NC}"
echo ""
echo "⚠️  Keep backup file secure and delete after verification:"
echo "   rm $BACKUP_FILE"
