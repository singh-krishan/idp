# Dynatrace Setup

This document describes how to set up Dynatrace monitoring for the IDP platform.

## Option 1: Full Dynatrace Integration (Recommended for Production)

### Prerequisites
- Dynatrace SaaS tenant (or Managed environment)
- Dynatrace API token with required permissions
- Dynatrace PaaS token

### Installation Steps

1. **Install Dynatrace Operator**

```bash
# Add Dynatrace Helm repository
helm repo add dynatrace https://raw.githubusercontent.com/Dynatrace/dynatrace-operator/main/config/helm/repos/stable

# Create dynatrace namespace
kubectl create namespace dynatrace

# Install the operator
helm install dynatrace-operator dynatrace/dynatrace-operator \
  -n dynatrace \
  --create-namespace
```

2. **Create DynaKube Resource**

Create a file `dynakube.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dynakube
  namespace: dynatrace
type: Opaque
stringData:
  apiToken: YOUR_API_TOKEN
  dataIngestToken: YOUR_DATA_INGEST_TOKEN
---
apiVersion: dynatrace.com/v1beta1
kind: DynaKube
metadata:
  name: dynakube
  namespace: dynatrace
spec:
  apiUrl: https://YOUR_TENANT.live.dynatrace.com/api
  oneAgent:
    classicFullStack:
      tolerations:
        - effect: NoSchedule
          key: node-role.kubernetes.io/master
          operator: Exists
  activeGate:
    capabilities:
      - routing
      - kubernetes-monitoring
```

Apply it:

```bash
kubectl apply -f dynakube.yaml
```

3. **Verify Installation**

```bash
kubectl -n dynatrace get pods
kubectl -n dynatrace logs -l app.kubernetes.io/name=dynatrace-operator
```

## Option 2: Prometheus + Grafana (Local Development)

For local development without Dynatrace, use Prometheus and Grafana:

```bash
# Install kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Default credentials:
# Username: admin
# Password: prom-operator
```

## Automatic Service Discovery

Once installed, Dynatrace OneAgent will automatically:
- Discover all pods in the Kubernetes cluster
- Inject monitoring into containers
- Collect metrics, logs, and traces
- Provide full-stack visibility

Services created via the IDP platform will be automatically monitored with no additional configuration needed.

## Monitoring Annotations

The generated Helm charts include Prometheus-compatible annotations:

```yaml
podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8000"
  prometheus.io/path: "/metrics"
```

These annotations work with both Dynatrace and Prometheus.

## Verification

After deploying a service via the IDP:

1. Check Dynatrace UI for the new service
2. Verify metrics are being collected
3. Set up alerts and dashboards as needed

## Troubleshooting

- **OneAgent not injecting**: Check namespace annotations
- **No metrics**: Verify pod annotations are correct
- **Connection issues**: Check API tokens and network policies
