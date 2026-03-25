# {{ cookiecutter.project_name }}

{{ cookiecutter.description }}

## Technology Stack

- **Apache Camel** with YAML DSL for integration routes
- **Quarkus** as the runtime platform
- **Java 17** runtime
- **Prometheus** metrics via Micrometer
- **Helm** chart for Kubernetes deployment

## Project Structure

```
src/
  main/
    resources/
      camel/
        routes.yaml          # Camel YAML DSL route definitions
      application.properties # Application configuration
  test/
    java/
      CamelRoutesTest.java   # Integration tests
helm/                         # Kubernetes Helm chart
Dockerfile                    # Multi-stage Docker build
pom.xml                       # Maven dependencies
```

## Local Development

```bash
# Run in dev mode with hot reload
./mvnw quarkus:dev

# Run tests
./mvnw test

# Build
./mvnw package
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Root - service info |
| `GET /health` | Health check |
| `GET /hello` | Hello endpoint |
| `GET /q/health` | Quarkus health (liveness/readiness) |
| `GET /q/metrics` | Prometheus metrics |

## Adding New Routes

Edit `src/main/resources/camel/routes.yaml` to add new Camel routes using YAML DSL:

```yaml
- route:
    id: my-new-route
    from:
      uri: platform-http:/my-endpoint
      steps:
        - setHeader:
            name: Content-Type
            constant: application/json
        - setBody:
            constant: '{"data":"my response"}'
```

## Docker

```bash
# Build
docker build -t {{ cookiecutter.project_name }} .

# Run
docker run -p {{ cookiecutter.port }}:{{ cookiecutter.port }} {{ cookiecutter.project_name }}
```

Created by {{ cookiecutter.author }} via IDP Platform.
