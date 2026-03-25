# Monitoring Stack Deployment Status

## ✅ Successfully Deployed to k3s Cluster

**Date**: 2026-02-07
**Cluster**: EC2 #2 (18.130.143.156 / 172.31.2.204)
**Namespace**: monitoring

## Service Status

### Prometheus
- **Status**: ✅ Running
- **HTTPS URL**: https://my-idp.duckdns.org/prometheus
- **HTTP Status**: 200 OK
- **Pod**: prometheus-655bd66b44-xz4bm

### Grafana
- **Status**: ✅ Running
- **HTTPS URL**: https://my-idp.duckdns.org/grafana
- **HTTP Status**: 200 OK
- **Pod**: grafana-5cbf86fdfd-xsbr8
- **Username**: admin
- **Password**: kdDxg/yGVxA5JR7usYeVq4ZTk2flm61a

### TLS Certificate
- **Status**: ⏳ Provisioning (cert-manager working on Let's Encrypt certificate)
- **Current**: Using default/self-signed certificate
- **Expected**: Will auto-update when Let's Encrypt cert is ready (1-2 minutes)

## ⚠️ Known Issue: Backend Scraping

**Problem**: Prometheus cannot scrape metrics from the IDP backend

**Root Cause**: Security group configuration blocks traffic from k3s EC2 (172.31.2.204) to backend EC2 (172.31.46.112) on port 8000

**Backend Details**:
- Location: EC2 #1 (13.42.36.97 / 172.31.46.112)
- Process: Running (uvicorn listening on 0.0.0.0:8000)
- Metrics Endpoint: http://172.31.46.112:8000/metrics (works locally)

**Solution**: Update security group for backend EC2 instance

### Option 1: AWS Console (Recommended)

1. Go to EC2 Dashboard → Security Groups
2. Find security group attached to backend EC2 (13.42.36.97)
3. Add Inbound Rule:
   - **Type**: Custom TCP
   - **Port**: 8000
   - **Source**: 172.31.2.204/32 (k3s EC2 private IP)
   - **Description**: Allow Prometheus scraping from k3s cluster

### Option 2: AWS CLI

```bash
# Get security group ID
aws ec2 describe-instances \
  --instance-ids $(aws ec2 describe-instances \
    --filters "Name=ip-address,Values=13.42.36.97" \
    --query 'Reservations[0].Instances[0].InstanceId' --output text) \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text

# Add inbound rule (replace sg-xxxxx with actual SG ID)
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 8000 \
  --cidr 172.31.2.204/32
```

### Option 3: Allow Entire VPC (Less Secure)

```bash
# If both EC2s are in same VPC, allow entire VPC CIDR
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 8000 \
  --cidr 172.31.0.0/16
```

### Verify Fix

After updating security group:

```bash
# Test from k3s EC2
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@18.130.143.156 \
  "curl -s http://172.31.46.112:8000/health"

# Should return: {"status":"healthy"}

# Check Prometheus targets
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@18.130.143.156 \
  "kubectl port-forward -n monitoring svc/prometheus 9090:9090 &"
# Visit http://18.130.143.156:9090/targets
# idp-backend should show as UP
```

## Access Information

### HTTPS Access (Production)

```bash
# Prometheus
open https://my-idp.duckdns.org/prometheus

# Grafana
open https://my-idp.duckdns.org/grafana
# Login: admin / kdDxg/yGVxA5JR7usYeVq4ZTk2flm61a
```

### Port-Forward Access (Debugging)

```bash
# SSH to k3s EC2
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@18.130.143.156

# Port-forward Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &

# Port-forward Grafana
kubectl port-forward -n monitoring svc/grafana 3000:3000 &

# Access via SSH tunnel
# Then open: http://localhost:9090 and http://localhost:3000
```

## Verification Checklist

- [x] Monitoring namespace created
- [x] Prometheus pod running
- [x] Grafana pod running
- [x] Services created (ClusterIP)
- [x] Ingress resources created
- [x] HTTPS access working for Prometheus
- [x] HTTPS access working for Grafana
- [x] Grafana datasource configured (Prometheus)
- [x] IDP dashboard loaded in Grafana
- [⏳] TLS certificate from Let's Encrypt (in progress)
- [❌] Prometheus scraping backend (security group issue)

## Next Steps

1. **Fix Security Group** (5 minutes)
   - Add inbound rule for port 8000 from k3s EC2

2. **Wait for TLS Certificate** (1-2 minutes)
   - cert-manager will automatically provision Let's Encrypt certificate
   - Check: `ssh ec2-user@18.130.143.156 "kubectl get certificate -n monitoring"`

3. **Verify Metrics Collection** (2 minutes)
   - After security group fix, check Prometheus targets page
   - Verify backend metrics appear in Grafana dashboard

4. **Deploy Test Project** (Optional)
   - Create a test project via IDP portal
   - Verify it gets auto-discovered by Prometheus
   - Check metrics appear in Grafana

## Monitoring Stack Configuration

### Prometheus Scrape Targets

1. **idp-backend** (Static):
   - Target: 172.31.46.112:8000
   - Metrics: HTTP requests, project creation, external API calls
   - Status: Currently DOWN (security group issue)

2. **kubernetes-pods** (Auto-discovery):
   - Discovers pods with annotation: `prometheus.io/scrape=true`
   - Status: UP (ready for deployed projects)

3. **kubernetes-services** (Auto-discovery):
   - Discovers services with annotation: `prometheus.io/scrape=true`
   - Status: UP

### Grafana Dashboard

**Pre-loaded**: IDP Platform Metrics

**Panels**:
- HTTP Request Rate
- HTTP Request Latency (p50, p95)
- Successful Projects Created
- Failed Projects
- Active Background Tasks
- External API Call Latency
- External API Call Rate

**Note**: Panels will show "No Data" until backend scraping is fixed

## Files Location

All deployment files are on k3s EC2:
```
/home/ec2-user/monitoring/
├── namespace.yaml
├── prometheus/
│   ├── rbac.yaml
│   ├── configmap.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
└── grafana/
    ├── secret.yaml
    ├── configmap-datasource.yaml
    ├── configmap-dashboards-provider.yaml
    ├── configmap-dashboard-idp.yaml
    ├── deployment.yaml
    ├── service.yaml
    └── ingress.yaml
```

## Update Commands

If you need to update configuration:

```bash
# SSH to k3s EC2
ssh -i ~/.ssh/idp-demo-key-new.pem ec2-user@18.130.143.156

cd ~/monitoring

# Update Prometheus config
kubectl apply -f prometheus/configmap.yaml
kubectl rollout restart deployment/prometheus -n monitoring

# Update Grafana dashboard
kubectl apply -f grafana/configmap-dashboard-idp.yaml
kubectl rollout restart deployment/grafana -n monitoring

# Update Grafana password
kubectl apply -f grafana/secret.yaml
kubectl rollout restart deployment/grafana -n monitoring
```

## Troubleshooting

### Check Pod Logs

```bash
kubectl logs -n monitoring -l app=prometheus
kubectl logs -n monitoring -l app=grafana
```

### Check Ingress

```bash
kubectl describe ingress prometheus -n monitoring
kubectl describe ingress grafana -n monitoring
```

### Check Certificate

```bash
kubectl describe certificate my-idp-tls -n monitoring
kubectl logs -n cert-manager -l app=cert-manager
```

### Test Backend Connectivity

```bash
# From k3s EC2
curl http://172.31.46.112:8000/health
curl http://172.31.46.112:8000/metrics | head -20

# From Prometheus pod
kubectl exec -n monitoring deployment/prometheus -- wget -O- http://172.31.46.112:8000/health
```

## Summary

✅ **Monitoring stack deployed successfully**
✅ **HTTPS access working**
⏳ **TLS certificate provisioning**
⚠️ **Backend scraping blocked by security group**

**Action Required**: Update security group to allow port 8000 from k3s EC2 to backend EC2
