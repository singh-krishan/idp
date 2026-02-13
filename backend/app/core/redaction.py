"""
Sensitive data redaction utilities.

Automatically redacts secrets, tokens, and passwords from logs and API responses.
"""
import re
from typing import Any, Dict, Union


# Patterns for sensitive data detection
SENSITIVE_PATTERNS = [
    # Tokens and API keys
    (r"(token|key|secret|password|passwd|pwd)([\"']?\s*[:=]\s*[\"']?)([^\s\"',}\]]+)", "***REDACTED***"),

    # Authorization headers
    (r"(Bearer\s+)([A-Za-z0-9\-._~+/]+)", r"\1***REDACTED***"),
    (r"(Basic\s+)([A-Za-z0-9+/=]+)", r"\1***REDACTED***"),

    # GitHub tokens (start with ghp_, gho_, etc.)
    (r"gh[pousr]_[A-Za-z0-9]{36,}", "ghp_***REDACTED***"),

    # AWS access keys
    (r"AKIA[0-9A-Z]{16}", "AKIA***REDACTED***"),

    # JWT tokens (xxx.yyy.zzz format)
    (r"eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*", "eyJ***REDACTED***"),

    # Connection strings with passwords
    (r"(postgresql|mysql|mongodb)://([^:]+):([^@]+)@", r"\1://\2:***REDACTED***@"),
]

# Field names that should be redacted
SENSITIVE_FIELD_NAMES = {
    "password",
    "passwd",
    "pwd",
    "secret",
    "token",
    "api_key",
    "apikey",
    "access_token",
    "refresh_token",
    "github_token",
    "argocd_password",
    "jwt_secret_key",
    "private_key",
    "auth_token",
}


def redact_string(text: str) -> str:
    """
    Redact sensitive data from a string.

    Args:
        text: String potentially containing sensitive data

    Returns:
        String with sensitive data redacted
    """
    if not text:
        return text

    for pattern, replacement in SENSITIVE_PATTERNS:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    return text


def redact_dict(data: Dict[str, Any], recursive: bool = True) -> Dict[str, Any]:
    """
    Redact sensitive fields from a dictionary.

    Args:
        data: Dictionary potentially containing sensitive fields
        recursive: Whether to recursively redact nested dictionaries

    Returns:
        Dictionary with sensitive fields redacted
    """
    if not isinstance(data, dict):
        return data

    redacted = {}

    for key, value in data.items():
        key_lower = key.lower()

        # Check if field name is sensitive
        if any(sensitive in key_lower for sensitive in SENSITIVE_FIELD_NAMES):
            # Redact but preserve some characters for debugging
            if isinstance(value, str) and len(value) > 4:
                redacted[key] = f"{value[:2]}***{value[-2:]}"
            else:
                redacted[key] = "***REDACTED***"

        # Recursively redact nested dicts
        elif recursive and isinstance(value, dict):
            redacted[key] = redact_dict(value, recursive=True)

        # Recursively redact lists of dicts
        elif recursive and isinstance(value, list):
            redacted[key] = [
                redact_dict(item, recursive=True) if isinstance(item, dict) else item
                for item in value
            ]

        # Redact string values that match patterns
        elif isinstance(value, str):
            redacted[key] = redact_string(value)

        else:
            redacted[key] = value

    return redacted


def redact_url(url: str) -> str:
    """
    Redact sensitive parts of a URL (passwords, tokens in query params).

    Args:
        url: URL string

    Returns:
        URL with sensitive parts redacted
    """
    # Redact password in connection strings
    url = re.sub(
        r"://([^:]+):([^@]+)@",
        r"://\1:***REDACTED***@",
        url
    )

    # Redact token/key query parameters
    url = re.sub(
        r"([?&])(token|key|secret|password|apikey)=([^&]+)",
        r"\1\2=***REDACTED***",
        url,
        flags=re.IGNORECASE
    )

    return url


def mask_secret(secret: str, visible_chars: int = 4) -> str:
    """
    Mask a secret, showing only first/last few characters.

    Args:
        secret: Secret string to mask
        visible_chars: Number of characters to show at start/end

    Returns:
        Masked string (e.g., "ghp_abc...xyz")
    """
    if not secret or len(secret) <= visible_chars * 2:
        return "***REDACTED***"

    return f"{secret[:visible_chars]}***{secret[-visible_chars:]}"


class RedactedLogRecord:
    """
    Wrapper for log records that automatically redacts sensitive data.

    Usage in logging filter:
        record.msg = redact_string(str(record.msg))
    """

    @staticmethod
    def redact_log_message(message: str) -> str:
        """Redact sensitive data from log message"""
        return redact_string(message)

    @staticmethod
    def redact_log_args(args: tuple) -> tuple:
        """Redact sensitive data from log arguments"""
        if not args:
            return args

        return tuple(
            redact_string(str(arg)) if isinstance(arg, str) else arg
            for arg in args
        )
