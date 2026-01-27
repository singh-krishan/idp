# Multi-stage Dockerfile for {{ cookiecutter.project_name }}

FROM node:18-alpine as builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Final stage
FROM node:18-alpine

WORKDIR /app

# Copy dependencies and code
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/

# Expose port
EXPOSE {{ cookiecutter.port }}

# Run the application
CMD ["node", "src/index.js"]
