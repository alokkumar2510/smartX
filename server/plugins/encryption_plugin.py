#!/usr/bin/env python3
"""
server/plugins/encryption_plugin.py — Encryption Plugin
══════════════════════════════════════════════════════
Adds E2E encryption layer to the message pipeline.
"""

from server.plugins.plugin_base import PluginBase
from server.encryption import encryption_engine
import logging

logger = logging.getLogger("SmartChatX.Plugins.Encryption")


class EncryptionPlugin(PluginBase):
    def __init__(self):
        super().__init__(
            name="E2E Encryption",
            version="1.0",
            description="AES-256 encryption with DH key exchange simulation"
        )

    def on_message(self, message: dict) -> dict:
        text = message.get("text", "")
        sender = message.get("sender", "unknown")

        # Encrypt the message
        encrypted = encryption_engine.encrypt(text, sender)
        
        # Decrypt to verify (and show the flow)
        decrypted = encryption_engine.decrypt(encrypted, sender)

        message["encryption"] = {
            "encrypted": True,
            "algorithm": "AES-256-CBC",
            "ciphertext_preview": encrypted["ciphertext"][:30] + "...",
            "iv": encrypted["iv"][:16] + "...",
            "checksum": encrypted["checksum"],
            "verified": text == decrypted
        }

        return message

    def on_event(self, event_type: str, data: dict) -> dict:
        super().on_event(event_type, data)
        
        if event_type == "user_join":
            username = data.get("username", "")
            key_info = encryption_engine.generate_session_key(username)
            data["key_exchange"] = key_info
            logger.info(f"🧩 Encryption Plugin | Key exchange for {username}")

        return data
