#!/usr/bin/env python3
"""
server/blockchain.py — SmartChat X Ultra Blockchain Message Ledger
══════════════════════════════════════════════════════════════════
Immutable, tamper-proof message logging using a SHA-256 blockchain.

Features:
  • Every message stored as a block with hash chain
  • Automatic tamper detection
  • Full chain validation
  • Genesis block creation
  • Block explorer for the dashboard
"""

import hashlib
import json
import time
import logging
from threading import Lock

logger = logging.getLogger("SmartChatX.Blockchain")


class Block:
    """A single block in the message chain."""

    def __init__(self, index: int, timestamp: float, data: dict,
                 previous_hash: str, nonce: int = 0):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.nonce = nonce
        self.hash = self.calculate_hash()

    def calculate_hash(self) -> str:
        """SHA-256 hash of the block contents."""
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def mine(self, difficulty: int = 2):
        """
        Simple proof-of-work: find a nonce that produces
        a hash starting with `difficulty` zeros.
        """
        target = "0" * difficulty
        while not self.hash.startswith(target):
            self.nonce += 1
            self.hash = self.calculate_hash()

    def to_dict(self) -> dict:
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "time_str": time.strftime('%H:%M:%S', time.localtime(self.timestamp)),
            "data": self.data,
            "previous_hash": self.previous_hash,
            "hash": self.hash,
            "nonce": self.nonce
        }


class MessageBlockchain:
    """
    Blockchain ledger for immutable message storage.

    Chain Structure:
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Block 0  │───▶│ Block 1  │───▶│ Block 2  │───▶ ...
    │ GENESIS  │    │ msg data │    │ msg data │
    │ hash: 0a │    │ prev: 0a │    │ prev: 3f │
    │          │    │ hash: 3f │    │ hash: 7c │
    └──────────┘    └──────────┘    └──────────┘
    """

    def __init__(self, difficulty: int = 2):
        self.chain = []
        self.difficulty = difficulty
        self.lock = Lock()
        self.pending_messages = []
        self._create_genesis_block()
        logger.info(f"⛓️  Blockchain initialized | Difficulty: {difficulty} | "
                     f"Genesis: {self.chain[0].hash[:16]}...")

    def _create_genesis_block(self):
        """Create the first block in the chain."""
        genesis = Block(
            index=0,
            timestamp=time.time(),
            data={
                "type": "genesis",
                "message": "SmartChat X Ultra — Genesis Block",
                "system": "Blockchain Message Ledger v1.0"
            },
            previous_hash="0" * 64
        )
        genesis.mine(self.difficulty)
        self.chain.append(genesis)
        logger.info(f"⛓️  Genesis block mined | Hash: {genesis.hash[:24]}...")

    def add_message(self, sender: str, message: str,
                    msg_type: str = "chat", metadata: dict = None) -> dict:
        """
        Add a message to the blockchain as a new block.
        Returns block info for the client.
        """
        with self.lock:
            prev_block = self.chain[-1]

            data = {
                "type": msg_type,
                "sender": sender,
                "message": message[:200],  # Limit stored message length
                "metadata": metadata or {}
            }

            new_block = Block(
                index=len(self.chain),
                timestamp=time.time(),
                data=data,
                previous_hash=prev_block.hash
            )
            new_block.mine(self.difficulty)
            self.chain.append(new_block)

        logger.info(f"⛓️  Block #{new_block.index} mined | "
                     f"Sender: {sender} | Hash: {new_block.hash[:16]}... | "
                     f"Nonce: {new_block.nonce}")

        return {
            "block_index": new_block.index,
            "hash": new_block.hash,
            "hash_preview": new_block.hash[:16] + "...",
            "previous_hash_preview": new_block.previous_hash[:16] + "...",
            "nonce": new_block.nonce,
            "timestamp": new_block.timestamp,
            "mined": True
        }

    def validate_chain(self) -> dict:
        """
        Validate the entire blockchain for tampering.
        Returns validation result with details.
        """
        errors = []
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            # Check hash integrity
            if current.hash != current.calculate_hash():
                errors.append({
                    "block": i,
                    "error": "Hash mismatch — block has been tampered!",
                    "expected": current.calculate_hash()[:16],
                    "actual": current.hash[:16]
                })

            # Check chain linkage
            if current.previous_hash != previous.hash:
                errors.append({
                    "block": i,
                    "error": "Chain broken — previous hash doesn't match!",
                    "expected": previous.hash[:16],
                    "actual": current.previous_hash[:16]
                })

        is_valid = len(errors) == 0
        result = {
            "valid": is_valid,
            "blocks_checked": len(self.chain),
            "errors": errors,
            "chain_length": len(self.chain),
            "status": "✅ CHAIN VALID" if is_valid else "❌ CHAIN COMPROMISED"
        }

        logger.info(f"⛓️  Chain validation: {result['status']} | "
                     f"Blocks: {len(self.chain)}")
        return result

    def tamper_block(self, index: int, new_message: str) -> dict:
        """
        INTENTIONALLY tamper a block for demonstration.
        Shows how blockchain detects modifications.
        """
        if index < 1 or index >= len(self.chain):
            return {"error": "Invalid block index"}

        block = self.chain[index]
        old_hash = block.hash
        block.data["message"] = new_message
        # Don't recalculate hash — this is the tampering!

        logger.warning(f"⛓️  ⚠️ TAMPER | Block #{index} modified! "
                        f"Old hash: {old_hash[:16]}...")

        return {
            "tampered_block": index,
            "old_hash": old_hash[:16] + "...",
            "message_changed": True,
            "note": "Run validation to detect this tampering!"
        }

    def get_block(self, index: int) -> dict:
        """Get a specific block."""
        if 0 <= index < len(self.chain):
            return self.chain[index].to_dict()
        return None

    def get_recent_blocks(self, count: int = 10) -> list:
        """Get the most recent blocks."""
        start = max(0, len(self.chain) - count)
        return [b.to_dict() for b in self.chain[start:]]

    def get_stats(self) -> dict:
        """Return blockchain statistics for the dashboard."""
        chain_size = sum(
            len(json.dumps(b.to_dict())) for b in self.chain
        )
        return {
            "chain_length": len(self.chain),
            "latest_hash": self.chain[-1].hash[:24] + "..." if self.chain else "",
            "genesis_hash": self.chain[0].hash[:24] + "..." if self.chain else "",
            "difficulty": self.difficulty,
            "total_size_bytes": chain_size,
            "avg_nonce": round(
                sum(b.nonce for b in self.chain) / max(len(self.chain), 1), 1
            ),
            "valid": self.validate_chain()["valid"],
            "recent_blocks": self.get_recent_blocks(5)
        }

    def search_by_sender(self, sender: str) -> list:
        """Search blocks by sender."""
        results = []
        for block in self.chain:
            if block.data.get("sender", "").lower() == sender.lower():
                results.append(block.to_dict())
        return results


# Singleton
blockchain = MessageBlockchain(difficulty=2)
