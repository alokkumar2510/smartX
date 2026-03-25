"""
─── chat_controller.py ───────────────────────────────────
Orchestrates chat operations. Delegates to services.
"""
from app.services.message_service import MessageService
from datetime import datetime


class ChatController:
    def __init__(self):
        self.message_service = MessageService()
        self.rooms = {"general": {"name": "General", "created": datetime.utcnow().isoformat()}}

    async def get_history(self, room_id: str, limit: int):
        """Retrieve chat history for a room."""
        messages = self.message_service.get_messages(room_id, limit)
        return {"room_id": room_id, "messages": messages, "count": len(messages)}

    async def send_message(self, payload: dict):
        """Process and store a new message."""
        message = self.message_service.process_message(payload)
        return {"status": "sent", "message": message}

    async def get_rooms(self):
        """Return all available chat rooms."""
        return {"rooms": list(self.rooms.values())}

    async def create_room(self, name: str):
        """Create a new chat room."""
        room_id = name.lower().replace(" ", "-")
        self.rooms[room_id] = {"name": name, "created": datetime.utcnow().isoformat()}
        return {"room_id": room_id, "name": name}

    async def handle_ws_message(self, data: dict):
        """Handle incoming WebSocket message."""
        msg_type = data.get("type", "chat_message")

        if msg_type == "chat_message":
            message = self.message_service.process_message(data)
            return {"type": "chat_message", **message}

        return {"type": "ack", "status": "received"}
