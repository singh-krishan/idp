# Monitoring Stack Quick Reference

## Deploy

```bash
cd infrastructure/kubernetes/monitoring

# 1. Configure
# - Edit prometheus/configmap.yaml: Replace <EC2_PRIVATE_IP>
# - Edit grafana/secret.yaml: Set admin-password

# 2. Verify
bash verify.sh

# 3. Deploy
bash deploy.sh
```

## Access

**HTTPS (Production)**:
- Prometheus: https://my-idp.duckdns.org/prometheus
- Grafana: https://my-idp.duckdns.org/grafana (admin / password)

**Port-Forward (Local)**:
```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090
kubectl port-forward -n monitoring svc/grafana 3000:3000
```

## Status

```bash
# Pods
kubectl get pods -n monitoring

# Logs
kubectl logs -n monitoring -l app=prometheus
kubectl logs -n monitoring -l app=grafana

# Ingress
kubectl get ingress -n monitoring

# TLS
kubectl get certificate -n monitoring
```

## Update

```bash
# Prometheus config
kubectl apply -f prometheus/configmap.yaml
kubectl rollout restart deployment/prometheus -n monitoring

# Grafana dashboard
kubectl apply -f grafana/configmap-dashboard-idp.yaml
kubectl rollout restart deployment/grafana -n monitoring

# Password
kubectl apply -f grafana/secret.yaml
kubectl rollout restart deployment/grafana -n monitoring
```

## Troubleshoot

```bash
# Prometheus not scraping?
kubectl exec -n monitoring -it deployment/prometheus -- wget -O- http://<EC2_IP>:8000/metrics

# Grafana datasource issue?
kubectl exec -n monitoring -it deployment/grafana -- wget -O- http://prometheus.monitoring.svc.cluster.local:9090/-/healthy

# TLS not working?
kubectl describe certificate my-idp-tls -n monitoring
kubectl logs -n cert-manager -l app=cert-manager

# Ingress routing issue?
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

## Cleanup

```bash
kubectl delete namespace monitoring
```

## Docs

- **Quick Start**: `README.md`
- **Full Guide**: `DEPLOYMENT.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
