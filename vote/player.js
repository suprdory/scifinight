// static/player.js

const log = console.log;

// Extract the session code and player ID from the URL only
const urlParams = new URLSearchParams(window.location.search);
const sessionCode = urlParams.get("code");
let playerId = urlParams.get("pid");
const nameFromUrl = urlParams.get("name");

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
    
    // If we have a name from the URL and no player name yet, use it
    if (nameFromUrl && !playerName) {
      playerName = nameFromUrl;
      nameInput.value = nameFromUrl;
      log("Using name from URL:", playerName);
    }
    
    // If we have a player ID from the URL, attempt to reconnect
    if (playerId) {
      log("Auto-reconnecting with player ID:", playerId, playerName ? `and name: ${playerName}` : "");
      ws.send(JSON.stringify({ 
        type: "join", 
        name: playerName || "", // Send current name if available
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
        
        // Update URL with player ID and keep name for better user experience
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
        status.style.color = "#f0f0f0"; // White color for normal status
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
        status.style.color = "#f44336";        status.style.fontWeight = "bold";
        
        // Hide voting section
        votingSection.style.display = "none";
        
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
        
        // Update UI with white styling (default)
        playerHeader.textContent = `Welcome, ${playerName}`;
        // Let CSS handle the color (white)
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
    
    // Show "Joining session..." with default white styling
    status.textContent = "Joining session...";
    status.style.color = "#f0f0f0"; // White color for regular status
    
    // Create a welcome notification for all users
    const welcomeNotification = document.createElement('div');
    welcomeNotification.style.position = 'fixed';
    welcomeNotification.style.top = '10px';
    welcomeNotification.style.right = '10px';
    welcomeNotification.style.backgroundColor = '#4CAF50'; // Green
    welcomeNotification.style.color = 'white';
    welcomeNotification.style.padding = '10px 15px';
    welcomeNotification.style.borderRadius = '5px';
    welcomeNotification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    welcomeNotification.style.zIndex = '1000';
    welcomeNotification.textContent = `Welcome, ${playerName}!`;
    document.body.appendChild(welcomeNotification);
    
    // Fade out notification after a few seconds
    setTimeout(() => {
      welcomeNotification.style.transition = 'opacity 1s ease';
      welcomeNotification.style.opacity = '0';
      setTimeout(() => welcomeNotification.remove(), 1000);
    }, 3000);
    
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
  
  // Display reconnection status
  if (playerId && playerName) {
    status.textContent = "Reconnecting...";
    status.style.color = "#ff9800"; // Orange color for reconnection state
  }
});

// Show 50/50 voting groups
function show5050Groups(state) {
  filmList.innerHTML = "";
  
  // Create container for the two groups
  const groupsContainer = document.createElement("div");
  groupsContainer.className = "groups-container";
  
  // Add explanation for 50/50 voting
  const explanation = document.createElement("div");
  explanation.className = "voting-explanation";
  
  // Customize the explanation based on voting style
  const voteStyle = state.vote_style || "fifty-fifty";
  const isHybrid = voteStyle === "hybrid";
  const hybridThreshold = state.hybrid_threshold || 10;
  const filmsCount = state.filmsRemaining.length;
  
  if (isHybrid) {
    explanation.innerHTML = `
      <h3>50/50 Elimination Round (Hybrid Mode)</h3>
      <p>Choose which group of films to eliminate. The other group will continue to the next round.</p>
      <p><strong>Note:</strong> When ${hybridThreshold} films remain, voting will switch to one-by-one elimination.</p>
    `;
  } else {
    explanation.innerHTML = `
      <h3>50/50 Elimination Round</h3>
      <p>Choose which group of films to eliminate. The other group will continue to the next round.</p>
    `;
  }
  groupsContainer.appendChild(explanation);
  
  // Create Group A
  const groupA = document.createElement("div");
  groupA.className = "film-group group-a";
  
  // Create Group B
  const groupB = document.createElement("div");
  groupB.className = "film-group group-b";
  
  // Calculate average metrics for Group A
  const avgRuntimeA = state.group_a.reduce((sum, film) => sum + parseInt(film.Runtime || 0), 0) / 
                      (state.group_a.length || 1);
  const avgImdbA = state.group_a.reduce((sum, film) => {
    // Only add films with valid IMDb scores to the calculation
    return sum + (film.IMDb !== null && film.IMDb !== undefined ? parseFloat(film.IMDb) : 0);
  }, 0) / (state.group_a.filter(film => film.IMDb !== null && film.IMDb !== undefined).length || 1);
  const avgRtA = state.group_a.reduce((sum, film) => {
    // Only add films with valid RT scores to the calculation
    return sum + (film.RT !== null && film.RT !== undefined ? parseFloat(film.RT) : 0);
  }, 0) / (state.group_a.filter(film => film.RT !== null && film.RT !== undefined).length || 1);
  const avgYearA = state.group_a.reduce((sum, film) => {
    // Only add films with valid Year values to the calculation
    return sum + (film.Year !== null && film.Year !== undefined ? parseInt(film.Year) : 0);
  }, 0) / (state.group_a.filter(film => film.Year !== null && film.Year !== undefined).length || 1);
  
  // Calculate average metrics for Group B
  const avgRuntimeB = state.group_b.reduce((sum, film) => sum + parseInt(film.Runtime || 0), 0) / 
                      (state.group_b.length || 1);
  const avgImdbB = state.group_b.reduce((sum, film) => {
    // Only add films with valid IMDb scores to the calculation
    return sum + (film.IMDb !== null && film.IMDb !== undefined ? parseFloat(film.IMDb) : 0);
  }, 0) / (state.group_b.filter(film => film.IMDb !== null && film.IMDb !== undefined).length || 1);
  const avgRtB = state.group_b.reduce((sum, film) => {
    // Only add films with valid RT scores to the calculation
    return sum + (film.RT !== null && film.RT !== undefined ? parseFloat(film.RT) : 0);
  }, 0) / (state.group_b.filter(film => film.RT !== null && film.RT !== undefined).length || 1);
  const avgYearB = state.group_b.reduce((sum, film) => {
    // Only add films with valid Year values to the calculation
    return sum + (film.Year !== null && film.Year !== undefined ? parseInt(film.Year) : 0);
  }, 0) / (state.group_b.filter(film => film.Year !== null && film.Year !== undefined).length || 1);
  
  // Add headers for each group with film count and average metrics
  groupA.innerHTML = `
    <h3>Group A (${state.group_a.length} films)</h3>
    <div class="group-stats">
      <span>Avg. Runtime: ${Math.round(avgRuntimeA)} mins</span>
      <span>Avg. IMDb: ${avgImdbA.toFixed(1)}/10</span>
      <span>Avg. RT: ${Math.round(avgRtA)}%</span>
      <span>Avg. Year: ${Math.round(avgYearA)}</span>
    </div>
  `;
  
  groupB.innerHTML = `
    <h3>Group B (${state.group_b.length} films)</h3>
    <div class="group-stats">
      <span>Avg. Runtime: ${Math.round(avgRuntimeB)} mins</span>
      <span>Avg. IMDb: ${avgImdbB.toFixed(1)}/10</span>
      <span>Avg. RT: ${Math.round(avgRtB)}%</span>
      <span>Avg. Year: ${Math.round(avgYearB)}</span>
    </div>
  `;
  
  // Create film lists for each group
  const listA = document.createElement("ul");
  state.group_a.forEach(film => {
    const li = document.createElement("li");
    li.textContent = `${film.Title} (${film.Year}) - ${film.Runtime} mins`; // Add "mins" after runtime
    li.classList.add("clickable"); // Make the film item clickable
    li.addEventListener("click", () => {
      showFilmDetails(film, state); // Show details when clicked
    });
    listA.appendChild(li);
  });
  groupA.appendChild(listA);

  const listB = document.createElement("ul");
  state.group_b.forEach(film => {
    const li = document.createElement("li");
    li.textContent = `${film.Title} (${film.Year}) - ${film.Runtime} mins`; // Add "mins" after runtime
    li.classList.add("clickable"); // Make the film item clickable
    li.addEventListener("click", () => {
      showFilmDetails(film, state); // Show details when clicked
    });
    listB.appendChild(li);
  });
  groupB.appendChild(listB);
  
  // Add elimination buttons
  if (playerName === state.currentPlayer) {
    // Button for Group A
    const eliminateABtn = document.createElement("button");
    eliminateABtn.className = "eliminate-group";
    eliminateABtn.textContent = "Eliminate Group A";
    eliminateABtn.addEventListener("click", () => {
      ws.send(JSON.stringify({ type: "eliminate", group: "A" }));
    });
    groupA.appendChild(eliminateABtn);
    
    // Button for Group B
    const eliminateBBtn = document.createElement("button");
    eliminateBBtn.className = "eliminate-group";
    eliminateBBtn.textContent = "Eliminate Group B";
    eliminateBBtn.addEventListener("click", () => {
      ws.send(JSON.stringify({ type: "eliminate", group: "B" }));
    });
    groupB.appendChild(eliminateBBtn);
  }
  
  groupsContainer.appendChild(groupA);
  groupsContainer.appendChild(groupB);
  filmList.appendChild(groupsContainer);
}

// Update the list of films
function updateFilmList(state) {
  filmList.innerHTML = "";

  if (state.started) {
    // Check if we have a winner
    if (state.has_winner && state.winner) {
      status.textContent = `We have a winner!`;
      
      // Create winner announcement
      const winnerAnnouncement = document.createElement('div');
      winnerAnnouncement.className = 'winner-announcement';

      const posterPath = state.winner.poster_path ? `https://image.tmdb.org/t/p/w500${state.winner.poster_path}` : '';
      const posterHTML = posterPath ? `<img src="${posterPath}" alt="${state.winner.Title} Poster" class="winning-film-poster">` : '';

      winnerAnnouncement.innerHTML = `
        <h2>🏆 The Winning Film Is 🏆</h2>
        <div class="winning-film">
          ${posterHTML}
          <h1>${state.winner.Title}</h1>
          <h3>(${state.winner.Year})</h3>
          <p>${state.winner.Plot}</p>
          <p>Directed by: ${state.winner.Director}</p>
          <p>Runtime: ${state.winner.Runtime} minutes</p>
          <p>IMDb: ${state.winner.IMDb || 'N/A'} | Rotten Tomatoes: ${state.winner.RT || 'N/A'}</p>
        </div>
      `;
      filmList.appendChild(winnerAnnouncement);
      
      // The CSS is now in player.css so no need for inline styles
      
      return; // Exit early, no need to show the films table
    }
    
    // Regular vote in progress display
    let statusText = `Current turn: ${state.currentPlayer}`;
    
    // Add voting mode indicator
    const voteStyle = state.vote_style || "one-by-one";
    const isHybrid = voteStyle === "hybrid";
    const isFiftyFifty = voteStyle === "fifty-fifty";
    const hybridThreshold = state.hybrid_threshold || 10;
    const filmsCount = state.filmsRemaining.length;
    
    // Create voting mode indicator
    const voteModeIndicator = document.createElement('span');
    voteModeIndicator.className = 'voting-mode-indicator';
    
    if (isFiftyFifty) {
      voteModeIndicator.textContent = '50/50 Mode';
      voteModeIndicator.classList.add('voting-mode-fiftyfifty');
    } else if (isHybrid) {
      if (filmsCount <= hybridThreshold) {
        voteModeIndicator.textContent = 'Hybrid Mode: One-by-One Phase';
      } else {
        voteModeIndicator.textContent = 'Hybrid Mode: 50/50 Phase';
      }
      voteModeIndicator.classList.add('voting-mode-hybrid');
      voteModeIndicator.title = `Will switch to one-by-one elimination when ${hybridThreshold} or fewer films remain`;
    } else {
      voteModeIndicator.textContent = 'One-by-One Mode';
    }
    
    // Set the status text
    status.textContent = statusText;
    status.appendChild(voteModeIndicator);
    
    // Set the color based on whether it's this player's turn
    if (playerName === state.currentPlayer) {
      status.insertBefore(document.createTextNode(" (Your turn!)"), voteModeIndicator);
      status.style.color = "#4CAF50"; // Green color when it's the player's turn
      status.style.fontWeight = "bold";
    } else {
      status.style.color = "#f0f0f0"; // White color for others' turns
      status.style.fontWeight = "normal";
    }
    
    // Determine if we're in 50/50 mode (either directly or via hybrid)
    const using5050 = isFiftyFifty || (isHybrid && filmsCount > hybridThreshold);
    
    if (using5050) {
      // Display 50/50 groups for all players, but only current player can vote
      show5050Groups(state);
      return; // Exit early, we're showing groups instead of the film list
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

  // Determine if we are in a 50/50 phase to conditionally show the eliminate button
  const voteStyle = state.vote_style || "one-by-one"; // Default if not specified
  const isHybrid = voteStyle === "hybrid";
  const isFiftyFiftyDirect = voteStyle === "fifty-fifty";
  const filmsCount = state.filmsRemaining ? state.filmsRemaining.length : 0; // Default to 0 if filmsRemaining is not there
  const hybridThreshold = state.hybrid_threshold || 10; // Default hybrid threshold

  const in5050Phase = isFiftyFiftyDirect || (isHybrid && filmsCount > hybridThreshold);

  let buttonsHTML = '';
  // Only add the "Vote to Eliminate" button if NOT in a 50/50 phase
  if (!in5050Phase) {
    const disabledAttribute = playerName !== state.currentPlayer ? "disabled" : "";
    buttonsHTML += `<button class="eliminate" ${disabledAttribute}>Vote to Eliminate</button>`;
  }
  buttonsHTML += `<button class="back-to-list">Back to List</button>`;

  const posterPath = film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : '';
  const posterHTML = posterPath ? `<img src="${posterPath}" alt="${film.Title} Poster" style="max-width: 150px; height: auto; margin-bottom: 10px; border-radius: 4px;">` : '';

  details.innerHTML = `
    ${posterHTML}
    <h2>${film.Title} (${film.Year})</h2>
    <p><strong>Runtime:</strong> ${film.Runtime} mins</p>
    <p><strong>Plot:</strong> ${film.Plot !== null ? film.Plot : "N/A"}</p>
    <p><strong>IMDb:</strong> ${film.IMDb !== null ? film.IMDb : "N/A"}</p>
    <p><strong>RT:</strong> ${film.RT !== null ? film.RT : "N/A"}</p>
    <p><strong>Box Office:</strong> ${film.BoxOffice !== null ? `$${(film.BoxOffice / 1_000_000).toFixed(1)}M` : "N/A"}</p>
    <p><strong>Actors:</strong> ${film.Actors}</p>
    <p><strong>Director:</strong> ${film.Director}</p>
    <p><strong>Language:</strong> ${film.Language}</p>
    <p><strong>Season:</strong> ${film.Season}</p>
    ${buttonsHTML}
  `;

  // Add event listener for the "Vote to Eliminate" button if it was added and it's the player's turn
  if (!in5050Phase && playerName === state.currentPlayer) {
    const eliminateButton = details.querySelector(".eliminate");
    if (eliminateButton) { // Check if the button actually exists
      eliminateButton.addEventListener("click", () => {
        ws.send(JSON.stringify({ type: "eliminate", film: film.Title }));
      });
    }
  }

  // Add event listener to go back to the list
  details.querySelector(".back-to-list").addEventListener("click", () => {
    // This call restores the list/groups based on the 'state' when details were opened.
    // If groups appear to shuffle, it implies the underlying group data in the 'state'
    // object might be changing, or the server is sending updates.
    updateFilmList(state);
  });

  filmList.appendChild(details);
}
