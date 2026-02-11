# Prometheus Integration for IDP Templates

## Overview

All IDP templates now include automatic Prometheus monitoring integration. Every service created through the IDP will be automatically discovered and scraped by Prometheus.

## What Was Added

### 1. Helm Chart Annotations

Both Python and Node.js templates now include Prometheus annotations in:

**Deployment (`helm/templates/deployment.yaml`)**:
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "{{ .Values.service.targetPort }}"
  prometheus.io/path: "/metrics"
```

**Service (`helm/templates/service.yaml`)**:
```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "{{ .Values.service.port }}"
  prometheus.io/path: "/metrics"
```

### 2. Python Microservice Template

**Dependency Added** (`requirements.txt`):
```
prometheus-fastapi-instrumentator==6.1.0
```

**Code Changes** (`src/main.py`):
- Automatic FastAPI instrumentation
- `/metrics` endpoint exposed automatically
- Tracks all HTTP requests, response codes, and latencies

**Metrics Exposed**:
- `http_requests_total` - Total HTTP requests by method, path, status
- `http_request_duration_seconds` - Request duration histogram
- Default Python metrics (GC, memory, CPU, etc.)

### 3. Node.js API Template

**Dependency Added** (`package.json`):
```json
"prom-client": "^15.1.0"
```

**Code Changes** (`src/index.js`):
- Prometheus client setup with custom metrics
- Middleware to track HTTP requests
- `/metrics` endpoint implementation

**Metrics Exposed**:
- `http_requests_total` - Total HTTP requests by method, route, status
- `http_request_duration_seconds` - Request duration histogram
- Default Node.js metrics (event loop, memory, GC, etc.)

## How It Works

### Service Creation Flow

1. **User creates service** via IDP portal
2. **Template is rendered** with Prometheus annotations
3. **Service is deployed** to Kubernetes via ArgoCD
4. **Prometheus discovers** the service automatically within 15 seconds
5. **Metrics are scraped** every 15 seconds from `/metrics` endpoint
6. **Data appears** in Prometheus queries and Grafana dashboards

### Kubernetes Service Discovery

Prometheus is configured to discover services with these annotations:

```yaml
prometheus.io/scrape: "true"   # Enable scraping
prometheus.io/port: "8080"      # Port to scrape
prometheus.io/path: "/metrics"  # Metrics endpoint path
```

The scrape configuration in Prometheus:
```yaml
- job_name: 'kubernetes-pods'
  kubernetes_sd_configs:
    - role: pod
  relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: true
```

## Verification

### Check if Service is Being Scraped

1. **Deploy a test service** through the IDP
2. **Open Prometheus**: https://prometheus-idp.duckdns.org
3. **Go to**: Status → Targets
4. **Find your service**: Should show as "UP" under `kubernetes-pods` job

### View Metrics

**In Prometheus**:
```promql
# Check if service is up
up{job="kubernetes-pods", service="your-service-name"}

# View HTTP request rate
rate(http_requests_total{service="your-service-name"}[5m])

# View request latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="your-service-name"}[5m]))
```

**In Grafana**:
1. Open: https://grafana-idp.duckdns.org
2. Login with admin credentials
3. Create a new dashboard or add to existing
4. Use the queries above in panels

## Testing Locally

### Python Service

```bash
# Install dependencies
pip install -r requirements.txt

# Run service
uvicorn src.main:app --host 0.0.0.0 --port 8000

# Check metrics
curl http://localhost:8000/metrics
```

### Node.js Service

```bash
# Install dependencies
npm install

# Run service
npm start

# Check metrics
curl http://localhost:3000/metrics
```

## Custom Metrics

### Python (FastAPI)

Add custom metrics to your service:

```python
from prometheus_client import Counter, Histogram

# Define custom metric
my_counter = Counter('my_custom_metric', 'Description of metric')

@app.get("/my-endpoint")
async def my_endpoint():
    my_counter.inc()  # Increment counter
    return {"status": "ok"}
```

### Node.js (Express)

Add custom metrics to your service:

```javascript
const promClient = require('prom-client');

// Define custom metric
const myCounter = new promClient.Counter({
  name: 'my_custom_metric',
  help: 'Description of metric',
  registers: [register]
});

app.get('/my-endpoint', (req, res) => {
  myCounter.inc();  // Increment counter
  res.json({ status: 'ok' });
});
```

## Sample Queries for New Services

Once your service is deployed, you can use these queries:

```promql
# Request rate
rate(http_requests_total{service="YOUR_SERVICE"}[5m])

# Error rate
sum(rate(http_requests_total{service="YOUR_SERVICE", status_code=~"5.."}[5m])) /
sum(rate(http_requests_total{service="YOUR_SERVICE"}[5m]))

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service="YOUR_SERVICE"}[5m]))

# Total requests today
sum(increase(http_requests_total{service="YOUR_SERVICE"}[24h]))

# Slowest endpoints
topk(5, rate(http_request_duration_seconds_sum{service="YOUR_SERVICE"}[5m]) /
     rate(http_request_duration_seconds_count{service="YOUR_SERVICE"}[5m]))
```

## Grafana Dashboard Template

Create a dashboard for any deployed service:

```json
{
  "panels": [
    {
      "title": "Request Rate",
      "targets": [{
        "expr": "rate(http_requests_total{service=\"$service\"}[5m])"
      }]
    },
    {
      "title": "P95 Latency",
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{service=\"$service\"}[5m]))"
      }]
    },
    {
      "title": "Error Rate",
      "targets": [{
        "expr": "sum(rate(http_requests_total{service=\"$service\", status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total{service=\"$service\"}[5m]))"
      }]
    }
  ],
  "templating": {
    "list": [{
      "name": "service",
      "type": "query",
      "query": "label_values(http_requests_total, service)"
    }]
  }
}
```

## Troubleshooting

### Service Not Appearing in Targets

1. **Check annotations**: Ensure `prometheus.io/scrape: "true"` is present
   ```bash
   kubectl describe pod <pod-name> -n <namespace>
   ```

2. **Check metrics endpoint**:
   ```bash
   kubectl port-forward <pod-name> 8080:8080 -n <namespace>
   curl http://localhost:8080/metrics
   ```

3. **Check Prometheus logs**:
   ```bash
   kubectl logs -n monitoring -l app=prometheus
   ```

### Metrics Endpoint Returns 404

- **Python**: Ensure `prometheus-fastapi-instrumentator` is installed
- **Node.js**: Ensure `prom-client` is installed and `/metrics` route is defined
- Check application logs for errors

### No Data in Grafana

1. **Verify Prometheus is scraping**: Check Targets page
2. **Wait 1-2 minutes**: Initial scrape takes time
3. **Check datasource**: Ensure Prometheus datasource is configured
4. **Test query**: Run query directly in Prometheus first

## Best Practices

1. **Use descriptive metric names**: Follow Prometheus naming conventions
2. **Add labels**: Include relevant labels (endpoint, method, status)
3. **Use histograms for latency**: Not averages
4. **Keep cardinality low**: Avoid high-cardinality labels (user IDs, etc.)
5. **Document custom metrics**: Add help text to all custom metrics

## Next Steps

1. **Deploy a test service** to verify auto-discovery
2. **Create service-specific dashboards** in Grafana
3. **Set up alerts** for critical metrics
4. **Add custom business metrics** to your services
5. **Monitor and optimize** based on metrics

## Support

- **Prometheus UI**: https://prometheus-idp.duckdns.org
- **Grafana UI**: https://grafana-idp.duckdns.org
- **Documentation**: This file and `infrastructure/kubernetes/monitoring/`
