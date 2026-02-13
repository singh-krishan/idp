#!/bin/bash

# NGINX Proxy Diagnostics Script
# This script helps diagnose why the NGINX proxy isn't working

set -e

EC2_1="13.42.36.97"
EC2_2="18.130.143.156"
SSH_KEY="$HOME/.ssh/idp-demo-key-new.pem"
DOMAIN="kris-idp.org"
TEST_SERVICE="krisacc-svc-1"

echo "========================================"
echo "NGINX Proxy Diagnostics"
echo "========================================"
echo ""

# Test 1: Check if NGINX config was deployed
echo "Test 1: Checking NGINX configuration on EC2 #1"
echo "----------------------------------------"
ssh -i "$SSH_KEY" ec2-user@"$EC2_1" << 'EOF'
echo "Checking if proxy configuration exists in NGINX config..."
if docker exec idp-frontend cat /etc/nginx/conf.d/default.conf 2>/dev/null | grep -q "Proxy deployed"; then
    echo "✅ Proxy configuration FOUND in NGINX config"
    echo ""
    echo "Proxy block:"
    docker exec idp-frontend cat /etc/nginx/conf.d/default.conf | grep -A 15 "Proxy deployed"
else
    echo "❌ Proxy configuration NOT FOUND in NGINX config"
    echo ""
    echo "Current NGINX config:"
    docker exec idp-frontend cat /etc/nginx/conf.d/default.conf
fi
EOF

echo ""
echo ""

# Test 2: Check NGINX syntax
echo "Test 2: Checking NGINX syntax"
echo "----------------------------------------"
ssh -i "$SSH_KEY" ec2-user@"$EC2_1" "docker exec idp-frontend nginx -t"

echo ""
echo ""

# Test 3: Test k3s accessibility from EC2 #1
echo "Test 3: Testing k3s connectivity from EC2 #1"
echo "----------------------------------------"
echo "Testing: http://$EC2_2:30080/$TEST_SERVICE/health"
ssh -i "$SSH_KEY" ec2-user@"$EC2_1" "curl -v -m 10 http://$EC2_2:30080/$TEST_SERVICE/health 2>&1"

echo ""
echo ""

# Test 4: Check service ingress host
echo "Test 4: Checking service ingress configuration"
echo "----------------------------------------"
echo "Checking what host the service ingress is configured for..."
kubectl get ingress -o json | jq -r '.items[] | select(.metadata.name | contains("'$TEST_SERVICE'")) | "Ingress: \(.metadata.name)\nHost: \(.spec.rules[0].host)\nPath: \(.spec.rules[0].http.paths[0].path)"'

echo ""
echo ""

# Test 5: Test from outside
echo "Test 5: Testing service from outside"
echo "----------------------------------------"
echo "Testing: https://$DOMAIN/$TEST_SERVICE/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/$TEST_SERVICE/health")
echo "HTTP Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Service is accessible!"
    curl -s "https://$DOMAIN/$TEST_SERVICE/health"
else
    echo "❌ Service is NOT accessible (expected 200, got $HTTP_CODE)"
    echo ""
    echo "Getting detailed response:"
    curl -v "https://$DOMAIN/$TEST_SERVICE/health" 2>&1 | head -30
fi

echo ""
echo ""

# Test 6: Check NGINX access logs
echo "Test 6: Checking NGINX access logs for recent requests"
echo "----------------------------------------"
ssh -i "$SSH_KEY" ec2-user@"$EC2_1" "docker logs idp-frontend --tail 20 2>&1 | grep -E '(svc|error|upstream)' || echo 'No relevant log entries found'"

echo ""
echo ""

# Test 7: Check NGINX error logs
echo "Test 7: Checking NGINX error logs"
echo "----------------------------------------"
ssh -i "$SSH_KEY" ec2-user@"$EC2_1" "docker exec idp-frontend cat /var/log/nginx/error.log 2>/dev/null | tail -20 || echo 'No error log available or no errors'"

echo ""
echo ""

echo "========================================"
echo "Diagnostics Complete"
echo "========================================"
echo ""
echo "Next Steps Based on Results:"
echo ""
echo "If Test 1 FAILED (no proxy config):"
echo "  → NGINX config wasn't uploaded or mounted correctly"
echo "  → Re-upload nginx-ssl.conf and restart container"
echo ""
echo "If Test 3 FAILED (can't reach k3s):"
echo "  → Network issue between EC2 instances"
echo "  → Check security groups allow traffic"
echo ""
echo "If Test 4 shows wrong host:"
echo "  → Service ingress still configured for old domain"
echo "  → Update service helm/values.yaml and sync ArgoCD"
echo ""
echo "If Test 5 FAILED with 404:"
echo "  → Regex pattern not matching service name"
echo "  → Or location block order issue"
echo ""
