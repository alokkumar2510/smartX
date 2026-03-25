"""
─── error_codes.py ───────────────────────────────────────
Standardized error codes used across the system.
"""

# ─── Connection Errors ───────────────────────────────────
E_CONNECTION_REFUSED = "E001"
E_CONNECTION_TIMEOUT = "E002"
E_CONNECTION_LOST = "E003"

# ─── Authentication Errors ──────────────────────────────
E_INVALID_USERNAME = "E100"
E_USERNAME_TAKEN = "E101"
E_NOT_AUTHENTICATED = "E102"

# ─── Message Errors ─────────────────────────────────────
E_MESSAGE_TOO_LONG = "E200"
E_EMPTY_MESSAGE = "E201"
E_INVALID_FORMAT = "E202"
E_DELIVERY_FAILED = "E203"

# ─── Protocol Errors ────────────────────────────────────
E_INVALID_PROTOCOL = "E300"
E_PROTOCOL_MISMATCH = "E301"
E_CHECKSUM_FAILED = "E302"

# ─── Server Errors ──────────────────────────────────────
E_INTERNAL_ERROR = "E500"
E_SERVICE_UNAVAILABLE = "E503"
E_RATE_LIMITED = "E429"

# Error descriptions
ERROR_DESCRIPTIONS = {
    E_CONNECTION_REFUSED: "Connection refused by the server",
    E_CONNECTION_TIMEOUT: "Connection timed out",
    E_CONNECTION_LOST: "Connection to server was lost",
    E_INVALID_USERNAME: "Username does not meet requirements",
    E_USERNAME_TAKEN: "Username is already in use",
    E_MESSAGE_TOO_LONG: "Message exceeds maximum length",
    E_EMPTY_MESSAGE: "Message cannot be empty",
    E_INVALID_PROTOCOL: "Unsupported protocol specified",
    E_CHECKSUM_FAILED: "Packet integrity check failed",
    E_RATE_LIMITED: "Too many requests, please slow down",
}
