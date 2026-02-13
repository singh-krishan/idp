"""
Request ID context variable for request tracing.

This module is the single source of truth for the current request's unique ID.
It is set by the observability middleware in main.py and read by the logging
filter in app.core.logging to automatically include request_id in every log
record produced during that request's lifetime.
"""
import contextvars

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default=""
)
