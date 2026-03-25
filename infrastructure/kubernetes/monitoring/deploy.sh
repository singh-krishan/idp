#!/bin/bash

# Deploy Prometheus & Grafana Monitoring Stack to Kubernetes
# This script deploys the monitoring stack with HTTPS ingress

set -e

echo "=========================================="
echo "Deploying Monitoring Stack to Kubernetes"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}Error: Cannot connect to Kubernetes cluster${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Creating monitoring namespace${NC}"
kubectl apply -f namespace.yaml

echo ""
echo -e "${YELLOW}Step 2: Deploying Prometheus${NC}"
kubectl apply -f prometheus/rbac.yaml
kubectl apply -f prometheus/configmap.yaml
kubectl apply -f prometheus/deployment.yaml
kubectl apply -f prometheus/service.yaml
kubectl apply -f prometheus/ingress.yaml

echo ""
echo -e "${YELLOW}Step 3: Deploying Grafana${NC}"
kubectl apply -f grafana/secret.yaml
kubectl apply -f grafana/configmap-datasource.yaml
kubectl apply -f grafana/configmap-dashboards-provider.yaml
kubectl apply -f grafana/configmap-dashboard-idp.yaml
kubectl apply -f grafana/deployment.yaml
kubectl apply -f grafana/service.yaml
kubectl apply -f grafana/ingress.yaml

echo ""
echo -e "${GREEN}✓ Monitoring stack deployed successfully!${NC}"

echo ""
echo "=========================================="
echo "Waiting for pods to be ready..."
echo "=========================================="

# Wait for Prometheus
echo -n "Waiting for Prometheus pod..."
kubectl wait --for=condition=ready pod -l app=prometheus -n monitoring --timeout=300s
echo -e " ${GREEN}✓${NC}"

# Wait for Grafana
echo -n "Waiting for Grafana pod..."
kubectl wait --for=condition=ready pod -l app=grafana -n monitoring --timeout=300s
echo -e " ${GREEN}✓${NC}"

echo ""
echo "=========================================="
echo "Deployment Status"
echo "=========================================="

echo ""
echo -e "${YELLOW}Pods:${NC}"
kubectl get pods -n monitoring

echo ""
echo -e "${YELLOW}Services:${NC}"
kubectl get svc -n monitoring

echo ""
echo -e "${YELLOW}Ingress:${NC}"
kubectl get ingress -n monitoring

echo ""
echo "=========================================="
echo "Important Next Steps"
echo "=========================================="

echo ""
echo -e "${YELLOW}1. Update Prometheus ConfigMap with EC2 Private IP:${NC}"
echo "   Get EC2 private IP:"
echo "   ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 \"hostname -I | awk '{print \\\$1}'\""
echo ""
echo "   Then edit: prometheus/configmap.yaml"
echo "   Replace: <EC2_PRIVATE_IP> with actual IP"
echo "   Apply: kubectl apply -f prometheus/configmap.yaml"
echo "   Restart: kubectl rollout restart deployment/prometheus -n monitoring"

echo ""
echo -e "${YELLOW}2. Update Grafana Admin Password:${NC}"
echo "   Edit: grafana/secret.yaml"
echo "   Change: admin-password to a secure value"
echo "   Apply: kubectl apply -f grafana/secret.yaml"
echo "   Restart: kubectl rollout restart deployment/grafana -n monitoring"

echo ""
echo -e "${YELLOW}3. Wait for TLS Certificate:${NC}"
echo "   Check status: kubectl get certificate -n monitoring"
echo "   View details: kubectl describe certificate my-idp-tls -n monitoring"

echo ""
echo "=========================================="
echo "Access URLs (after TLS setup)"
echo "=========================================="

echo ""
echo -e "${GREEN}Prometheus:${NC} https://my-idp.duckdns.org/prometheus"
echo -e "${GREEN}Grafana:${NC}    https://my-idp.duckdns.org/grafana"
echo -e "  Username: admin"
echo -e "  Password: (value from grafana/secret.yaml)"

echo ""
echo "=========================================="
echo "Local Port-Forward (for testing)"
echo "=========================================="

echo ""
echo "Prometheus: kubectl port-forward -n monitoring svc/prometheus 9090:9090"
echo "Grafana:    kubectl port-forward -n monitoring svc/grafana 3000:3000"

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
