#!/bin/bash

# Test service accessibility through kris-idp.org
# Use this after completing the NGINX proxy deployment

DOMAIN="kris-idp.org"
SERVICES=("krisacc-svc-1" "krisacc-svc-2" "krisacc-svc-3" "krisacc-svc-4")

echo "=========================================="
echo "Testing Service Accessibility"
echo "=========================================="
echo ""
echo "Domain: https://${DOMAIN}"
echo "Services: ${#SERVICES[@]}"
echo ""

# Test IDP Platform First
echo "1. Testing IDP Platform Components"
echo "----------------------------------------"

echo -n "  Frontend (/) ... "
if curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/" | grep -q "200"; then
    echo "✅ OK"
else
    echo "❌ FAILED"
fi

echo -n "  Backend API (/api/v1/projects) ... "
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}/api/v1/projects")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "✅ OK (HTTP $HTTP_CODE)"
else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
fi

echo ""

# Test Deployed Services
echo "2. Testing Deployed Services"
echo "----------------------------------------"

SUCCESS_COUNT=0
FAILED_SERVICES=()

for SERVICE in "${SERVICES[@]}"; do
    URL="https://${DOMAIN}/${SERVICE}/health"
    echo -n "  ${SERVICE} ... "

    # Get HTTP status code and response body
    RESPONSE=$(curl -s -w "\n%{http_code}" "$URL")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
    BODY=$(echo "$RESPONSE" | head -n -1)

    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ OK"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))

        # Show response body if verbose
        if [ "$1" = "-v" ] || [ "$1" = "--verbose" ]; then
            echo "      Response: $BODY"
        fi
    else
        echo "❌ FAILED (HTTP $HTTP_CODE)"
        FAILED_SERVICES+=("$SERVICE")

        # Show error details
        if [ -n "$BODY" ]; then
            echo "      Error: $BODY"
        fi
    fi
done

echo ""
echo "=========================================="
echo "Test Results"
echo "=========================================="
echo ""
echo "✅ Successful: $SUCCESS_COUNT / ${#SERVICES[@]} services"

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    echo ""
    echo "❌ Failed Services:"
    for FAILED in "${FAILED_SERVICES[@]}"; do
        echo "  - $FAILED"
    done
    echo ""
    echo "Troubleshooting:"
    echo "  1. Check NGINX config deployed: docker exec idp-frontend nginx -t"
    echo "  2. Check service ingress host: kubectl get ingress"
    echo "  3. Check service pods running: kubectl get pods"
    echo "  4. Check ArgoCD sync status: argocd app list"
    echo ""
    echo "See DEPLOY_NGINX_PROXY.md for detailed troubleshooting."
    exit 1
else
    echo ""
    echo "🎉 All services are accessible!"
    echo ""
    echo "Service URLs:"
    for SERVICE in "${SERVICES[@]}"; do
        echo "  - https://${DOMAIN}/${SERVICE}/"
    done
    echo ""
    exit 0
fi
