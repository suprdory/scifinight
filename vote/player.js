// static/player.js

const log = console.log;

// Extract the session code and player ID from the URL only
const urlParams = new URLSearchParams(window.location.search);
const sessionCode = urlParams.get("code");
let playerId = urlParams.get("pid");

const backendUrl = "wss://meow.suprdory.com:8006/ws";
let ws;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Elements
const nameInput = document.getElementById("name");
const joinBtn = document.getElementById("join-btn");
const votingSection = document.getElementById("voting-section");
const status = document.getElementById("status");
const filmList = document.getElementById("film-list");
const playerHeader = document.getElementById("player-header");

let playerName = "";
let currentPlayer = "";
let films = [];

// Move currentSort outside the function to persist its state
let currentSort = { key: null, ascending: true };

// Initialize WebSocket connection
function initWebSocket() {
  ws = new WebSocket(`${backendUrl}/${sessionCode}`);
  
  ws.onopen = () => {
    log("WebSocket connection established");
    status.textContent = "Connected to session";
    
    // Get the name from URL if available (important for reconnection)
    const nameFromUrl = urlParams.get("name");
    if (nameFromUrl && !playerName) {
      playerName = nameFromUrl;
      nameInput.value = nameFromUrl;
    }
    
    // If we have a player ID from the URL, attempt to reconnect
    if (playerId && playerName) {
      log("Auto-reconnecting with player ID:", playerId, "and name:", playerName);
      ws.send(JSON.stringify({ 
        type: "join", 
        name: playerName, 
        player_id: playerId 
      }));
      votingSection.style.display = "block";
      hideJoinElements();
    }
  };
  
  ws.onclose = () => {
    log("WebSocket connection closed");
    status.textContent = "Connection lost. Attempting to reconnect...";
    
    // Attempt to reconnect with backoff
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000);
      reconnectAttempts++;
      
      setTimeout(() => {
        initWebSocket();
      }, delay);
    } else {
      status.textContent = "Unable to reconnect. Please refresh the page.";
    }
  };
  
  ws.onerror = (error) => {
    log("WebSocket error:", error);
  };
  
  // Listen for messages from the server
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    log("Received data:", data);
    
    if (data.type) {
      // Handle specific message types
      if (data.type === "player_id") {
        // Handle player_id message (server assigns an ID to the player)
        playerId = data.id;
        log("Received player ID:", playerId);
        
        // Update URL with player ID and ensure name is also in URL for easier reconnection
        const newUrl = new URL(window.location);
        newUrl.searchParams.set("pid", playerId);
        if (playerName) {
          newUrl.searchParams.set("name", playerName);
        }
        window.history.replaceState({}, '', newUrl);
        
        // Log success message
        console.log(`Player ID set: ${playerId}. URL updated for reconnection.`);
        
        return;
      } else if (data.type === "reconnect_success") {
        // Handle reconnect_success message
        playerName = data.name;
        
        // Create a success notification for reconnection
        const reconnectNotification = document.createElement('div');
        reconnectNotification.style.position = 'fixed';
        reconnectNotification.style.top = '10px';
        reconnectNotification.style.right = '10px';
        reconnectNotification.style.backgroundColor = '#4CAF50'; // Green
        reconnectNotification.style.color = 'white';
        reconnectNotification.style.padding = '10px 15px';
        reconnectNotification.style.borderRadius = '5px';
        reconnectNotification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        reconnectNotification.style.zIndex = '1000';
        reconnectNotification.textContent = `Successfully reconnected as ${playerName}`;
        document.body.appendChild(reconnectNotification);
        
        // Fade out notification after a few seconds
        setTimeout(() => {
          reconnectNotification.style.transition = 'opacity 1s ease';
          reconnectNotification.style.opacity = '0';
          setTimeout(() => reconnectNotification.remove(), 1000);
        }, 3000);
        
        status.textContent = `Reconnected as ${playerName}`;
        status.style.color = "#4CAF50"; // Green color for success
        votingSection.style.display = "block";
        hideJoinElements();
        
        // Ensure URL has both player ID and name
        const newUrl = new URL(window.location);
        newUrl.searchParams.set("name", playerName);
        if (playerId) {
          newUrl.searchParams.set("pid", playerId);
        }
        window.history.replaceState({}, '', newUrl);
        
        return;
      } else if (data.type === "kicked") {
        // Create a more prominent kicked notification
        const kickedNotification = document.createElement('div');
        kickedNotification.style.position = 'fixed';
        kickedNotification.style.top = '50%';
        kickedNotification.style.left = '50%';
        kickedNotification.style.transform = 'translate(-50%, -50%)';
        kickedNotification.style.backgroundColor = '#f44336';
        kickedNotification.style.color = 'white';
        kickedNotification.style.padding = '20px';
        kickedNotification.style.borderRadius = '5px';
        kickedNotification.style.textAlign = 'center';
        kickedNotification.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        kickedNotification.style.zIndex = '1000';
        kickedNotification.innerHTML = '<h3>You have been kicked!</h3><p>' + 
          (data.message || "You have been removed from the session by the host.") + '</p>';
        document.body.appendChild(kickedNotification);
        
        // Handle being kicked from the session
        status.textContent = data.message || "You have been kicked from the session";
        status.style.color = "#f44336"; // Red color
        status.style.fontWeight = "bold";
        
        // Hide voting section
        votingSection.style.display = "none";
        
        // Fade out the notification after a few seconds
        setTimeout(() => {
          kickedNotification.style.transition = 'opacity 1s ease';
          kickedNotification.style.opacity = '0';
          setTimeout(() => kickedNotification.remove(), 1000);
        }, 3000);
        
        // Show rejoin option after a short time
        setTimeout(() => {
          // Reset UI
          document.getElementById("join-header").style.display = "block";
          nameInput.style.display = "block";
          joinBtn.style.display = "block";
          
          const nameLabel = document.querySelector("label[for='name']");
          if (nameLabel) {
            nameLabel.style.display = "block";
          }
          
          // Clear the name input to encourage a new name
          nameInput.value = "";
          
          status.textContent = "You were removed from the session by the host. You may rejoin with a different name.";
          status.style.color = "#ff9800"; // Orange warning color
          status.style.fontWeight = "normal";
          
          // Add a rejoin button for better UX
          const rejoinContainer = document.createElement('div');
          rejoinContainer.style.marginTop = '10px';
          rejoinContainer.innerHTML = '<p>Please enter a new name to rejoin the session.</p>';
          
          // Insert the container before the join button
          joinBtn.parentNode.insertBefore(rejoinContainer, joinBtn);
          
          // Put focus on the name input for quick reentry
          nameInput.focus();
          
          // Clear player ID to ensure they join as a new player
          playerId = null;
          
          // Update URL to remove player ID
          const newUrl = new URL(window.location);
          newUrl.searchParams.delete("pid");
          window.history.replaceState({}, '', newUrl);
        }, 3000); // Reduced from 5000ms to 3000ms for better UX
        
        return;
      } else if (data.type === "error") {
        // Handle error messages with better styling
        status.textContent = data.message || "An error occurred";
        status.style.color = "#f44336"; // Red color
        status.style.padding = "10px";
        status.style.backgroundColor = "rgba(244, 67, 54, 0.1)"; // Light red background
        status.style.borderRadius = "4px";
        status.style.marginBottom = "15px";
        
        // Special treatment for the "voting in progress" error
        if (data.vote_in_progress) {
          // Create a more helpful message with guidance
          const errorContainer = document.createElement('div');
          errorContainer.style.marginTop = '15px';
          errorContainer.innerHTML = `
            <p style="font-weight:bold">Why can't I join?</p>
            <p>The voting session has already begun and no new players can join once voting starts.</p>
            <p>You can:</p>
            <ul>
              <li>Wait for this session to end and a new one to start</li>
              <li>Ask the host to end the current session and start a new one</li>
            </ul>
          `;
          
          // Add the container below the status element
          status.parentNode.insertBefore(errorContainer, status.nextSibling);
        }
        
        // Reset styling after some time (but keep the text)
        setTimeout(() => {
          status.style.backgroundColor = "";
          status.style.padding = "";
        }, 5000);
        
        return;
      } else if (data.type === "state_update") {
        // Handle regular game state update
        films = data.filmsRemaining;
        currentPlayer = data.currentPlayer;
        
        // Update UI
        playerHeader.textContent = `Welcome, ${playerName}`;
        updateFilmList(data);
      }
    }
  };
}

// Start WebSocket connection
initWebSocket();

function hideJoinElements() {
  document.getElementById("join-header").style.display = "none";
  nameInput.style.display = "none";
  joinBtn.style.display = "none";
  
  const nameLabel = document.querySelector("label[for='name']");
  if (nameLabel) {
    nameLabel.style.display = "none";
  }
}

// Send join request when user clicks the join button
joinBtn.addEventListener("click", () => {
  playerName = nameInput.value.trim();
  if (!playerName) {
    // Show validation message
    status.textContent = "Please enter your name";
    status.style.color = "#f44336"; // Red
    return;
  }
  
  if (ws.readyState === WebSocket.OPEN) {
    log("Joining with name:", playerName, "and existing player ID:", playerId || "none");
    
    // Update URL with player name for easier reconnection
    const newUrl = new URL(window.location);
    newUrl.searchParams.set("name", playerName);
    if (playerId) {
      newUrl.searchParams.set("pid", playerId);
    }
    window.history.replaceState({}, '', newUrl);
    
    // Send join request to server
    ws.send(JSON.stringify({ 
      type: "join", 
      name: playerName,
      player_id: playerId // Include ID if we have one from a previous session
    }));
    
    status.textContent = "Joining session...";
    status.style.color = ""; // Reset color
    
    votingSection.style.display = "block";
    hideJoinElements();
  } else {
    status.textContent = "Connection not ready. Please try again in a moment.";
    status.style.color = "#f44336"; // Red
  }
});

// Set player name from URL if available
window.addEventListener('DOMContentLoaded', () => {
  const nameFromUrl = urlParams.get("name");
  if (nameFromUrl) {
    nameInput.value = nameFromUrl;
    playerName = nameFromUrl;
    
    log("Found player name in URL:", playerName);
    
    // Note: We don't try to auto-reconnect here anymore
    // The reconnection will happen in the WebSocket onopen handler
    // This ensures the WebSocket is ready when we attempt to reconnect
  }
  
  // Display reconnection status if we have both ID and name
  if (playerId && playerName) {
    status.textContent = "Reconnecting...";
    status.style.color = "#ff9800"; // Orange color to indicate reconnecting state
  }
});

// Update the list of films
function updateFilmList(state) {
  filmList.innerHTML = "";

  if (state.started) {
    status.textContent = `Current turn: ${state.currentPlayer}`;
    if (playerName === state.currentPlayer) {
      status.textContent += " (Your turn!)";
    }

    // Create a table for displaying films
    const table = document.createElement("table");
    table.innerHTML = `
            <thead>
                <tr>
                    <th class="sortable" data-sort="Title">Title</th>
                    <th class="sortable" data-sort="Runtime">Length</th>
                    <th class="sortable" data-sort="Year">Year</th>
                    <th class="sortable" data-sort="IMDb">IMDb</th>
                    <th class="sortable" data-sort="RT">RT</th>
                    <th class="sortable" data-sort="Season">Season</th>
                    <th class="sortable" data-sort="BoxOffice">Box Office</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
    filmList.appendChild(table);

    const tbody = table.querySelector("tbody");

    // Add sorting functionality
    const headers = table.querySelectorAll(".sortable");
    headers.forEach((header) => {
      header.addEventListener("click", () => {
        const sortKey = header.dataset.sort;
        if (currentSort.key === sortKey) {
          currentSort.ascending = !currentSort.ascending;
        } else {
          currentSort.key = sortKey;
          currentSort.ascending = true;
        }

        // Update sorting logic to ensure missing values sort last
        state.filmsRemaining.sort((a, b) => {
          const aValue = a[sortKey] === null || a[sortKey] === undefined ? (currentSort.ascending ? Infinity : -Infinity) : a[sortKey];
          const bValue = b[sortKey] === null || b[sortKey] === undefined ? (currentSort.ascending ? Infinity : -Infinity) : b[sortKey];
          if (aValue < bValue) return currentSort.ascending ? -1 : 1;
          if (aValue > bValue) return currentSort.ascending ? 1 : -1;
          return 0;
        });

        // Update the sort indicator (optional)
        headers.forEach((h) => h.classList.remove("ascending", "descending"));
        header.classList.add(currentSort.ascending ? "ascending" : "descending");

        updateFilmList(state); // Re-render the list
      });
    });

    // Render each film
    state.filmsRemaining.forEach((film) => {
      const row = document.createElement("tr");
      row.innerHTML = `
                <td>${film.Title}</td>
                <td>${film.Runtime}</td>
                <td>${film.Year}</td>
                <td>${film.IMDb !== null ? film.IMDb : ""}</td>
                <td>${film.RT !== null ? film.RT : ""}</td>
                <td>${film.Season}</td>
                <td>${film.BoxOffice !== null ? `$${(film.BoxOffice / 1_000_000).toFixed(1)}M` : ""}</td>
            `;

      // Always make rows clickable to view details
      row.classList.add("clickable");
      row.addEventListener("click", () => {
        showFilmDetails(film, state);
      });

      tbody.appendChild(row);
    });
  } else {
    status.textContent = "Waiting for host to start the vote...";
  }
}

// Show detailed view of a film
function showFilmDetails(film, state) {
  filmList.innerHTML = "";

  const details = document.createElement("div");
  details.classList.add("film-details");
  details.innerHTML = `
    <h2>${film.Title} (${film.Year})</h2>
    <p><strong>Runtime:</strong> ${film.Runtime}</p>
    <p><strong>Plot:</strong> ${film.Plot !== null ? film.Plot : "N/A"}</p>
    <p><strong>IMDb:</strong> ${film.IMDb !== null ? film.IMDb : "N/A"}</p>
    <p><strong>RT:</strong> ${film.RT !== null ? film.RT : "N/A"}</p>
    <p><strong>Box Office:</strong> ${film.BoxOffice !== null ? `$${(film.BoxOffice / 1_000_000).toFixed(1)}M` : "N/A"}</p>
    <p><strong>Actors:</strong> ${film.Actors}</p>
    <p><strong>Director:</strong> ${film.Director}</p>
    <p><strong>Language:</strong> ${film.Language}</p>
    <p><strong>Season:</strong> ${film.Season}</p>
    <button class="eliminate" ${playerName !== state.currentPlayer ? "disabled" : ""}>Vote to Eliminate</button>
    <button class="back-to-list">Back to List</button>
  `;

  // Add event listener to vote for elimination
  const eliminateButton = details.querySelector(".eliminate");
  if (playerName === state.currentPlayer) {
    eliminateButton.addEventListener("click", () => {
      ws.send(JSON.stringify({ type: "eliminate", film: film.Title }));
    });
  }

  // Add event listener to go back to the list
  details.querySelector(".back-to-list").addEventListener("click", () => {
    updateFilmList(state);
  });

  filmList.appendChild(details);
}
