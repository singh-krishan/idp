"""
Prometheus metrics definitions for IDP platform observability.

Metrics exposed at ``/metrics``:

- ``http_request_duration_seconds`` – Histogram of HTTP request durations.
- ``http_requests_total`` – Counter of total HTTP requests.
- ``project_creation_total`` – Counter of project creation attempts by outcome.
- ``external_api_call_duration_seconds`` – Histogram of outbound API call durations.
- ``external_api_calls_total`` – Counter of outbound API calls by outcome.
- ``background_tasks_active`` – Gauge of currently running background tasks.
"""
import time
from contextlib import contextmanager

from prometheus_client import Counter, Gauge, Histogram

# ---------------------------------------------------------------------------
# HTTP layer
# ---------------------------------------------------------------------------

http_request_duration = Histogram(
    name="http_request_duration_seconds",
    documentation="Duration of HTTP requests in seconds",
    labelnames=["method", "path", "status_code"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

http_requests_total = Counter(
    name="http_requests_total",
    documentation="Total number of HTTP requests",
    labelnames=["method", "path", "status_code"],
)

# ---------------------------------------------------------------------------
# Project workflow
# ---------------------------------------------------------------------------

project_creation_total = Counter(
    name="project_creation_total",
    documentation="Total number of project creation attempts",
    labelnames=["status", "template_type"],
)

background_tasks_active = Gauge(
    name="background_tasks_active",
    documentation="Number of currently active background tasks",
)

# ---------------------------------------------------------------------------
# External API calls (GitHub, ArgoCD)
# ---------------------------------------------------------------------------

external_api_call_duration = Histogram(
    name="external_api_call_duration_seconds",
    documentation="Duration of calls to external APIs in seconds",
    labelnames=["service", "operation"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

external_api_calls_total = Counter(
    name="external_api_calls_total",
    documentation="Total number of calls to external APIs",
    labelnames=["service", "operation", "status"],
)


@contextmanager
def track_external_call(service: str, operation: str):
    """
    Context manager that records duration and success/error for an external API call.

    Works in both sync and async contexts — always use ``with``, never ``async with``.

    Usage::

        with track_external_call("github", "create_repository"):
            repo = github_client.create_repo(...)
    """
    start = time.time()
    status = "success"
    try:
        yield
    except Exception:
        status = "error"
        raise
    finally:
        duration = time.time() - start
        external_api_call_duration.labels(service=service, operation=operation).observe(
            duration
        )
        external_api_calls_total.labels(
            service=service, operation=operation, status=status
        ).inc()
