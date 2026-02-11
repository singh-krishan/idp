/**
 * {{ cookiecutter.description }}
 */
const express = require('express');
const promClient = require('prom-client');

const app = express();
const PORT = process.env.PORT || {{ cookiecutter.port }};

// Prometheus metrics setup
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Middleware
app.use(express.json());

// Metrics middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    });
    httpRequestDuration.observe({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode
    }, duration);
  });

  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to {{ cookiecutter.project_name }}',
    version: '0.1.0'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: '{{ cookiecutter.project_name }}'
  });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Start server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
