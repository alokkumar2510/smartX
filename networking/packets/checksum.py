"""
─── checksum.py ──────────────────────────────────────────
CRC32 checksum calculation and verification.
"""
import zlib


def calculate_checksum(data: bytes) -> int:
    """Calculate CRC32 checksum for data."""
    return zlib.crc32(data) & 0xFFFFFFFF


def verify_checksum(data: bytes, expected: int) -> bool:
    """Verify data integrity against expected checksum."""
    return calculate_checksum(data) == expected
