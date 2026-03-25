"""
─── chat_routes.py ───────────────────────────────────────
Chat-related API endpoints.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.controllers.chat_controller import ChatController

router = APIRouter()
controller = ChatController()


@router.get("/history/{room_id}")
async def get_chat_history(room_id: str, limit: int = 50):
    """Get chat message history for a room."""
    return await controller.get_history(room_id, limit)


@router.post("/send")
async def send_message(payload: dict):
    """Send a chat message via REST (fallback)."""
    return await controller.send_message(payload)


@router.get("/rooms")
async def get_rooms():
    """Get all available chat rooms."""
    return await controller.get_rooms()


@router.post("/rooms")
async def create_room(payload: dict):
    """Create a new chat room."""
    return await controller.create_room(payload.get("name", "General"))


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time chat."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            response = await controller.handle_ws_message(data)
            await websocket.send_json(response)
    except WebSocketDisconnect:
        pass
