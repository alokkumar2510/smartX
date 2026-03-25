#!/usr/bin/env python3
"""
server/plugins/blockchain_plugin.py — Blockchain Logging Plugin
══════════════════════════════════════════════════════════════
Records every message onto the blockchain ledger.
"""

from server.plugins.plugin_base import PluginBase
from server.blockchain import blockchain
import logging

logger = logging.getLogger("SmartChatX.Plugins.Blockchain")


class BlockchainPlugin(PluginBase):
    def __init__(self):
        super().__init__(
            name="Blockchain Ledger",
            version="1.0",
            description="Immutable SHA-256 blockchain message logging with tamper detection"
        )

    def on_message(self, message: dict) -> dict:
        text = message.get("text", "")
        sender = message.get("sender", "unknown")

        # Mine a new block for this message
        block_info = blockchain.add_message(
            sender=sender,
            message=text,
            msg_type="chat",
            metadata={
                "ai_intent": message.get("ai_analysis", {}).get("intent", ""),
                "encrypted": bool(message.get("encryption", {}))
            }
        )

        message["blockchain"] = block_info
        return message

    def on_event(self, event_type: str, data: dict) -> dict:
        super().on_event(event_type, data)

        if event_type == "user_join":
            blockchain.add_message(
                sender="SYSTEM",
                message=f"{data.get('username', '')} joined",
                msg_type="system_event"
            )
        elif event_type == "user_leave":
            blockchain.add_message(
                sender="SYSTEM",
                message=f"{data.get('username', '')} left",
                msg_type="system_event"
            )
        return data


blockchain_plugin = BlockchainPlugin()
