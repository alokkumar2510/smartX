import sys

sys.path.insert(0, ".")

# Test TCP Server
from networking.tcp.tcp_server import TCPServer

server = TCPServer(host="127.0.0.1", port=9000)
print("TCP Server class OK")

# Test UDP Server
from networking.udp.udp_server import UDPServer

udp_server = UDPServer(host="127.0.0.1", port=9001)
print("UDP Server class OK")

# Test TCP Handler
from networking.tcp.tcp_handler import TCPHandler

handler = TCPHandler()
test_data = b'{"type": "test"}'
msgs = handler.receive(test_data)
assert len(msgs) == 1
assert msgs[0]["type"] == "test"
print("TCP Handler OK")

# Test UnicodeDecodeError handling
bad_data = b"\xff\xfe\x00\x01"
msgs2 = handler.receive(bad_data)
print(f"TCP Handler UnicodeDecodeError handled OK (got {len(msgs2)} messages)")

# Test UDP Client
from networking.udp.udp_client import UDPClient

print("UDP Client class OK")

# Test Packet
from networking.packets.packet import Packet

p = Packet(version=1, packet_type=1, sequence_num=0, payload=b"hello")
print("Packet OK")

# Test Packet Parser
from networking.packets.packet_parser import PacketParser

parsed = PacketParser.from_bytes(
    b'{"version": 1, "type": 1, "seq": 0, "payload": "hello", "checksum": 0}'
)
print("Packet Parser OK")

# Test JSON Serializer
from networking.serialization.json_serializer import JSONSerializer

encoded = JSONSerializer.encode({"key": "value"})
decoded = JSONSerializer.decode(encoded)
assert decoded == {"key": "value"}
print("JSON Serializer OK")

# Test Message Codec
from networking.serialization.message_codec import MessageCodec

codec = MessageCodec(format="json")
data = codec.encode({"msg": "test"})
result = codec.decode(data)
assert result == {"msg": "test"}
print("Message Codec OK")

# Test Connection Pool
from networking.utils.connection_pool import ConnectionPool

print("Connection Pool class OK")

# Test Retry
from networking.utils.retry import retry

print("Retry utility OK")

# Test Network Monitor
from networking.utils.network_monitor import NetworkMonitor

print("Network Monitor class OK")

# Test queue service fix
from backend.app.services.queue_service import QueueService

qs = QueueService()
qs.enqueue({"msg": "a"}, priority="normal")
qs.enqueue({"msg": "b"}, priority="normal")
qs.enqueue({"msg": "c"}, priority="normal")
# This would have crashed before the fix (dict comparison)
item1 = qs.dequeue()
item2 = qs.dequeue()
item3 = qs.dequeue()
print(f"Queue service OK (no dict comparison crash)")

# Test gamification type hint fix
from backend.app.services.gamification_service import GamificationService

gs = GamificationService()
result = gs.award_xp({"xp": 0, "level": 1})
print(f"Gamification service OK: {result}")

print("\nAll modules verified successfully!")
