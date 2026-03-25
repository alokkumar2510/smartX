#!/usr/bin/env python3
"""
server/plugins/plugin_base.py — SmartChat X Plugin Architecture
══════════════════════════════════════════════════════════════
Abstract base class for all plugins.
New features can be added as self-contained plugins.
"""

import time
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger("SmartChatX.Plugins")


class PluginBase(ABC):
    """
    Abstract base class for SmartChat X plugins.
    
    Lifecycle:
      1. __init__() → Plugin created
      2. on_load()  → Plugin activated
      3. on_message() / on_event() → Processing
      4. on_unload() → Plugin deactivated
    
    To create a new plugin:
      1. Subclass PluginBase
      2. Implement required methods
      3. Register with PluginManager
    """

    def __init__(self, name: str, version: str, description: str):
        self.name = name
        self.version = version
        self.description = description
        self.enabled = True
        self.loaded_at = None
        self.stats = {
            "messages_processed": 0,
            "events_handled": 0,
            "errors": 0,
            "last_active": None
        }

    def on_load(self):
        """Called when plugin is activated."""
        self.loaded_at = time.time()
        logger.info(f"🧩 Plugin loaded: {self.name} v{self.version}")

    def on_unload(self):
        """Called when plugin is deactivated."""
        logger.info(f"🧩 Plugin unloaded: {self.name}")

    @abstractmethod
    def on_message(self, message: dict) -> dict:
        """
        Process a message through this plugin.
        
        Args:
            message: {"text": str, "sender": str, "type": str, ...}
        
        Returns:
            Modified message dict or None to block
        """
        pass

    def on_event(self, event_type: str, data: dict) -> dict:
        """Handle a system event. Override if needed."""
        self.stats["events_handled"] += 1
        return data

    def get_info(self) -> dict:
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "enabled": self.enabled,
            "loaded_at": self.loaded_at,
            "stats": self.stats
        }


class PluginManager:
    """Manages plugin lifecycle and message pipeline."""

    def __init__(self):
        self.plugins = {}  # {name: PluginBase}
        self.load_order = []
        logger.info("🧩 Plugin Manager initialized")

    def register(self, plugin: PluginBase):
        """Register and load a plugin."""
        self.plugins[plugin.name] = plugin
        self.load_order.append(plugin.name)
        plugin.on_load()
        logger.info(f"🧩 Registered: {plugin.name} v{plugin.version} — {plugin.description}")

    def unregister(self, name: str):
        """Unload and remove a plugin."""
        if name in self.plugins:
            self.plugins[name].on_unload()
            del self.plugins[name]
            self.load_order.remove(name)

    def toggle(self, name: str) -> bool:
        """Toggle a plugin on/off."""
        if name in self.plugins:
            self.plugins[name].enabled = not self.plugins[name].enabled
            state = "enabled" if self.plugins[name].enabled else "disabled"
            logger.info(f"🧩 Plugin {name} → {state}")
            return self.plugins[name].enabled
        return False

    def process_message(self, message: dict) -> dict:
        """
        Run message through all enabled plugins in order.
        Any plugin returning None blocks the message.
        """
        for name in self.load_order:
            plugin = self.plugins.get(name)
            if not plugin or not plugin.enabled:
                continue
            try:
                result = plugin.on_message(message)
                plugin.stats["messages_processed"] += 1
                plugin.stats["last_active"] = time.time()
                if result is None:
                    logger.info(f"🧩 Message blocked by plugin: {name}")
                    return None
                message = result
            except Exception as e:
                plugin.stats["errors"] += 1
                logger.error(f"🧩 Plugin error in {name}: {e}")
        return message

    def broadcast_event(self, event_type: str, data: dict) -> dict:
        """Send an event to all enabled plugins."""
        for name in self.load_order:
            plugin = self.plugins.get(name)
            if plugin and plugin.enabled:
                try:
                    data = plugin.on_event(event_type, data)
                except Exception as e:
                    logger.error(f"🧩 Event error in {name}: {e}")
        return data

    def list_plugins(self) -> list:
        return [p.get_info() for p in self.plugins.values()]

    def get_stats(self) -> dict:
        return {
            "total_plugins": len(self.plugins),
            "enabled_plugins": sum(1 for p in self.plugins.values() if p.enabled),
            "plugins": self.list_plugins()
        }


# Singleton manager
plugin_manager = PluginManager()
