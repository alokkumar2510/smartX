import sys
sys.path.insert(0, '.')
from server.blockchain import blockchain
from server.plugins.blockchain_plugin import blockchain_plugin
print(f'Blockchain: {blockchain.get_stats()["chain_length"]} blocks')
print(f'Plugin: {blockchain_plugin.name}')

# Test WS Bridge imports
from server.ws_bridge import ChatBridge
print('WS Bridge with Blockchain + WebRTC: OK')
