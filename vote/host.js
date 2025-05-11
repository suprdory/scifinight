// static/host.js
const log = console.log;

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

// Elements
const createBtn = document.getElementById('create-session');
const seasonFilter = document.getElementById('season-filter');
const watchedFilter = document.getElementById('watched-filter');
const sessionLink = document.getElementById('session-link');
const filmList = document.getElementById('film-list');
const startVoteBtn = document.getElementById('start-vote');
const filmSelectSection = document.getElementById('film-select');
const waitingArea = document.getElementById('waiting-area');
const playerList = document.getElementById('player-list');

let allFilms = [];
let selectedFilms = [];
let sessionCode = '';
let ws;
let wsReady = false;

// Fetch films from server
fetch('../films.json')
    .then(res => res.json())
    .then(data => {
        allFilms = data;
        updateFilmDisplay();
    });

// Update films shown based on filters
function updateFilmDisplay() {
    const selectedSeasons = Array.from(seasonFilter.selectedOptions).map(o => parseInt(o.value));
    const watched = watchedFilter.value;

    selectedFilms = allFilms.filter(film => {
        const seasonMatch = selectedSeasons.includes(film.Season);
        const watchedMatch = watched === 'all' || (watched === 'watched' && film.Watched) || (watched === 'unwatched' && !film.Watched);
        return seasonMatch && watchedMatch;
    });

    filmList.innerHTML = selectedFilms.map(f => `<li>${f.Title} (${f.Year})</li>`).join('');
}

seasonFilter.addEventListener('change', updateFilmDisplay);
watchedFilter.addEventListener('change', updateFilmDisplay);

// Create session and connect WebSocket
sessionCode = generateCode();
ws = new WebSocket(`${backendUrl}/${sessionCode}`);

ws.onopen = () => {
    wsReady = true;
    console.log("✅ WebSocket connection opened.");

    // Test ping
    ws.send(JSON.stringify({ type: "ping" }));
};

ws.onmessage = (event) => {
    const state = JSON.parse(event.data);
    console.log("📩 WebSocket message received:", state);

    if (state.players) {
        playerList.innerHTML = state.players.map(p => `<li>${p}</li>`).join('');
    }
};

ws.onerror = (err) => {
    console.error("❌ WebSocket error:", err);
};

ws.onclose = () => {
    console.warn("⚠️ WebSocket closed.");
    wsReady = false;
};

sessionLink.innerHTML = `Share this link: <a href="/vote/player.html?code=${sessionCode}" target="_blank">Join Vote</a>`;
filmSelectSection.style.display = 'block';
waitingArea.style.display = 'block';

// Send start vote message
startVoteBtn.addEventListener('click', () => {
    if (!wsReady) {
        console.warn("WebSocket is not open. Cannot send start message.");
        return;
    }

    if (selectedFilms.length < 2) {
        alert("Select at least two films to start the vote.");
        return;
    }

    const message = {
        type: 'start',
        films: selectedFilms
    };

    console.log("🚀 Sending start message:", message);

    try {
        ws.send(JSON.stringify(message));
    } catch (err) {
        console.error("❌ Failed to send start message:", err);
    }
});
