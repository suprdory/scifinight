from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import json
import random
import string  # For generating short IDs
import csv

# from fastapi.staticfiles import StaticFiles
# from fastapi.responses import HTMLResponse
# import uvicorn

app = FastAPI()
# app.mount("/static", StaticFiles(directory="static"), name="static")

# Function to generate a 6-character random ID
def generate_short_id(length=6):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

# Load all available films from CSV
with open("../scifi_data.csv", newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    all_films = list(reader)

# Global dictionary to manage sessions by code
sessions = {}

@app.websocket("/ws/{session_code}")
async def websocket_endpoint(websocket: WebSocket, session_code: str):
    await websocket.accept()

    # Create session if it doesn't exist
    if session_code not in sessions:
        print(sessions)
        host_id = generate_short_id()
        sessions[session_code] = {
            "host": {"ws": websocket, "id": host_id},  # Give the host a short ID
            "clients": [],
            "players": [],
            "films_remaining": [],
            "eliminated_films": [],
            "current_turn": 0,
            "started": False,
            "player_ids": {},  # Map of player names to unique IDs
            "winner": None,    # Will hold the winning film when only one remains
            "vote_style": "one-by-one",  # Default voting style
            "hybrid_threshold": 10,      # Default threshold for hybrid mode
            "group_a": [],     # For 50/50 voting: first group of films
            "group_b": []      # For 50/50 voting: second group of films
        }
        # Send the host their ID immediately
        await websocket.send_json({"type": "player_id", "id": host_id})

    session = sessions[session_code]
    session["clients"].append(websocket)

    try:
        while True:
            data = await websocket.receive_json()

            if data["type"] == "join":
                # Check if this is a reconnection
                player_name = data["name"]
                player_id = data.get("player_id")
                
                # Check if vote has already started - only allow reconnections after vote starts
                if session["started"] and not (player_id and player_id in session["player_ids"].values()):
                    # New player trying to join after vote started - reject with clear message
                    await websocket.send_json({
                        "type": "error", 
                        "message": "Cannot join after voting has started. Please wait for the host to start a new session.",
                        "vote_in_progress": True  # Add a flag to differentiate this error type
                    })
                    
                    print(f"Rejected new player join attempt during active vote. Session: {session_code}")
                elif player_id and player_id in session["player_ids"].values():
                    # This is a reconnection
                    # Update the player's websocket
                    player_found = False
                    for player in session["players"]:
                        if player.get("id") == player_id:
                            player_found = True
                            player["ws"] = websocket
                            # Update player name in player_ids if needed
                            old_name = player["name"]
                            if old_name != player_name and old_name in session["player_ids"]:
                                # Player changed their name during reconnection
                                del session["player_ids"][old_name]
                                session["player_ids"][player_name] = player_id
                                player["name"] = player_name
                                
                            # Send confirmation of reconnection
                            await websocket.send_json({
                                "type": "reconnect_success", 
                                "name": player["name"]
                            })
                            
                            # Log successful reconnection
                            print(f"Player reconnected: {player_name} (ID: {player_id})")
                            break
                            
                    if not player_found:
                        # This case can happen if player_id exists but player record was removed
                        # Send an error to the client
                        await websocket.send_json({
                            "type": "error",
                            "message": "Failed to reconnect. Your session may have expired."
                        })
                else:
                    # New player joining
                    new_id = generate_short_id()
                    session["player_ids"][player_name] = new_id
                    session["players"].append({
                        "name": player_name, 
                        "ws": websocket,
                        "id": new_id
                    })
                    # Send the player their ID for future reconnections
                    await websocket.send_json({"type": "player_id", "id": new_id})
                
                await broadcast_state(session_code)

            elif data["type"] == "host_reconnect":
                # Host reconnection using their ID
                host_id = data.get("host_id")
                if host_id and host_id == session["host"]["id"]:
                    session["host"]["ws"] = websocket
                    await websocket.send_json({"type": "reconnect_success", "is_host": True})
                    await broadcast_state(session_code)
                
            elif data["type"] == "start":
                if websocket == session["host"]["ws"]:  # Updated host reference
                    # Get voting style settings from the data
                    vote_style = data.get("vote_style", "one-by-one")
                    hybrid_threshold = int(data.get("hybrid_threshold", 10))
                    
                    # Update session with voting style settings
                    session["vote_style"] = vote_style
                    session["hybrid_threshold"] = hybrid_threshold
                    
                    # Shuffle films and start session
                    all_films = random.sample(data["films"], len(data["films"]))
                    session["films_remaining"] = all_films
                    session["eliminated_films"] = []
                    session["current_turn"] = 0
                    session["started"] = True
                    
                    # If using 50/50 or hybrid voting style, split films into two groups initially
                    if vote_style in ["fifty-fifty", "hybrid"]:
                        mid_point = len(all_films) // 2
                        session["group_a"] = all_films[:mid_point]
                        session["group_b"] = all_films[mid_point:]
                    
                    print(f"Starting vote with style: {vote_style}" + 
                          (f", threshold: {hybrid_threshold}" if vote_style == "hybrid" else ""))
                    
                    await broadcast_state(session_code)

            elif data["type"] == "eliminate":
                if session["started"] and session["players"][session["current_turn"]]["ws"] == websocket:
                    vote_style = session["vote_style"]
                    
                    # Handle one-by-one elimination style
                    if vote_style == "one-by-one" or (vote_style == "hybrid" and len(session["films_remaining"]) <= session["hybrid_threshold"]):
                        film_to_remove = data["film"]
                        session["films_remaining"] = [
                            f for f in session["films_remaining"] if f["Title"] != film_to_remove]
                        session["eliminated_films"].append(film_to_remove)
                        
                    # Handle 50/50 elimination style
                    elif vote_style == "fifty-fifty" or (vote_style == "hybrid" and len(session["films_remaining"]) > session["hybrid_threshold"]):
                        # Get which group to eliminate (A or B)
                        group_to_eliminate = data.get("group", "")
                        
                        if group_to_eliminate == "A":
                            # Add all Group A films to eliminated list
                            for film in session["group_a"]:
                                session["eliminated_films"].append(film)
                            # Keep only Group B films
                            session["films_remaining"] = session["group_b"]
                        elif group_to_eliminate == "B":
                            # Add all Group B films to eliminated list
                            for film in session["group_b"]:
                                session["eliminated_films"].append(film)
                            # Keep only Group A films
                            session["films_remaining"] = session["group_a"]
                        
                        # If in hybrid mode and now below threshold, transition to one-by-one style
                        if vote_style == "hybrid" and len(session["films_remaining"]) <= session["hybrid_threshold"]:
                            print(f"Hybrid mode transitioning to one-by-one elimination with {len(session['films_remaining'])} films remaining")
                            # When transitioning to one-by-one, clear groups so client doesn't try to use stale ones
                            session["group_a"] = []
                            session["group_b"] = []
                        # Otherwise, prepare new 50/50 groups for next round if applicable
                        # This covers pure "fifty-fifty" mode and "hybrid" mode still in 50/50 phase
                        elif vote_style == "fifty-fifty" or (vote_style == "hybrid" and len(session["films_remaining"]) > session["hybrid_threshold"]):
                            if len(session["films_remaining"]) > 2:  # More than 2 films, split normally
                                random.shuffle(session["films_remaining"])
                                mid_point = len(session["films_remaining"]) // 2
                                session["group_a"] = session["films_remaining"][:mid_point]
                                session["group_b"] = session["films_remaining"][mid_point:]
                            elif len(session["films_remaining"]) == 2: # Exactly 2 films, split into 1v1 groups
                                # random.shuffle(session["films_remaining"]) # Optional: shuffle if order matters
                                session["group_a"] = [session["films_remaining"][0]]
                                session["group_b"] = [session["films_remaining"][1]]
                            else: # 0 or 1 film remaining (winner state or empty), groups should be empty
                                session["group_a"] = []
                                session["group_b"] = []
                    
                    # Check if we have a winner (only one film left)
                    if len(session["films_remaining"]) == 1:
                        session["winner"] = session["films_remaining"][0]
                        print(f"We have a winner: {session['winner']['Title']}")
                    elif len(session["films_remaining"]) > 1:
                        # Advance to next player regardless of voting style
                        session["current_turn"] = (
                            session["current_turn"] + 1) % len(session["players"])
                    
                    await broadcast_state(session_code)
                    
            elif data["type"] == "reorder":
                new_order = data["order"]
                reordered_players = []

                # Preserve websocket associations and player IDs based on name
                name_to_player = {p["name"]: p for p in session["players"]}
                for name in new_order:
                    if name in name_to_player:
                        reordered_players.append(name_to_player[name])

                session["players"] = reordered_players
                session["current_turn"] = 0  # reset to first in new order
                await broadcast_state(session_code)
                
            elif data["type"] == "kick_player":
                # Only the host can kick players
                if websocket == session["host"]["ws"]:
                    player_to_kick = data["player"]
                    
                    # Find the player and their websocket
                    kicked_player_ws = None
                    for i, player in enumerate(session["players"]):
                        if player["name"] == player_to_kick:
                            kicked_player_ws = player["ws"]
                            
                            # Remove from player_ids dict
                            if player["name"] in session["player_ids"]:
                                del session["player_ids"][player["name"]]
                            
                            # Remove from players list
                            session["players"].pop(i)
                            
                            break
                    
                    # Send notification to the kicked player
                    if kicked_player_ws:
                        try:
                            await kicked_player_ws.send_json({
                                "type": "kicked",
                                "message": "You have been removed from the session by the host.",
                                "can_rejoin": True  # Indicate that they can rejoin with a different name
                            })
                            
                            # Log the kick action
                            print(f"Player '{player_to_kick}' was kicked from session {session_code}")
                            
                            # Remove from clients
                            if kicked_player_ws in session["clients"]:
                                session["clients"].remove(kicked_player_ws)
                        except Exception as e:
                            print(f"Error sending kick notification: {e}")
                            # Player might already be disconnected
                    
                    # Check if the kicked player was the current player
                    was_current_player = False
                    if session["players"] and session["started"]:
                        if session["current_turn"] >= len(session["players"]):
                            # The current player was removed, adjust turn index and mark for broadcast
                            was_current_player = True
                            session["current_turn"] = 0
                    
                    # Broadcast updated state
                    await broadcast_state(session_code)
                    
                    # If this was the current player's turn, immediately send a follow-up
                    # state update to ensure all clients are properly notified about the new current player
                    if was_current_player and session["started"]:
                        # Small delay to ensure clients process messages in order
                        import asyncio
                        await asyncio.sleep(0.2)
                        await broadcast_state(session_code)

    except WebSocketDisconnect:
        # Remove client but don't remove players (they can reconnect)
        session["clients"].remove(websocket)
        # Only mark the websocket as disconnected, but keep the player data
        for player in session["players"]:
            if player["ws"] == websocket:
                player["ws"] = None  # Mark as disconnected
        
        # If the host disconnected, mark their websocket as None
        if session["host"]["ws"] == websocket:
            session["host"]["ws"] = None
            
        await broadcast_state(session_code)


async def broadcast_state(session_code):
    session = sessions[session_code]
    
    # Validate the current turn index to prevent out of bounds errors
    # This can happen if players are kicked or leave
    if session["players"] and session["started"]:
        if session["current_turn"] >= len(session["players"]):
            session["current_turn"] = 0
    
    # Determine the current player safely
    current_player = None
    if session["players"] and session["films_remaining"] and session["started"]:
        current_player = session["players"][session["current_turn"]]["name"]
    
    state = {
        "type": "state_update",  # Add a type field to distinguish from other message types
        "filmsRemaining": session["films_remaining"],
        "films_remaining": session["films_remaining"],  # Explicit for host status panel
        "eliminated": session["eliminated_films"],
        "players": [p["name"] for p in session["players"]],
        "currentPlayer": current_player,
        "current_turn": session["current_turn"],  # Include current turn index
        "started": session["started"],
        "connected_players": [p["name"] for p in session["players"] if p["ws"] is not None],
        "winner": session.get("winner"),  # Include winner information if available
        "has_winner": session.get("winner") is not None,
        "vote_style": session.get("vote_style", "one-by-one"),  # Voting style
        "hybrid_threshold": session.get("hybrid_threshold", 10),  # Hybrid threshold
        "group_a": session.get("group_a", []),  # Group A films for 50/50 voting
        "group_b": session.get("group_b", [])   # Group B films for 50/50 voting
    }
    
    # Log state for debugging
    print(f"Broadcasting state: Vote started={session['started']}, " 
          f"Players={len(session['players'])}, Current turn={session['current_turn']}, "
          f"Current player={current_player}")
    
    for client in session["clients"]:
        try:
            await client.send_json(state)
        except Exception as e:
            print(f"Error sending to client: {e}")
            # Client might be disconnected, but we continue with others
