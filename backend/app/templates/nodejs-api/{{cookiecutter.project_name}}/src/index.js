/**
 * {{ cookiecutter.description }}
 */
const express = require('express');

const app = express();
const PORT = process.env.PORT || {{ cookiecutter.port }};

// Middleware
app.use(express.json());

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

// Start server
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
