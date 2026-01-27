#!/bin/bash
set -e

# Get script directory and navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
cd "$PROJECT_ROOT"

echo "Setting up IDP Platform infrastructure..."
echo "Project root: $PROJECT_ROOT"
echo ""

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Error: docker is required but not installed." >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "Error: kubectl is required but not installed." >&2; exit 1; }
command -v kind >/dev/null 2>&1 || { echo "Error: kind is required but not installed." >&2; exit 1; }

# Create kind cluster
echo "Creating kind cluster..."
if kind get clusters | grep -q "idp-cluster"; then
    echo "Cluster 'idp-cluster' already exists. Skipping creation."
else
    kind create cluster --config infrastructure/kind-config.yaml
fi

echo ""
echo "Installing ingress controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

echo "Waiting for ingress controller to be ready..."
echo "(This may take 30-60 seconds...)"
sleep 10  # Give time for pods to be created

# Wait for the deployment to be available first
kubectl wait --namespace ingress-nginx \
  --for=condition=available \
  --timeout=180s \
  deployment/ingress-nginx-controller 2>/dev/null || {
    echo "Waiting for ingress controller deployment..."
    sleep 20
    kubectl wait --namespace ingress-nginx \
      --for=condition=available \
      --timeout=180s \
      deployment/ingress-nginx-controller
  }

echo ""
echo "Installing ArgoCD..."
bash infrastructure/argocd/install.sh

echo ""
echo "=========================================="
echo "Infrastructure setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start port-forward for ArgoCD:"
echo "   kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo ""
echo "2. Get ArgoCD admin password:"
echo "   kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\" | base64 -d"
echo ""
echo "3. Update backend/.env with the ArgoCD password"
echo ""
echo "4. Start the IDP platform:"
echo "   docker-compose up"
echo ""
