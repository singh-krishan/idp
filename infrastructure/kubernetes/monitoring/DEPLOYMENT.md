# Prometheus & Grafana Deployment Guide

This guide walks through deploying Prometheus and Grafana to Kubernetes with HTTPS ingress access.

## Prerequisites

Before deploying, ensure you have:

1. Kubernetes cluster running (kind cluster via `infrastructure/setup-cluster.sh`)
2. NGINX ingress controller installed
3. cert-manager installed with Let's Encrypt ClusterIssuer
4. kubectl configured to access the cluster
5. Backend running on EC2 (or update scrape config for different setup)

## Architecture

```
HTTPS Ingress (my-idp.duckdns.org)
    ├── /prometheus → Prometheus UI (port 9090)
    └── /grafana → Grafana UI (port 3000)
        └── Datasource → Prometheus Service
            └── Scrapes:
                ├── IDP Backend (Docker Compose on EC2)
                └── Kubernetes Pods (auto-discovery)
```

## Pre-Deployment Configuration

### 1. Get EC2 Private IP

The backend runs in Docker Compose on EC2, so Prometheus needs the EC2 private IP to scrape metrics:

```bash
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 "hostname -I | awk '{print \$1}'"
```

Example output: `172.31.42.123`

### 2. Update Prometheus ConfigMap

Edit `prometheus/configmap.yaml`:

```yaml
# Find this section:
- job_name: 'idp-backend'
  static_configs:
    - targets: ['<EC2_PRIVATE_IP>:8000']  # Replace with actual IP
```

Replace `<EC2_PRIVATE_IP>` with the actual IP from step 1.

### 3. Set Grafana Admin Password

Edit `grafana/secret.yaml`:

```yaml
stringData:
  admin-password: "your-strong-password-here"  # Change this!
```

Use a strong password. This will be the password for the `admin` user.

## Deployment

### Option 1: Automated Deployment (Recommended)

```bash
cd infrastructure/kubernetes/monitoring
bash deploy.sh
```

The script will:
- Create the monitoring namespace
- Deploy Prometheus with RBAC, ConfigMap, Deployment, Service, Ingress
- Deploy Grafana with Secret, ConfigMaps, Deployment, Service, Ingress
- Wait for pods to be ready
- Show deployment status and next steps

### Option 2: Manual Deployment

```bash
cd infrastructure/kubernetes/monitoring

# Create namespace
kubectl apply -f namespace.yaml

# Deploy Prometheus
kubectl apply -f prometheus/rbac.yaml
kubectl apply -f prometheus/configmap.yaml
kubectl apply -f prometheus/deployment.yaml
kubectl apply -f prometheus/service.yaml
kubectl apply -f prometheus/ingress.yaml

# Deploy Grafana
kubectl apply -f grafana/secret.yaml
kubectl apply -f grafana/configmap-datasource.yaml
kubectl apply -f grafana/configmap-dashboards-provider.yaml
kubectl apply -f grafana/configmap-dashboard-idp.yaml
kubectl apply -f grafana/deployment.yaml
kubectl apply -f grafana/service.yaml
kubectl apply -f grafana/ingress.yaml
```

## Verification

### 1. Check Pod Status

```bash
kubectl get pods -n monitoring

# Expected output:
# NAME                         READY   STATUS    RESTARTS   AGE
# prometheus-xxxxxxxxx-xxxxx   1/1     Running   0          2m
# grafana-xxxxxxxxx-xxxxx      1/1     Running   0          2m
```

If pods are not ready:
```bash
kubectl describe pod -n monitoring -l app=prometheus
kubectl logs -n monitoring -l app=prometheus
```

### 2. Check Services

```bash
kubectl get svc -n monitoring

# Expected output:
# NAME         TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
# prometheus   ClusterIP   10.96.xxx.xxx   <none>        9090/TCP   2m
# grafana      ClusterIP   10.96.xxx.xxx   <none>        3000/TCP   2m
```

### 3. Check Ingress

```bash
kubectl get ingress -n monitoring

# Expected output:
# NAME         CLASS   HOSTS                ADDRESS        PORTS     AGE
# prometheus   nginx   my-idp.duckdns.org   x.x.x.x        80, 443   2m
# grafana      nginx   my-idp.duckdns.org   x.x.x.x        80, 443   2m
```

### 4. Wait for TLS Certificate

```bash
kubectl get certificate -n monitoring

# Check status
kubectl describe certificate my-idp-tls -n monitoring
```

The certificate may take 1-2 minutes to provision via Let's Encrypt.

### 5. Test Local Access (Port-Forward)

Before HTTPS is ready, test locally:

```bash
# Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open http://localhost:9090

# Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000
# Open http://localhost:3000 (login: admin / your-password)
```

### 6. Test HTTPS Access

Once TLS certificate is ready:

```bash
# Prometheus
curl -I https://my-idp.duckdns.org/prometheus/

# Grafana
curl -I https://my-idp.duckdns.org/grafana/

# Open in browser
open https://my-idp.duckdns.org/prometheus
open https://my-idp.duckdns.org/grafana
```

## Verify Metrics Collection

### Check Prometheus Targets

1. Open Prometheus UI: https://my-idp.duckdns.org/prometheus
2. Go to Status → Targets
3. Verify targets:
   - `idp-backend`: Should be **UP** (scraping backend metrics)
   - `kubernetes-pods`: May be empty if no services deployed yet
   - `kubernetes-services`: May be empty if no annotated services

If `idp-backend` is **DOWN**:
```bash
# Test connectivity from Prometheus pod
kubectl exec -n monitoring -it deployment/prometheus -- wget -O- http://<EC2_IP>:8000/metrics

# Check backend is running
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 "docker-compose ps backend"
```

### Check Grafana Dashboard

1. Open Grafana UI: https://my-idp.duckdns.org/grafana
2. Login: `admin` / (password from secret.yaml)
3. Go to Dashboards → IDP Platform Metrics
4. Verify panels show data (may take 1-2 minutes to populate)

If no data appears:
```bash
# Check datasource connection
kubectl logs -n monitoring -l app=grafana | grep -i prometheus

# Test Prometheus from Grafana pod
kubectl exec -n monitoring -it deployment/grafana -- wget -O- http://prometheus.monitoring.svc.cluster.local:9090/-/healthy
```

## Test Auto-Discovery

Deploy a test service to verify Kubernetes pod auto-discovery:

```bash
# Create a test deployment with Prometheus annotations
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-metrics
spec:
  replicas: 1
  selector:
    matchLabels:
      app: test-metrics
  template:
    metadata:
      labels:
        app: test-metrics
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: app
        image: nginx:alpine
        ports:
        - containerPort: 8080
EOF

# Wait 30 seconds for Prometheus to scrape
# Check Prometheus Targets page - should see test-metrics pod
```

## Updating Configuration

### Update Prometheus Scrape Config

```bash
# Edit configmap
vim prometheus/configmap.yaml

# Apply changes
kubectl apply -f prometheus/configmap.yaml

# Reload Prometheus (or restart)
kubectl rollout restart deployment/prometheus -n monitoring

# Verify
kubectl logs -n monitoring -l app=prometheus | grep -i reload
```

### Update Grafana Dashboard

```bash
# Edit dashboard
vim grafana/configmap-dashboard-idp.yaml

# Apply changes
kubectl apply -f grafana/configmap-dashboard-idp.yaml

# Restart Grafana to reload
kubectl rollout restart deployment/grafana -n monitoring
```

### Update Grafana Password

```bash
# Edit secret
vim grafana/secret.yaml

# Apply changes
kubectl apply -f grafana/secret.yaml

# Restart Grafana
kubectl rollout restart deployment/grafana -n monitoring

# Login with new password
```

## Troubleshooting

### Prometheus Not Scraping Backend

**Symptom**: `idp-backend` target shows as DOWN in Prometheus

**Diagnosis**:
```bash
# 1. Check EC2 private IP is correct
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 "hostname -I"

# 2. Test connectivity from Prometheus pod
kubectl exec -n monitoring -it deployment/prometheus -- wget -O- http://<EC2_IP>:8000/metrics

# 3. Check backend logs
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@13.42.36.97 "docker-compose logs backend | tail -50"
```

**Solutions**:
- Verify EC2 security group allows inbound traffic on port 8000 from K8s cluster
- Check backend is running: `docker-compose ps backend`
- Verify correct EC2 private IP in `prometheus/configmap.yaml`

### Ingress 404 Errors

**Symptom**: https://my-idp.duckdns.org/prometheus returns 404

**Diagnosis**:
```bash
# Check ingress configuration
kubectl describe ingress prometheus -n monitoring

# Check NGINX ingress logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

**Solutions**:
- Verify ingress annotations for rewrite rules
- Check paths match exactly: `/prometheus(/|$)(.*)`
- Try accessing without subpath: Update ingress to use subdomain instead

### TLS Certificate Not Provisioning

**Symptom**: HTTPS connection fails or shows certificate errors

**Diagnosis**:
```bash
# Check certificate status
kubectl get certificate -n monitoring
kubectl describe certificate my-idp-tls -n monitoring

# Check cert-manager
kubectl get pods -n cert-manager
kubectl logs -n cert-manager -l app=cert-manager
```

**Solutions**:
- Verify cert-manager is running
- Check ClusterIssuer exists: `kubectl get clusterissuer letsencrypt-prod`
- Verify DNS points to correct IP: `nslookup my-idp.duckdns.org`
- Check Let's Encrypt rate limits

### Grafana Shows No Data

**Symptom**: Grafana dashboard panels are empty

**Diagnosis**:
```bash
# 1. Check Grafana logs
kubectl logs -n monitoring -l app=grafana

# 2. Test Prometheus datasource
kubectl exec -n monitoring -it deployment/grafana -- wget -O- http://prometheus.monitoring.svc.cluster.local:9090/api/v1/query?query=up

# 3. Check Prometheus has data
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Visit http://localhost:9090 and query: up
```

**Solutions**:
- Verify Prometheus datasource URL is correct
- Check Prometheus is actually scraping targets (see Targets page)
- Wait 2-3 minutes for initial data to appear

### Pod CrashLoopBackOff

**Symptom**: Pods keep restarting

**Diagnosis**:
```bash
# Check pod events
kubectl describe pod -n monitoring -l app=prometheus

# Check logs
kubectl logs -n monitoring -l app=prometheus --previous
```

**Common issues**:
- Invalid ConfigMap YAML syntax
- Insufficient resources
- Volume mount failures
- Security context issues

## Performance Tuning

### Increase Retention Period

Edit `prometheus/deployment.yaml`:

```yaml
args:
  - '--storage.tsdb.retention.time=30d'  # Increase from 7d to 30d
```

Requires more storage (consider adding PVC).

### Add Persistent Storage

Create PVC for Prometheus data:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prometheus-storage
  namespace: monitoring
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

Update deployment to use PVC instead of emptyDir.

### Adjust Resource Limits

Edit deployment files to increase CPU/memory:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi
```

## Cleanup

### Remove Monitoring Stack

```bash
# Delete all resources
kubectl delete namespace monitoring

# Verify removal
kubectl get all -n monitoring
```

### Remove Specific Component

```bash
# Remove only Grafana
kubectl delete -f grafana/

# Remove only Prometheus
kubectl delete -f prometheus/
```

## Next Steps

1. **Add Alerting**: Configure Alertmanager for notifications
2. **Add More Dashboards**: Create custom Grafana dashboards for specific services
3. **Enable Authentication**: Add OAuth or basic auth to Prometheus ingress
4. **Set Up Persistent Storage**: Add PVCs for data retention
5. **Configure Backup**: Set up automated backups of Grafana dashboards
6. **Add Loki**: Integrate Loki for log aggregation
7. **Add Tempo**: Add distributed tracing

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Operator](https://github.com/prometheus-operator/prometheus-operator)
- [cert-manager Documentation](https://cert-manager.io/docs/)
