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

    const filmList = getElement('film-list');
    const filmSelectSection = getElement('film-select');
    const startVoteBtn = getElement('start-vote');
    
    // Voting style elements
    const voteStyleSelect = getElement('vote-style');
    const hybridSettings = getElement('hybrid-settings');
    const hybridThreshold = getElement('hybrid-threshold');

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

    // Log which elements were successfully found
    console.log("DOM elements loaded:", {
        sessionLink: !!sessionLink,
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
            if (data.started) {
                voteStatusSection.classList.remove('hidden');
                
                if (voteStateEl) {
                    voteStateEl.textContent = "In progress";
                    voteStateEl.style.color = "#4CAF50"; // Green color to indicate active vote
                    voteStateEl.style.fontWeight = "bold";
                }
                
                const isNewStartForClient = !voteStarted; // True if client is just now seeing vote as started

                // Handle voteStartTime
                if (data.vote_start_time) {
                    const serverStartTime = new Date(data.vote_start_time);
                    if (isNewStartForClient || !voteStartTime || voteStartTime.getTime() !== serverStartTime.getTime()) {
                        voteStartTime = serverStartTime;
                        if (elapsedTimeInterval) clearInterval(elapsedTimeInterval);
                        elapsedTimeInterval = setInterval(updateElapsedTime, 1000);
                        updateElapsedTime(); // Immediately update display
                    }
                } else if (isNewStartForClient) {
                    // Fallback if server doesn't send start time, and it's a new start for client
                    voteStartTime = new Date();
                    if (elapsedTimeInterval) clearInterval(elapsedTimeInterval);
                    elapsedTimeInterval = setInterval(updateElapsedTime, 1000);
                    updateElapsedTime();
                }
                // If !isNewStartForClient and no data.vote_start_time, client retains existing voteStartTime and interval.

                if (isNewStartForClient) {
                    voteStarted = true; // Set this after handling voteStartTime and related UI
                    
                    // Highlight the vote status section to draw attention to it
                    if (voteStatusSection) {
                        voteStatusSection.style.borderColor = "#4CAF50"; // Green border
                        voteStatusSection.style.boxShadow = "0 0 10px rgba(76, 175, 80, 0.3)"; // Subtle glow
                    }
                    
                    // Hide/disable elements relevant to pre-vote state
                    if (nameInput) nameInput.disabled = true;
                    if (joinBtn) joinBtn.disabled = true;
                    if (filmSelectSection) filmSelectSection.style.display = 'none';
                    if (startVoteBtn) startVoteBtn.style.display = 'none';
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
                    
                    if (voteStatusSection.nextSibling) {
                        voteStatusSection.parentNode.insertBefore(votingStartedNotice, voteStatusSection.nextSibling);
                    } else {
                        voteStatusSection.parentNode.appendChild(votingStartedNotice);
                    }
                    
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
                
                // Check for winner and display it
                if (data.has_winner && data.winner) {
                    // Create a winner announcement that stands out
                    const winnerSection = document.createElement('div');
                    winnerSection.id = 'winner-section';
                    winnerSection.className = 'winner-section';
                    
                    // Create the winner announcement content
                    winnerSection.innerHTML = `
                        <h2>🏆 We Have a Winner! 🏆</h2>
                        <div class="winning-film">
                            <h1>${data.winner.Title}</h1>
                            <h3>(${data.winner.Year})</h3>
                            <p>${data.winner.Plot}</p>
                            <p><strong>Director:</strong> ${data.winner.Director}</p>
                            <p><strong>Runtime:</strong> ${data.winner.Runtime}</p>
                            <p><strong>IMDb:</strong> ${data.winner.IMDb || 'N/A'} | <strong>Rotten Tomatoes:</strong> ${data.winner.RT || 'N/A'}</p>
                        </div>
                    `;
                    
                    // CSS is now in host.css so no need for inline styles
                    
                    // Replace current turn display with winner announcement
                    const statusPanel = document.getElementById('vote-status');
                    
                    // Only add if it doesn't already exist
                    if (statusPanel && !document.getElementById('winner-section')) {
                        const existingWinnerSection = document.getElementById('winner-section');
                        if (existingWinnerSection) {
                            existingWinnerSection.remove();
                        }
                        
                        // Find a good place to insert it
                        const insertBeforeElement = document.querySelector('#vote-status .player-list') || 
                                                   document.querySelector('#vote-status h2') ||
                                                   statusPanel.firstChild;
                                                   
                        statusPanel.insertBefore(winnerSection, insertBeforeElement);
                                                   
                        // Update status text to indicate voting is complete
                        if (voteStateEl) voteStateEl.textContent = "Vote Complete - We Have a Winner!";
                    }
                }
            } else {
                if (voteStateEl) voteStateEl.textContent = "Waiting to start";
                voteStatusSection.classList.add('hidden');
                voteStarted = false; // Reset client's voteStarted state
                if (elapsedTimeInterval) {
                    clearInterval(elapsedTimeInterval);
                    elapsedTimeInterval = null;
                }
                voteStartTime = null;
                if (elapsedTimeEl) {
                    elapsedTimeEl.textContent = "00:00"; // Reset timer display
                    elapsedTimeEl.style.color = ""; // Reset color
                    elapsedTimeEl.style.animation = "none"; // Reset animation
                    elapsedTimeEl.title = ""; // Clear tooltip
                }

                // Re-enable/show elements for pre-vote state
                if (nameInput) nameInput.disabled = false;
                if (joinBtn) joinBtn.disabled = false;
                if (filmSelectSection) filmSelectSection.style.display = 'block'; // Or its original display value
                if (startVoteBtn) startVoteBtn.style.display = 'block'; // Or its original display value
                const filtersSection = document.getElementById('filters');
                if (filtersSection) filtersSection.style.display = 'block'; // Or its original display value
                 // Clear any winner display
                const existingWinnerSection = document.getElementById('winner-section');
                if (existingWinnerSection) {
                    existingWinnerSection.remove();
                }
            }
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
            
            // Set up the copy button for the session link (player join URL)
            const copySessionLinkBtn = document.getElementById('copy-session-link-btn');
            if (copySessionLinkBtn) {
                copySessionLinkBtn.addEventListener('click', () => {
                    navigator.clipboard.writeText(sessionLinkUrl).then(() => {
                        copySessionLinkBtn.textContent = "Copied!";
                        setTimeout(() => (copySessionLinkBtn.textContent = "Copy"), 2000);
                    }).catch(err => {
                        console.error("Could not copy text: ", err);
                    });
                });
            }
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
        
        // No need to display host reconnection link - users can copy from the URL bar if needed
        // We still set the URL parameters for host ID for proper reconnection
        if (hostId) {
            // URL is already updated with hostId in the code above
            console.log("Host ID set in URL parameters for reconnection");
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
                            // Confirm hostId if provided by server during reconnect
                            if (data.host_id && hostId !== data.host_id) {
                                console.warn(`Reconnected with host ID ${hostId}, but server confirmation is ${data.host_id}. Updating to server's version.`);
                                hostId = data.host_id;
                                const newUrl = new URL(window.location);
                                newUrl.searchParams.set("hid", hostId);
                                window.history.replaceState({}, '', newUrl);
                            }
                        } else if (data.type === "player_id") {
                            if (data.is_host && data.id) {
                                // This message explicitly identifies the host of the session.
                                if (!hostId) {
                                    hostId = data.id;
                                    console.log(`Host ID assigned by server: ${hostId}`);
                                    const newUrl = new URL(window.location);
                                    // Only update URL if hid isn't already there or differs
                                    if (newUrl.searchParams.get("hid") !== hostId) {
                                        newUrl.searchParams.set("hid", hostId);
                                        window.history.replaceState({}, '', newUrl);
                                        console.log("Host ID set in URL from server's is_host message.");
                                    }
                                } else if (hostId !== data.id) {
                                    // hostId was already set (e.g., from URL or previous is_host message),
                                    // but server sent a new one with is_host:true.
                                    // This implies the server is authoritative for the host's session ID.
                                    console.warn(`Host ID changing from '${hostId}' to '${data.id}' based on server's is_host message.`);
                                    hostId = data.id;
                                    const newUrl = new URL(window.location);
                                    newUrl.searchParams.set("hid", hostId); // Ensure URL reflects the authoritative hid
                                    window.history.replaceState({}, '', newUrl);
                                    console.log("Host ID updated in URL to server's authoritative ID.");
                                } else {
                                    // hostId already set and matches, confirmation.
                                    console.log(`Host ID ${hostId} confirmed by server's is_host message.`);
                                }
                            } else if (!hostId && data.id && typeof data.is_host === 'undefined') {
                                // Fallback: if hostId is not set at all (not from URL, not from a previous is_host message)
                                // AND this player_id message doesn't have an is_host flag (legacy or ambiguous).
                                // We might cautiously assume this *could* be the initial host ID.
                                // This is less safe than an explicit is_host: true.
                                console.warn(`Host ID not set, and received player_id (id: ${data.id}) without is_host flag. Tentatively assigning as Host ID.`);
                                hostId = data.id;
                                const newUrl = new URL(window.location);
                                if (newUrl.searchParams.get("hid") !== hostId) {
                                    newUrl.searchParams.set("hid", hostId);
                                    window.history.replaceState({}, '', newUrl);
                                    console.log("Tentative Host ID set in URL.");
                                }
                            } else {
                                // This is a player_id for a regular player (data.is_host is false),
                                // or hostId is already set and this message is not an authoritative is_host update.
                                // So, we do not update the session `hostId`.
                                // The host's player-specific ID is handled by `hostPlayerListener` for the "Open Player View" button.
                                console.log(`Received player ID (id: ${data.id}, name: ${data.name || 'N/A'}, is_host: ${data.is_host}). Not updating session hostId ('${hostId || 'not set'}').`);
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

    // --- Link Sharing removed --- 
    // No copy link buttons are needed as URLs can be copied directly from the browser

    // --- Fetch Films and Watched Status ---
    Promise.all([
        fetch('../scifi_data.csv').then(res => {
            if (!res.ok) throw new Error('Failed to load scifi_data.csv');
            return res.text();
        }),
        fetch('../watched_films.csv').then(res => {
            if (!res.ok) {
                console.warn('Failed to load watched_films.csv. Proceeding without watched status.');
                return null;
            }
            return res.text();
        }).catch(error => {
            console.warn('Error fetching watched_films.csv:', error.message, '. Proceeding without watched status.');
            return null;
        })
    ])
    .then(([filmsCsvText, watchedCsvText]) => {
        let filmsData = [];
        
        // Parse films CSV using PapaParse
        if (filmsCsvText) {
            const parseResult = Papa.parse(filmsCsvText, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true
            });
            filmsData = parseResult.data;
            console.log('Films data loaded:', filmsData.length, 'films');
        }
        
        if (!filmsData || filmsData.length === 0) {
             console.error("filmsData is empty after parsing. This indicates a problem with loading scifi_data.csv.");
             allFilms = [];
             setupSeasonsAndDisplay();
             return;
        }

        const watchedImdbIds = new Set();
        if (watchedCsvText) {
            try {
                const lines = watchedCsvText.trim().split(/\r\n|\n/);
                if (lines.length > 1) {
                    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
                    const imdbIDIndex = header.indexOf('imdbid');

                    if (imdbIDIndex !== -1) {
                        for (let i = 1; i < lines.length; i++) {
                            const values = lines[i].split(',');
                            if (values[imdbIDIndex]) {
                                watchedImdbIds.add(String(values[imdbIDIndex].trim()));
                            }
                        }
                        console.log("Successfully parsed watched_films.csv and extracted", watchedImdbIds.size, "watched IMDb IDs.");
                    } else {
                        console.warn("Could not find 'imdbID' column in watched_films.csv header. Proceeding as if no films are watched.");
                    }
                } else {
                    console.warn("watched_films.csv is empty or has no data rows. Proceeding as if no films are watched.");
                }
            } catch (e) {
                console.error("Error manually parsing watched_films.csv:", e.message);
                // Proceed with empty watchedImdbIds
            }
        }

        allFilms = filmsData.map(film => ({
            ...film,
            Watched: film.imdbID ? watchedImdbIds.has(String(film.imdbID)) : false
        }));
        
        console.log("Processed allFilms, example of first film's watched status:", allFilms.length > 0 ? allFilms[0].Watched : 'N/A');
        setupSeasonsAndDisplay();
    })
    .catch(error => {
        console.error("CRITICAL: Error fetching or processing film data:", error.message);
        allFilms = [];
        setupSeasonsAndDisplay();
    });

    // This function sets up season buttons and triggers the initial display.
    // It relies on the global `allFilms` variable being populated.
    function setupSeasonsAndDisplay() {
        const seasons = allFilms.length > 0 ? [...new Set(allFilms.map(f => f.Season))].sort((a, b) => a - b) : [];
        
        if (seasonButtonsContainer) {
            seasonButtonsContainer.innerHTML = ''; // Clear previous buttons
            seasons.forEach(season => {
                const btn = document.createElement('button');
                btn.textContent = `S${season}`;
                btn.classList.add('season-toggle');
                btn.dataset.season = String(season); // Store as string, parse when using
                btn.addEventListener('click', () => {
                    const seasonNum = parseInt(btn.dataset.season);
                    if (selectedSeasons.has(seasonNum)) {
                        selectedSeasons.delete(seasonNum);
                        btn.classList.remove('selected');
                    } else {
                        selectedSeasons.add(seasonNum);
                        btn.classList.add('selected');
                    }
                    updateFilmDisplay();
                });
                seasonButtonsContainer.appendChild(btn);
            });

            selectedSeasons = new Set(); 
            // const defaultSeasons = [10, 11]; 
            const defaultSeasons = [1,2,3,4,5,6,7,8,9,10, 11]; 
            defaultSeasons.forEach(s => selectedSeasons.add(s));

            document.querySelectorAll('.season-toggle').forEach(btn => {
                const seasonNum = parseInt(btn.dataset.season);
                if (selectedSeasons.has(seasonNum)) {
                    btn.classList.add('selected');
                } else {
                    btn.classList.remove('selected');
                }
            });
        } else {
            console.warn("seasonButtonsContainer element not found. Cannot create season buttons.");
        }
        updateFilmDisplay();
    }

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
            
            // Create "Open Player View" button after host has joined as a player
            const joinSection = document.getElementById('join-as-host');
            if (joinSection) {
                // Create a container for the player view button
                const playerViewContainer = document.createElement('div');
                playerViewContainer.style.marginTop = '10px';
                
                // Create the button to open player view
                const openPlayerViewBtn = document.createElement('button');
                openPlayerViewBtn.textContent = 'Open My Player View';
                openPlayerViewBtn.className = 'player-view-btn';
                openPlayerViewBtn.title = 'Open your player voting screen in a new tab';
                
                // Create the URL for the player view with the same session code and player name
                const basePath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
                
                // Listen for player_id messages to get the host's player ID for linking
                const hostPlayerListener = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === "player_id" && !data.is_host) {
                            // This is the host's player ID (not host ID)
                            // Include name in URL for better user experience
                            const playerUrl = `${basePath}/player.html?code=${sessionCode}&name=${encodeURIComponent(name)}&pid=${data.id}`;
                            
                            // Update the button's URL with the correct player ID
                            openPlayerViewBtn.setAttribute('data-player-url', playerUrl);
                            console.log("Updated player view URL with player ID:", data.id);
                            
                            // Remove the listener as we've captured what we needed
                            ws.removeEventListener('message', hostPlayerListener);
                        }
                    } catch (e) {
                        console.error("Error in host player listener:", e);
                    }
                };
                
                // Add temporary listener for player_id message
                ws.addEventListener('message', hostPlayerListener);
                
                // Initial URL without player ID but with name (will be updated when we receive player_id)
                const playerUrl = `${basePath}/player.html?code=${sessionCode}&name=${encodeURIComponent(name)}`;
                
                // Set up click event to open new tab with player view
                openPlayerViewBtn.addEventListener('click', () => {
                    // Use the updated URL if available, otherwise fall back to the initial URL
                    const finalUrl = openPlayerViewBtn.getAttribute('data-player-url') || playerUrl;
                    const newTab = window.open(finalUrl, '_blank');
                    
                    // Update button state to show it was clicked
                    openPlayerViewBtn.textContent = 'Player View Opened';
                    openPlayerViewBtn.style.opacity = '0.8';
                    
                    // Store that the view was opened in session storage
                    sessionStorage.setItem('playerViewOpened', 'true');
                    
                    // Focus on the new tab
                    if (newTab) {
                        newTab.focus();
                    }
                    
                    // Show a brief notification
                    const notification = document.createElement('div');
                    notification.textContent = 'Player view opened in new tab';
                    notification.style.position = 'fixed';
                    notification.style.bottom = '20px';
                    notification.style.right = '20px';
                    notification.style.padding = '10px 15px';
                    notification.style.backgroundColor = '#388e3c';
                    notification.style.color = 'white';
                    notification.style.borderRadius = '5px';
                    notification.style.zIndex = '1000';
                    document.body.appendChild(notification);
                    
                    // Fade out notification
                    setTimeout(() => {
                        notification.style.transition = 'opacity 1s ease';
                        notification.style.opacity = '0';
                        setTimeout(() => notification.remove(), 1000);
                    }, 3000);
                });
                
                // Add the button to the container
                playerViewContainer.appendChild(openPlayerViewBtn);
                
                // Add explanatory text
                const explanationText = document.createElement('p');
                explanationText.textContent = 'Use this button to open your player voting screen in a new tab.';
                explanationText.className = 'help-text';
                playerViewContainer.appendChild(explanationText);
                
                // Add the container to the join section
                joinSection.appendChild(playerViewContainer);
            }
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
            } else {
                console.warn("WebSocket not ready, can't send kick message");
                alert("Connection issue. Please try again when connected.");
            }
        }
    }

    // --- Voting Style Selection ---
    // Using the variables already defined at the top of the file with getElement()
    
    // Show/hide hybrid threshold settings based on voting style
    if (voteStyleSelect && hybridSettings) {
        // Set initial state
        if (voteStyleSelect.value === 'hybrid') {
            hybridSettings.style.display = 'block';
        } else {
            hybridSettings.style.display = 'none';
        }
        
        // Add change listener
        voteStyleSelect.addEventListener('change', () => {
            if (voteStyleSelect.value === 'hybrid') {
                hybridSettings.style.display = 'block';
            } else {
                hybridSettings.style.display = 'none';
            }
        });
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
            
            // Get voting style settings
            const voteStyle = voteStyleSelect ? voteStyleSelect.value : 'one-by-one';
            const threshold = (voteStyle === 'hybrid' && hybridThreshold) 
                ? parseInt(hybridThreshold.value) || 10 
                : 10;
            
            console.log(`Starting vote with ${selectedFilms.length} films, style: ${voteStyle}` + 
                  (voteStyle === 'hybrid' ? `, threshold: ${threshold}` : ''));
            
            // Send start command with films and voting style
            ws.send(JSON.stringify({ 
                type: 'start', 
                films: selectedFilms,
                vote_style: voteStyle,
                hybrid_threshold: threshold
            }));
        });
    } else {
        console.warn("Start vote button not available");
    }
}
