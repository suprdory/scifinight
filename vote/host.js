// static/host.js
const log = console.log;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// For debug purposes, check DOM state
console.log("Document ready state:", document.readyState);

// Main app initialization function
function initializeApp() {
    console.log("Initializing app, DOM ready state:", document.readyState);
    // Generate a random session code
    function generateCode(length = 6) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    const backendUrl = "wss://meow.suprdory.com:8006/ws";

    // Extract session code and host ID from URL only
    const urlParams = new URLSearchParams(window.location.search);
    let sessionCode = urlParams.get("code") || generateCode();
    let hostId = urlParams.get("hid");

    let ws;
    let wsReady = false;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    // Get DOM elements with error handling to detect any missing elements
    function getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element not found: ${id}`);
        }
        return element;
    }

    // Elements
    const sessionLink = getElement('session-link');
    const copyLinkBtn = getElement('copy-link-btn');

    const filmList = getElement('film-list');
    const filmSelectSection = getElement('film-select');
    const startVoteBtn = getElement('start-vote');

    const seasonButtonsContainer = getElement('season-buttons');
    const watchedFilter = getElement('watched-filter');
    const selectAllBtn = getElement('select-all-seasons');
    const selectNoneBtn = getElement('select-none-seasons');

    const playerList = getElement('player-list');
    const nameInput = getElement('host-name');
    const joinBtn = getElement('host-join-btn');
    
    // Vote status elements
    const voteStatusSection = getElement('vote-status');
    const voteStateEl = getElement('vote-state');
    const currentPlayerEl = getElement('current-player');
    const filmsRemainingEl = getElement('films-remaining');
    const elapsedTimeEl = getElement('elapsed-time');
    const playerKickSelect = getElement('player-kick-select');
    const kickPlayerBtn = getElement('kick-player-btn');

    // Log which elements were successfully found
    console.log("DOM elements loaded:", {
        sessionLink: !!sessionLink, 
        copyLinkBtn: !!copyLinkBtn,
        filmList: !!filmList,
        playerList: !!playerList
    });

    let allFilms = [];
    let selectedFilms = [];
    let selectedSeasons = new Set();
    
    // Vote status tracking variables
    let voteStarted = false;
    let voteStartTime = null;
    let currentPlayer = "";
    let filmsRemaining = 0;
    let elapsedTimeInterval = null;
    
    // Function to update the elapsed time display
    function updateElapsedTime() {
        if (!voteStartTime) return;
        
        const now = new Date();
        const elapsed = now - voteStartTime;
        
        // Format as HH:MM:SS
        const hours = Math.floor(elapsed / 3600000).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600000) / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
        
        if (elapsedTimeEl) {
            // Create a more visually appealing time display
            if (parseInt(hours) > 0) {
                // For longer sessions, highlight the time in orange
                elapsedTimeEl.textContent = `${hours}:${minutes}:${seconds}`;
                elapsedTimeEl.style.color = "#ff9800"; // Orange color for long sessions
            } else {
                elapsedTimeEl.textContent = `${minutes}:${seconds}`;
                
                // Pulse effect for the last 10 seconds of each minute
                if (parseInt(seconds) >= 50) {
                    elapsedTimeEl.style.animation = "pulse 1s infinite";
                } else {
                    elapsedTimeEl.style.animation = "none";
                }
            }
            
            // Add tooltip showing when the vote started
            const options = { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true
            };
            elapsedTimeEl.title = `Vote started at ${voteStartTime.toLocaleString(undefined, options)}`;
        }
    }
    
    // Add a CSS animation for the pulse effect
    const styleEl = document.createElement('style');
    styleEl.textContent = `
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }
    `;
    document.head.appendChild(styleEl);
    
    // Function to update the vote status display
    function updateVoteStatus(data) {
        console.log("Updating vote status with data:", data);
        
        if (voteStatusSection) {
            // Show the vote status section if vote has started
            if (data.started) {
                voteStatusSection.classList.remove('hidden');
                
                // Set vote state and highlight it
                if (voteStateEl) {
                    voteStateEl.textContent = "In progress";
                    voteStateEl.style.color = "#4CAF50"; // Green color to indicate active vote
                    voteStateEl.style.fontWeight = "bold";
                }
                
                // Track if we just started
                if (!voteStarted) {
                    voteStarted = true;
                    voteStartTime = new Date();
                    
                    // Start the elapsed time counter
                    elapsedTimeInterval = setInterval(updateElapsedTime, 1000);
                    
                    // Highlight the vote status section to draw attention to it
                    if (voteStatusSection) {
                        voteStatusSection.style.borderColor = "#4CAF50"; // Green border
                        voteStatusSection.style.boxShadow = "0 0 10px rgba(76, 175, 80, 0.3)"; // Subtle glow
                    }
                    
                    // Hide the player joining elements once vote starts
                    if (nameInput) nameInput.disabled = true;
                    if (joinBtn) joinBtn.disabled = true;
                    
                    // Hide the film selection once vote starts
                    if (filmSelectSection) filmSelectSection.style.display = 'none';
                    if (startVoteBtn) startVoteBtn.style.display = 'none';
                    
                    // Hide filters once vote starts
                    const filtersSection = document.getElementById('filters');
                    if (filtersSection) filtersSection.style.display = 'none';
                    
                    // Display a notification that the vote has started
                    const votingStartedNotice = document.createElement('div');
                    votingStartedNotice.style.padding = '10px';
                    votingStartedNotice.style.margin = '15px 0';
                    votingStartedNotice.style.backgroundColor = '#388e3c';
                    votingStartedNotice.style.borderRadius = '5px';
                    votingStartedNotice.style.textAlign = 'center';
                    votingStartedNotice.textContent = 'Voting has started! No new players can join now.';
                    
                    // Insert the notice after the vote status section
                    if (voteStatusSection.nextSibling) {
                        voteStatusSection.parentNode.insertBefore(votingStartedNotice, voteStatusSection.nextSibling);
                    } else {
                        voteStatusSection.parentNode.appendChild(votingStartedNotice);
                    }
                    
                    // Fade out the notice after a few seconds
                    setTimeout(() => {
                        votingStartedNotice.style.transition = 'opacity 1s ease';
                        votingStartedNotice.style.opacity = '0';
                        setTimeout(() => votingStartedNotice.remove(), 1000);
                    }, 5000);
                }
                
                // Update current player with validation
                currentPlayer = data.currentPlayer || "Unknown";
                if (currentPlayerEl) {
                    currentPlayerEl.textContent = currentPlayer;
                    
                    // Add visual emphasis to current player for clarity
                    if (currentPlayer !== "Unknown") {
                        currentPlayerEl.style.fontWeight = "bold";
                        currentPlayerEl.style.color = "#4CAF50"; // Green color to match the player list
                    } else {
                        currentPlayerEl.style.fontWeight = "normal";
                        currentPlayerEl.style.color = "";
                    }
                }
                
                // Update films remaining
                filmsRemaining = data.films_remaining?.length || 0;
                if (filmsRemainingEl) {
                    filmsRemainingEl.textContent = filmsRemaining.toString();
                    
                    // Add visual cue when few films remain
                    if (filmsRemaining <= 5) {
                        filmsRemainingEl.style.color = filmsRemaining <= 3 ? "#f44336" : "#ff9800"; // Red or orange
                        filmsRemainingEl.style.fontWeight = "bold";
                    } else {
                        filmsRemainingEl.style.color = "";
                        filmsRemainingEl.style.fontWeight = "normal";
                    }
                }
            } else {
                if (voteStateEl) voteStateEl.textContent = "Waiting to start";
                voteStatusSection.classList.add('hidden');
            }
        }
        
        // Update the player kick dropdown
        updateKickPlayerDropdown(data.players || []);
    }
    
    // Function to update the player kick dropdown
    function updateKickPlayerDropdown(players) {
        if (!playerKickSelect) return;
        
        // Save the currently selected value
        const selectedValue = playerKickSelect.value;
        
        // Clear the dropdown
        playerKickSelect.innerHTML = '<option value="">Select player to kick...</option>';
        
        // Add each player as an option
        players.forEach(player => {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            playerKickSelect.appendChild(option);
        });
        
        // Restore the selected value if it still exists
        if (selectedValue && players.includes(selectedValue)) {
            playerKickSelect.value = selectedValue;
        }
    }

    // Initialize the session
    function initSession() {
        // Set up the session link for players
        const basePath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
        const sessionLinkUrl = `${basePath}/player.html?code=${sessionCode}`;
        
        // Safely set the session link text
        if (sessionLink) {
            sessionLink.textContent = sessionLinkUrl;
        } else {
            console.warn("Session link element not available");
        }
        
        // Update URL with session code for easy debugging
        const newUrl = new URL(window.location);
        newUrl.searchParams.set("code", sessionCode);
        if (hostId) {
            newUrl.searchParams.set("hid", hostId);
        }
        window.history.replaceState({}, '', newUrl);
        
        // Display host reconnection link if we have a host ID
        if (hostId) {
            const sessionElement = document.getElementById('session');
            if (sessionElement) {
                const hostReconnectionLink = document.createElement('p');
                hostReconnectionLink.innerHTML = `<strong>Host reconnection link:</strong> <span id="host-link">${basePath}/host.html?code=${sessionCode}&hid=${hostId}</span> <button id="copy-host-link-btn">Copy</button>`;
                sessionElement.appendChild(hostReconnectionLink);
                
                // Add important notice about bookmarking the page
                const importantNotice = document.createElement('p');
                importantNotice.className = 'help-text';
                importantNotice.innerHTML = '<strong>Important:</strong> Bookmark this page or copy the link above to reconnect as host if disconnected.';
                sessionElement.appendChild(importantNotice);
                
                const copyHostLinkBtn = document.getElementById('copy-host-link-btn');
                if (copyHostLinkBtn) {
                    copyHostLinkBtn.addEventListener('click', () => {
                        const hostLinkElement = document.getElementById('host-link');
                        if (hostLinkElement) {
                            navigator.clipboard.writeText(hostLinkElement.textContent).then(() => {
                                copyHostLinkBtn.textContent = "Copied!";
                                setTimeout(() => (copyHostLinkBtn.textContent = "Copy"), 2000);
                            });
                        }
                    });
                }
            } else {
                console.warn("Session element not found, can't add host reconnection link");
            }
        }
        
        initWebSocket();
    }

    // --- WebSocket setup ---
    function initWebSocket() {
        log(`Connecting to WebSocket at ${backendUrl}/${sessionCode}`);
        
        // Reset WebSocket if it exists
        if (ws) {
            try {
                ws.close();
            } catch (e) {
                console.error("Error closing existing WebSocket:", e);
            }
        }
        
        try {
            ws = new WebSocket(`${backendUrl}/${sessionCode}`);

            // Update UI to show connecting state
            const statusElement = document.createElement('div');
            statusElement.id = 'connection-status';
            statusElement.style.position = 'fixed';
            statusElement.style.top = '10px';
            statusElement.style.right = '10px';
            statusElement.style.padding = '5px 10px';
            statusElement.style.background = '#ffcc00';
            statusElement.style.borderRadius = '5px';
            statusElement.style.zIndex = '1000';
            statusElement.textContent = 'Connecting...';
            document.body.appendChild(statusElement);

            ws.onopen = () => {
                wsReady = true;
                reconnectAttempts = 0; // Reset reconnect counter on successful connection
                log("✅ WebSocket open");
                
                // Update connection status UI
                const statusElement = document.getElementById('connection-status');
                if (statusElement) {
                    statusElement.textContent = 'Connected';
                    statusElement.style.background = '#4CAF50';
                    setTimeout(() => {
                        statusElement.style.opacity = '0';
                        statusElement.style.transition = 'opacity 1s ease-in-out';
                        setTimeout(() => statusElement.remove(), 1000);
                    }, 2000);
                }
                
                // Try to reconnect as host if we have an ID
                if (hostId) {
                    log(`Attempting to reconnect as host with ID: ${hostId}`);
                    ws.send(JSON.stringify({ 
                        type: "host_reconnect", 
                        host_id: hostId 
                    }));
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    log("📩 Message from server:", data);
                    
                    // Debug DOM state
                    const isDomLoaded = document.readyState === 'complete' || document.readyState === 'interactive';
                    log(`Message received with DOM state: ${document.readyState}, isDomLoaded: ${isDomLoaded}`);
                    
                    // Check if this is a specific message type
                    if (data.type) {
                        if (data.type === "reconnect_success" && data.is_host) {
                            log("Successfully reconnected as host");
                        } else if (data.type === "player_id") {
                            // Store host ID if we don't have one yet
                            hostId = data.id;
                            
                            // Update URL with host ID for easy debugging
                            const newUrl = new URL(window.location);
                            newUrl.searchParams.set("hid", hostId);
                            window.history.replaceState({}, '', newUrl);
                            
                            // Create host reconnection link safely
                            const basePath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
                            const sessionElement = document.getElementById('session');
                            
                            if (sessionElement && !document.getElementById('host-link')) {
                                const hostReconnectionLink = document.createElement('p');
                                hostReconnectionLink.innerHTML = `<strong>Host reconnection link:</strong> <span id="host-link">${basePath}/host.html?code=${sessionCode}&hid=${hostId}</span> <button id="copy-host-link-btn">Copy</button>`;
                                
                                sessionElement.appendChild(hostReconnectionLink);
                                
                                // Safely add event listener to copy button
                                const copyHostLinkBtn = document.getElementById('copy-host-link-btn');
                                if (copyHostLinkBtn) {
                                    copyHostLinkBtn.addEventListener('click', () => {
                                        const hostLinkElement = document.getElementById('host-link');
                                        if (hostLinkElement) {
                                            navigator.clipboard.writeText(hostLinkElement.textContent).then(() => {
                                                copyHostLinkBtn.textContent = "Copied!";
                                                setTimeout(() => (copyHostLinkBtn.textContent = "Copy"), 2000);
                                            });
                                        }
                                    });
                                }
                            } else {
                                console.warn("Session element not found or host link already exists");
                            }
                        } else if (data.type === "state_update") {
                            // Always attempt to render regardless of DOM state
                            // The renderPlayers function will handle any DOM readiness issues
                            log("Received state update with players:", data.players?.length || 0, "players");
                            renderPlayers(data.players, data.connected_players || []);
                            updateVoteStatus(data);
                        }
                    } else {
                        // For backward compatibility with older messages without a type
                        log("Received legacy message format without type");
                        if (data.players) {
                            renderPlayers(data.players, data.connected_players || []);
                        }
                    }
                } catch (e) {
                    console.error("Error parsing message", e);
                }
            };

            ws.onerror = (err) => {
                console.error("❌ WebSocket error:", err);
                
                // Update UI to show error state
                const statusElement = document.getElementById('connection-status') || document.createElement('div');
                statusElement.id = 'connection-status';
                statusElement.style.position = 'fixed';
                statusElement.style.top = '10px';
                statusElement.style.right = '10px';
                statusElement.style.padding = '5px 10px';
                statusElement.style.background = '#f44336';
                statusElement.style.color = 'white';
                statusElement.style.borderRadius = '5px';
                statusElement.style.zIndex = '1000';
                statusElement.textContent = 'Connection error';
                
                if (!statusElement.parentNode) {
                    document.body.appendChild(statusElement);
                }
            };

            ws.onclose = () => {
                console.warn("⚠️ WebSocket closed");
                wsReady = false;
                
                // Show disconnected state in UI
                const statusElement = document.getElementById('connection-status') || document.createElement('div');
                statusElement.id = 'connection-status';
                statusElement.style.position = 'fixed';
                statusElement.style.top = '10px';
                statusElement.style.right = '10px';
                statusElement.style.padding = '5px 10px';
                statusElement.style.background = '#ff9800';
                statusElement.style.color = 'white';
                statusElement.style.borderRadius = '5px';
                statusElement.style.zIndex = '1000';
                statusElement.textContent = 'Disconnected. Reconnecting...';
                
                if (!statusElement.parentNode) {
                    document.body.appendChild(statusElement);
                }
                
                // Attempt to reconnect with backoff
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(1000 * (2 ** reconnectAttempts), 30000);
                    reconnectAttempts++;
                    
                    console.log(`Attempting to reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts} of ${MAX_RECONNECT_ATTEMPTS})`);
                    
                    setTimeout(() => {
                        initWebSocket();
                    }, delay);
                } else {
                    // Max attempts reached, update UI
                    statusElement.textContent = 'Connection lost. Please refresh the page.';
                    statusElement.style.background = '#f44336';
                }
            };
        } catch (error) {
            console.error("Failed to initialize WebSocket:", error);
            
            // Show error in UI
            const errorElement = document.createElement('div');
            errorElement.id = 'connection-error';
            errorElement.style.position = 'fixed';
            errorElement.style.top = '10px';
            errorElement.style.right = '10px';
            errorElement.style.padding = '5px 10px';
            errorElement.style.background = '#f44336';
            errorElement.style.color = 'white';
            errorElement.style.borderRadius = '5px';
            errorElement.style.zIndex = '1000';
            errorElement.textContent = 'Connection failed. Retrying...';
            document.body.appendChild(errorElement);
            
            // Try to reconnect after a delay
            setTimeout(() => {
                initWebSocket();
            }, 3000);
        }
    }

    // Start the session
    initSession();

    // Load host name from URL if available
    const nameFromUrl = urlParams.get("name");
    if (nameFromUrl && nameInput) {
        nameInput.value = nameFromUrl;
    }

    // --- Link Sharing ---
    if (copyLinkBtn && sessionLink) {
        copyLinkBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(sessionLink.textContent).then(() => {
                copyLinkBtn.textContent = "Copied!";
                setTimeout(() => (copyLinkBtn.textContent = "Copy Link"), 2000);
            });
        });
    } else {
        console.warn("Copy link button or session link not available");
    }
    
    // --- Set up kick player functionality ---
    if (kickPlayerBtn && playerKickSelect) {
        kickPlayerBtn.addEventListener('click', () => {
            const selectedPlayer = playerKickSelect.value;
            if (selectedPlayer) {
                kickPlayer(selectedPlayer);
            } else {
                alert("Please select a player to kick");
            }
        });
    } else {
        console.warn("Kick player button or dropdown not available");
    }

    // --- Fetch Films ---
    fetch('../films.json')
        .then(res => res.json())
        .then(data => {
            allFilms = data;
            const seasons = [...new Set(allFilms.map(f => f.Season))].sort((a, b) => a - b);
            seasons.forEach(season => {
                const btn = document.createElement('button');
                btn.textContent = `S${season}`;
                btn.classList.add('season-toggle');
                btn.dataset.season = season;
                btn.addEventListener('click', () => {
                    if (selectedSeasons.has(season)) {
                        selectedSeasons.delete(season);
                        btn.classList.remove('selected');
                    } else {
                        selectedSeasons.add(season);
                        btn.classList.add('selected');
                    }
                    updateFilmDisplay();
                });
                seasonButtonsContainer.appendChild(btn);
            });
            selectedSeasons = new Set([10, 11]); // initially only seasons 10 and 11 selected
            document.querySelectorAll('.season-toggle').forEach(btn => {
                if (selectedSeasons.has(parseInt(btn.dataset.season))) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
            updateFilmDisplay();
        });

    // --- Filter Helpers ---
    selectAllBtn.addEventListener('click', () => {
        selectedSeasons = new Set([...seasonButtonsContainer.querySelectorAll('button')].map(b => parseInt(b.dataset.season)));
        document.querySelectorAll('.season-toggle').forEach(btn => btn.classList.add('selected'));
        updateFilmDisplay();
    });

    selectNoneBtn.addEventListener('click', () => {
        selectedSeasons.clear();
        document.querySelectorAll('.season-toggle').forEach(btn => btn.classList.remove('selected'));
        updateFilmDisplay();
    });

    watchedFilter.addEventListener('change', updateFilmDisplay);

    // --- Update Film List ---
    function updateFilmDisplay() {
        const watched = watchedFilter.value;
        selectedFilms = allFilms.filter(film => {
            const seasonMatch = selectedSeasons.has(film.Season);
            const watchedMatch =
                watched === 'all' ||
                (watched === 'watched' && film.Watched) ||
                (watched === 'unwatched' && !film.Watched);
            return seasonMatch && watchedMatch;
        });

        const selectedCount = selectedFilms.length;
        filmList.previousElementSibling.textContent = `Selected Films (${selectedCount})`;

        filmList.innerHTML = selectedFilms.map(f => `<li>${f.Title} (${f.Year})</li>`).join('');
    }

    // --- Host joins vote ---
    if (joinBtn && nameInput) {
        joinBtn.addEventListener('click', () => {
            const name = nameInput.value.trim();
            if (!name) {
                alert('Please enter your name');
                return;
            }
            if (!wsReady) {
                alert('WebSocket connection not ready! Please try again in a moment.');
                return;
            }
            console.log("Host joining as player with name:", name);
            
            // Store the host's name in the URL
            const newUrl = new URL(window.location);
            newUrl.searchParams.set("name", name);
            window.history.replaceState({}, '', newUrl);
            
            ws.send(JSON.stringify({ type: 'join', name }));
            nameInput.disabled = true;
            joinBtn.disabled = true;
        });
    } else {
        console.warn("Join button or name input not available");
    }

    // --- Player rendering and reordering ---
    function renderPlayers(players = [], connectedPlayers = []) {
        // Get a fresh reference to the playerList element to ensure it exists
        const currentPlayerList = document.getElementById('player-list');
        
        // Debug the DOM state
        console.log("renderPlayers called, DOM ready state:", document.readyState);
        console.log("Current playerList element exists:", !!currentPlayerList);
        
        // Ensure players is an array
        if (!Array.isArray(players)) {
            console.warn("Expected players to be an array, got:", players);
            players = [];
        }
        // Ensure connectedPlayers is an array
        if (!Array.isArray(connectedPlayers)) {
            console.warn("Expected connectedPlayers to be an array, got:", connectedPlayers);
            connectedPlayers = [];
        }
        
        // Check if playerList exists in the DOM
        if (!currentPlayerList) {
            console.warn("Player list element not found in DOM");
            // Store the data for later rendering when DOM is ready
            if (document.readyState !== 'complete') {
                console.log("DOM not ready, saving player data for later rendering");
                window.pendingPlayerRender = { players, connectedPlayers };
                
                // Set up a one-time listener to render when DOM is ready
                if (!window.playerRenderListenerSet) {
                    window.playerRenderListenerSet = true;
                    window.addEventListener('load', () => {
                        if (window.pendingPlayerRender) {
                            console.log("DOM now ready, rendering saved player data");
                            renderPlayers(window.pendingPlayerRender.players, window.pendingPlayerRender.connectedPlayers);
                            delete window.pendingPlayerRender;
                        }
                    });
                }
            }
            return;
        }
        
        // Safe to proceed with rendering
        currentPlayerList.innerHTML = '';
        console.log("Rendering player list with", players.length, "players");
        
        players.forEach(name => {
            const li = document.createElement('li');
            
            // Create player name container
            const nameSpan = document.createElement('span');
            nameSpan.textContent = name;
            nameSpan.className = 'player-name';
            
            // Highlight current player
            if (currentPlayer === name) {
                nameSpan.classList.add('current-player');
                
                // Add a tooltip to clearly show this is the current player
                li.title = "Current player's turn";
            }
            li.appendChild(nameSpan);
            
            // Create kick button controls
            const controls = document.createElement('div');
            controls.className = 'player-controls';
            
            const kickBtn = document.createElement('button');
            kickBtn.className = 'kick-btn';
            kickBtn.textContent = 'Kick';
            kickBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering drag events
                kickPlayer(name);
            });
            controls.appendChild(kickBtn);
            li.appendChild(controls);
            
            // Show connection status with improved visual indication
            const isConnected = connectedPlayers.includes(name);
            if (!isConnected) {
                // Visual indicators for disconnected players
                li.style.opacity = "0.5";
                li.style.borderLeft = "3px solid #f44336"; // Red border on left
                li.title = "Disconnected - player may have closed their browser";
                
                // Add a small indicator icon
                const statusIcon = document.createElement('span');
                statusIcon.textContent = "⚠️";
                statusIcon.style.marginLeft = "5px";
                statusIcon.style.fontSize = "0.8em";
                statusIcon.title = "Disconnected player";
                nameSpan.appendChild(statusIcon);
            } else {
                // Visual indicator for connected players
                li.style.borderLeft = "3px solid #4CAF50"; // Green border on left
                li.title = currentPlayer === name ? "Current player's turn" : "Connected player";
            }
            
            li.draggable = true;
            li.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', name);
            });
            li.addEventListener('dragover', (e) => {
                e.preventDefault();
            });
            li.addEventListener('drop', (e) => {
                e.preventDefault();
                const fromName = e.dataTransfer.getData('text/plain');
                reorderPlayers(fromName, name);
            });
            currentPlayerList.appendChild(li);
        });
        
        console.log("Player list rendering complete");
    }

    function reorderPlayers(fromName, toName) {
        // Get fresh reference to playerList
        const currentPlayerList = document.getElementById('player-list');
        
        if (!currentPlayerList) {
            console.error("Cannot reorder players: player list element not found");
            return;
        }
        
        const items = Array.from(currentPlayerList.children).map(li => li.querySelector('.player-name').textContent);
        const fromIndex = items.indexOf(fromName);
        const toIndex = items.indexOf(toName);
        
        console.log(`Reordering player from index ${fromIndex} to ${toIndex}`);
        
        if (fromIndex >= 0 && toIndex >= 0) {
            items.splice(toIndex, 0, items.splice(fromIndex, 1)[0]);
            
            if (wsReady) {
                console.log("Sending reorder message to server");
                ws.send(JSON.stringify({ type: 'reorder', order: items }));
            } else {
                console.warn("WebSocket not ready, can't send reorder message");
            }
        } else {
            console.warn(`Reorder failed: couldn't find indices for ${fromName} and ${toName}`);
        }
    }
    
    // Function to kick a player from the session
    function kickPlayer(playerName) {
        if (!playerName) return;
        
        if (confirm(`Are you sure you want to kick ${playerName} from the session?`)) {
            console.log(`Kicking player: ${playerName}`);
            
            if (wsReady) {
                // Show a temporary visual feedback that the action is being processed
                const feedbackToast = document.createElement('div');
                feedbackToast.style.position = 'fixed';
                feedbackToast.style.bottom = '20px';
                feedbackToast.style.right = '20px';
                feedbackToast.style.padding = '10px 15px';
                feedbackToast.style.background = '#333';
                feedbackToast.style.color = 'white';
                feedbackToast.style.borderRadius = '5px';
                feedbackToast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                feedbackToast.style.zIndex = '1000';
                feedbackToast.textContent = `Kicking ${playerName}...`;
                document.body.appendChild(feedbackToast);
            
                // Send the kick message
                ws.send(JSON.stringify({
                    type: 'kick_player',
                    player: playerName
                }));
                
                // Update toast after a successful kick (assuming it worked if we sent it)
                setTimeout(() => {
                    feedbackToast.textContent = `${playerName} was removed from the session.`;
                    feedbackToast.style.background = '#4CAF50'; // Green
                    
                    // Remove the toast after showing the success message
                    setTimeout(() => {
                        feedbackToast.style.opacity = '0';
                        feedbackToast.style.transition = 'opacity 0.5s ease';
                        setTimeout(() => feedbackToast.remove(), 500);
                    }, 3000);
                }, 1000);
                
                // Reset the player kick dropdown if it was used
                const playerKickSelect = document.getElementById('player-kick-select');
                if (playerKickSelect && playerKickSelect.value === playerName) {
                    playerKickSelect.value = "";
                }
            } else {
                console.warn("WebSocket not ready, can't send kick message");
                alert("Connection issue. Please try again when connected.");
            }
        }
    }

    // --- Start Vote ---
    if (startVoteBtn) {
        startVoteBtn.addEventListener('click', () => {
            if (!wsReady) {
                alert('WebSocket connection not ready!');
                return;
            }
            
            if (selectedFilms.length < 2) {
                alert('Please select at least 2 films');
                return;
            }
            
            console.log("Starting vote with", selectedFilms.length, "films");
            ws.send(JSON.stringify({ type: 'start', films: selectedFilms }));
        });
    } else {
        console.warn("Start vote button not available");
    }
}
