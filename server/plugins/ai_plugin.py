#!/usr/bin/env python3
"""
server/plugins/ai_plugin.py — AI Augmentation Plugin
════════════════════════════════════════════════════
Integrates AI module into the plugin pipeline.
"""

from server.plugins.plugin_base import PluginBase
from server.ai_module import ai_engine
import logging

logger = logging.getLogger("SmartChatX.Plugins.AI")


class AIPlugin(PluginBase):
    def __init__(self):
        super().__init__(
            name="AI Augmentation",
            version="2.0",
            description="Smart replies, summarization, toxicity detection, study mode"
        )

    def on_message(self, message: dict) -> dict:
        text = message.get("text", "")
        sender = message.get("sender", "unknown")

        # Run AI analysis
        analysis = ai_engine.analyze_message(text, sender)

        # Attach AI results to message
        message["ai_analysis"] = {
            "sentiment": analysis["sentiment"],
            "intent": analysis["intent"],
            "smart_replies": analysis["smart_replies"],
            "summary": analysis["summary"],
            "toxicity": analysis["toxicity"]
        }

        # Block toxic messages
        if analysis["is_blocked"]:
            message["blocked"] = True
            message["block_reason"] = analysis.get("block_reason", "toxic_content")
            logger.warning(f"🧩 AI Plugin | Blocked message from {sender}")

        # Handle study mode
        if analysis["study_response"]:
            message["study_response"] = analysis["study_response"]

        return message
