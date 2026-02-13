"""
Structured JSON logging configuration with sensitive data redaction.

Sets up JSON-formatted log output with automatic request_id injection via a
logging.Filter that reads from the request context variable.  Any ``extra``
fields passed to a log call are included in the JSON output automatically.

Sensitive data (tokens, passwords, keys) is automatically redacted from log
messages and arguments to prevent accidental credential leakage.

Example output::

    {"timestamp": "2026-01-31T12:00:00Z", "level": "INFO", "logger": "app.services.github_service",
     "message": "Creating GitHub repository", "request_id": "a1b2c3d4-...", "repo_name": "my-svc"}
"""
import logging

from pythonjsonlogger import jsonlogger

from app.middleware.request_id import request_id_var
from app.core.redaction import redact_string


class RequestIdFilter(logging.Filter):
    """Injects the current request_id into every log record and redacts sensitive data."""

    def filter(self, record: logging.LogRecord) -> bool:
        # Inject request ID
        record.request_id = request_id_var.get("")

        # Redact sensitive data from log message
        if hasattr(record, "msg") and isinstance(record.msg, str):
            record.msg = redact_string(record.msg)

        # Redact sensitive data from arguments
        if hasattr(record, "args") and record.args:
            record.args = tuple(
                redact_string(str(arg)) if isinstance(arg, str) else arg
                for arg in record.args
            )

        return True


def setup_logging(debug: bool = False) -> None:
    """
    Configure structured JSON logging for the application.

    Args:
        debug: Enable DEBUG level logging when True.
    """
    log_level = logging.DEBUG if debug else logging.INFO

    formatter = jsonlogger.JsonFormatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s %(request_id)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.handlers.clear()

    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    handler.addFilter(RequestIdFilter())

    root_logger.addHandler(handler)
