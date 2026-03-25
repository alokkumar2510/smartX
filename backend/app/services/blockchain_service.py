"""
─── blockchain_service.py ────────────────────────────────
Blockchain ledger management for immutable message logging.
"""
import hashlib
import json
import time


class Block:
    """A single block in the chain."""
    def __init__(self, index, data, previous_hash, difficulty=2):
        self.index = index
        self.timestamp = time.time()
        self.data = data
        self.previous_hash = previous_hash
        self.nonce = 0
        self.hash = self.mine(difficulty)

    def calculate_hash(self):
        block_string = json.dumps({
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash,
            "nonce": self.nonce,
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()

    def mine(self, difficulty):
        target = "0" * difficulty
        while True:
            hash_val = self.calculate_hash()
            if hash_val[:difficulty] == target:
                return hash_val
            self.nonce += 1


class BlockchainService:
    """Manages the blockchain ledger."""

    def __init__(self, difficulty=2):
        self.difficulty = difficulty
        self.chain = [self._create_genesis_block()]

    def _create_genesis_block(self):
        return Block(0, "Genesis Block", "0" * 64, self.difficulty)

    def add_block(self, data: str):
        """Add a new block with the given data."""
        prev_hash = self.chain[-1].hash
        new_block = Block(len(self.chain), data, prev_hash, self.difficulty)
        self.chain.append(new_block)
        return {"index": new_block.index, "hash": new_block.hash[:16] + "..."}

    def validate_chain(self):
        """Validate the entire blockchain."""
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]
            if current.hash != current.calculate_hash():
                return {"valid": False, "error": f"Block {i} hash mismatch"}
            if current.previous_hash != previous.hash:
                return {"valid": False, "error": f"Block {i} chain break"}
        return {"valid": True, "length": len(self.chain)}

    def get_chain(self):
        """Get the full chain as serializable data."""
        return [
            {
                "index": b.index,
                "hash": b.hash,
                "previous_hash": b.previous_hash,
                "data": b.data,
                "nonce": b.nonce,
                "timestamp": b.timestamp,
            }
            for b in self.chain
        ]
