"""
─── encryption_service.py ────────────────────────────────
Server-side encryption/decryption operations.
"""
import hashlib
import secrets
import base64


class EncryptionService:
    """Handles message encryption and key management."""

    def __init__(self):
        self._key = secrets.token_bytes(32)  # AES-256 key

    def hash_message(self, content: str) -> str:
        """Generate SHA-256 hash of a message."""
        return hashlib.sha256(content.encode()).hexdigest()

    def generate_session_key(self) -> str:
        """Generate a random session key."""
        return base64.b64encode(secrets.token_bytes(32)).decode()

    def verify_integrity(self, content: str, expected_hash: str) -> bool:
        """Verify message integrity using hash comparison."""
        return self.hash_message(content) == expected_hash
