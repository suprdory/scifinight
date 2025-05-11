from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn
import json
import random
import string

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# Load all available films from JSON
with open("../films.json") as f:
    all_films = json.load(f)

# Global dictionary to manage sessions by code
sessions = {}



@app.websocket("/ws/{session_code}")
async def websocket_endpoint(websocket: WebSocket, session_code: str):
    await websocket.accept()

    # Create session if it doesn't exist
    if session_code not in sessions:
        sessions[session_code] = {
            "host": websocket,
            "clients": [],
            "players": [],
            "films_remaining": [],
            "eliminated_films": [],
            "current_turn": 0,
            "started": False
        }

    session = sessions[session_code]
    session["clients"].append(websocket)

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "join":
                session["players"].append(
                    {"name": data["name"], "ws": websocket})
                await broadcast_state(session_code)

            elif data["type"] == "start":
                if websocket == session["host"]:
                    # Shuffle films and start session
                    session["films_remaining"] = random.sample(
                        data["films"], len(data["films"]))
                    session["eliminated_films"] = []
                    session["current_turn"] = 0
                    session["started"] = True
                    await broadcast_state(session_code)

            elif data["type"] == "eliminate":
                if session["started"] and session["players"][session["current_turn"]]["ws"] == websocket:
                    film_to_remove = data["film"]
                    session["films_remaining"] = [
                        f for f in session["films_remaining"] if f["Title"] != film_to_remove]
                    session["eliminated_films"].append(film_to_remove)
                    if len(session["films_remaining"]) > 1:
                        session["current_turn"] = (
                            session["current_turn"] + 1) % len(session["players"])
                    await broadcast_state(session_code)
            elif data["type"] == "reorder":
                new_order = data["order"]
                reordered_players = []

                # Preserve websocket associations based on name
                name_to_ws = {p["name"]: p["ws"] for p in session["players"]}
                for name in new_order:
                    if name in name_to_ws:
                        reordered_players.append({"name": name, "ws": name_to_ws[name]})

                session["players"] = reordered_players
                session["current_turn"] = 0  # reset to first in new order
                await broadcast_state(session_code)

    except WebSocketDisconnect:
        # Remove client and update players
        session["clients"].remove(websocket)
        session["players"] = [
            p for p in session["players"] if p["ws"] != websocket]
        await broadcast_state(session_code)


async def broadcast_state(session_code):
    session = sessions[session_code]
    state = {
        "filmsRemaining": session["films_remaining"],
        "eliminated": session["eliminated_films"],
        "players": [p["name"] for p in session["players"]],
        "currentPlayer": session["players"][session["current_turn"]]["name"] if session["players"] and session["films_remaining"] else None,
        "started": session["started"]
    }
    for client in session["clients"]:
        try:
            await client.send_json(state)
        except:
            pass


def generate_session_code(length=6):
    """Generates a random alphanumeric session code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


# if __name__ == "__main__":
#     # Run the FastAPI app without reload to avoid import string warning
#     uvicorn.run("main:app", host="0.0.0.0", port=8006)
