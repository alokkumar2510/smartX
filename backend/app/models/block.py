"""
─── block.py ─────────────────────────────────────────────
Blockchain block data model.
"""
from pydantic import BaseModel


class BlockModel(BaseModel):
    index: int
    hash: str
    previous_hash: str
    data: str
    nonce: int
    timestamp: float
