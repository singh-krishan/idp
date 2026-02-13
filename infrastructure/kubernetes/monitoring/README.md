# Monitoring Stack for IDP Platform

Prometheus and Grafana deployment for Kubernetes with HTTPS ingress.

## Quick Start

```bash
# 1. Update configuration
# - Set EC2 private IP in prometheus/configmap.yaml
# - Set Grafana password in grafana/secret.yaml

# 2. Deploy
bash deploy.sh

# 3. Access
# - Prometheus: https://my-idp.duckdns.org/prometheus
# - Grafana: https://my-idp.duckdns.org/grafana
```

## Directory Structure

```
monitoring/
├── README.md                                   # This file
├── DEPLOYMENT.md                               # Comprehensive deployment guide
├── deploy.sh                                   # Automated deployment script
├── namespace.yaml                              # Monitoring namespace
├── prometheus/
│   ├── rbac.yaml                              # ServiceAccount + ClusterRole
│   ├── configmap.yaml                         # Prometheus configuration
│   ├── deployment.yaml                        # Prometheus deployment
│   ├── service.yaml                           # Prometheus ClusterIP service
│   └── ingress.yaml                           # HTTPS ingress (/prometheus)
└── grafana/
    ├── secret.yaml                            # Admin credentials
    ├── configmap-datasource.yaml              # Prometheus datasource
    ├── configmap-dashboards-provider.yaml     # Dashboard auto-loader
    ├── configmap-dashboard-idp.yaml           # IDP Platform dashboard
    ├── deployment.yaml                        # Grafana deployment
    ├── service.yaml                           # Grafana ClusterIP service
    └── ingress.yaml                           # HTTPS ingress (/grafana)
```

## Features

### Prometheus
- **Auto-discovery**: Kubernetes pods with `prometheus.io/scrape=true` annotation
- **Backend metrics**: Scrapes IDP backend running on EC2
- **HTTPS access**: Available at https://my-idp.duckdns.org/prometheus
- **7-day retention**: Configurable data retention period
- **RBAC**: Proper Kubernetes permissions for service discovery

### Grafana
- **Pre-configured datasource**: Prometheus automatically connected
- **IDP dashboard**: Pre-loaded dashboard with platform metrics
- **HTTPS access**: Available at https://my-idp.duckdns.org/grafana
- **Sub-path routing**: Runs under `/grafana` path with proper rewrites
- **Auto-loading**: Dashboards automatically provisioned from ConfigMaps

## Metrics Collected

### IDP Backend Metrics
- `http_requests_total` - Total HTTP requests by method, path, status
- `http_request_duration_seconds` - Request latency histogram
- `project_creation_total` - Project creation attempts by status
- `project_creation_duration_seconds` - Project creation duration
- `background_tasks_active` - Number of active background tasks
- `external_api_calls_total` - External API calls (GitHub, ArgoCD)
- `external_api_call_duration_seconds` - External API latency

### Kubernetes Metrics (Auto-discovered)
- Any pod with `prometheus.io/scrape=true` annotation
- Custom metrics from deployed microservices
- Service-level metrics

## Configuration

### Before Deployment

**1. Prometheus Backend Scraping**

Edit `prometheus/configmap.yaml`:
```yaml
- job_name: 'idp-backend'
  static_configs:
    - targets: ['<EC2_PRIVATE_IP>:8000']  # Replace with actual EC2 private IP
```

Get EC2 IP:
```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 "hostname -I | awk '{print \$1}'"
```

**2. Grafana Admin Password**

Edit `grafana/secret.yaml`:
```yaml
stringData:
  admin-password: "your-strong-password-here"  # Change this
```

### After Deployment

Update configurations:
```bash
# Update Prometheus config
kubectl apply -f prometheus/configmap.yaml
kubectl rollout restart deployment/prometheus -n monitoring

# Update Grafana password
kubectl apply -f grafana/secret.yaml
kubectl rollout restart deployment/grafana -n monitoring

# Add new dashboard
kubectl apply -f grafana/configmap-dashboard-custom.yaml
kubectl rollout restart deployment/grafana -n monitoring
```

## Access Methods

### HTTPS (Production)

After TLS certificate is provisioned:
- Prometheus: https://my-idp.duckdns.org/prometheus
- Grafana: https://my-idp.duckdns.org/grafana (admin / password-from-secret)

### Port-Forward (Local Testing)

```bash
# Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open http://localhost:9090

# Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Open http://localhost:3000
```

## Verification Commands

```bash
# Check pod status
kubectl get pods -n monitoring

# View logs
kubectl logs -n monitoring -l app=prometheus
kubectl logs -n monitoring -l app=grafana

# Check ingress
kubectl get ingress -n monitoring

# Check TLS certificate
kubectl get certificate -n monitoring
kubectl describe certificate my-idp-tls -n monitoring

# Check Prometheus targets (port-forward first)
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090/targets
```

## Troubleshooting

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive troubleshooting guide.

Quick checks:
```bash
# Prometheus not scraping backend?
kubectl exec -n monitoring -it deployment/prometheus -- wget -O- http://<EC2_IP>:8000/metrics

# Grafana datasource issues?
kubectl exec -n monitoring -it deployment/grafana -- wget -O- http://prometheus.monitoring.svc.cluster.local:9090/-/healthy

# TLS certificate problems?
kubectl describe certificate my-idp-tls -n monitoring
kubectl logs -n cert-manager -l app=cert-manager

# Ingress routing issues?
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

## Annotations for Auto-Discovery

To have your deployed services auto-discovered by Prometheus, add these annotations to your pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8000"        # Port exposing /metrics
        prometheus.io/path: "/metrics"    # Optional, defaults to /metrics
```

## Customization

### Add Custom Dashboard

1. Create dashboard in Grafana UI or export from existing
2. Save JSON to `grafana/configmap-dashboard-custom.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-custom
  namespace: monitoring
  labels:
    app: grafana
    grafana_dashboard: "1"
data:
  custom-dashboard.json: |
    { ... dashboard JSON ... }
```

3. Apply and restart:
```bash
kubectl apply -f grafana/configmap-dashboard-custom.yaml
kubectl rollout restart deployment/grafana -n monitoring
```

### Add Persistent Storage

Replace `emptyDir` with PVC in deployments for data persistence across pod restarts.

### Increase Retention

Edit `prometheus/deployment.yaml`:
```yaml
args:
  - '--storage.tsdb.retention.time=30d'  # Default: 7d
```

## Cleanup

```bash
# Remove entire monitoring stack
kubectl delete namespace monitoring
```

## Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Full deployment guide with troubleshooting
- Main IDP docs: [../../README.md](../../README.md)
- Backend metrics implementation: [../../../backend/app/main.py](../../../backend/app/main.py)

## Support

For issues:
1. Check [DEPLOYMENT.md](DEPLOYMENT.md) troubleshooting section
2. Review pod logs: `kubectl logs -n monitoring <pod-name>`
3. Check Kubernetes events: `kubectl get events -n monitoring`
