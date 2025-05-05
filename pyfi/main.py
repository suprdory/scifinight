from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn
import json
import random

# Create FastAPI app instance
app = FastAPI()

# Mount the static directory to serve frontend files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Load all films from a JSON file
with open("../films.json") as f:
    all_films = json.load(f)

# Global state variables
clients = []  # List of all connected WebSocket clients
players = []  # List of players with their name and WebSocket
current_turn = 0  # Index of the current player's turn
films_remaining = []  # Films still in the game
eliminated_films = []  # Films that have been eliminated

# Serve the frontend HTML
# @app.get("/")
# async def get():
#     with open("static/index.html") as f:
#         return HTMLResponse(f.read())

# Handle WebSocket connections
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)

    try:
        while True:
            # Wait for a message from client
            data = await websocket.receive_json()

            # Handle a player joining the game
            if data["type"] == "join":
                players.append({"name": data["name"], "ws": websocket})
                await broadcast_state()

            # Start the game: shuffle films and reset state
            elif data["type"] == "start":
                global films_remaining, current_turn, eliminated_films
                films_remaining = random.sample(all_films, len(all_films))
                current_turn = 0
                eliminated_films = []
                await broadcast_state()

            # Handle a film elimination by the current player
            elif data["type"] == "eliminate":
                # Only allow the current player to eliminate a film
                if players[current_turn]["ws"] == websocket:
                    film_to_remove = data["film"]

                    # Remove the chosen film
                    films_remaining = [f for f in films_remaining if f["Title"] != film_to_remove]
                    eliminated_films.append(film_to_remove)

                    # Advance turn if more than one film remains
                    if len(films_remaining) > 1:
                        current_turn = (current_turn + 1) % len(players)

                    await broadcast_state()

    # Handle disconnection of a client
    except WebSocketDisconnect:
        clients.remove(websocket)

        # Remove the disconnected player from the list
        for p in players:
            if p["ws"] == websocket:
                players.remove(p)
                break

        await broadcast_state()

# Broadcast the current game state to all connected clients
async def broadcast_state():
    state = {
        "filmsRemaining": films_remaining,
        "eliminated": eliminated_films,
        "players": [p["name"] for p in players],
        "currentPlayer": players[current_turn]["name"] if players and films_remaining else None,
    }

    for client in clients:
        try:
            await client.send_json(state)
        except:
            pass  # Fail silently if client disconnects during send

# Run the FastAPI app with uvicorn
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8006, reload=True)
    