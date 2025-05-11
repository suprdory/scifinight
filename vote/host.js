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
const sessionLink = document.getElementById('session-link');
const copyLinkBtn = document.getElementById('copy-link-btn');

const filmList = document.getElementById('film-list');
const filmSelectSection = document.getElementById('film-select');
const startVoteBtn = document.getElementById('start-vote');

const seasonButtonsContainer = document.getElementById('season-buttons');
const watchedFilter = document.getElementById('watched-filter');
const selectAllBtn = document.getElementById('select-all-seasons');
const selectNoneBtn = document.getElementById('select-none-seasons');

const playerList = document.getElementById('player-list');
const nameInput = document.getElementById('host-name');
const joinBtn = document.getElementById('host-join-btn');

let allFilms = [];
let selectedFilms = [];
let sessionCode = '';
let ws;
let wsReady = false;
let selectedSeasons = new Set();

// --- WebSocket setup ---
sessionCode = generateCode();
ws = new WebSocket(`${backendUrl}/${sessionCode}`);

ws.onopen = () => {
    wsReady = true;
    log("✅ WebSocket open");
    ws.send(JSON.stringify({ type: "ping" }));
};

ws.onmessage = (event) => {
    const state = JSON.parse(event.data);
    log("📩 Message from server:", state);
    renderPlayers(state.players);
};

ws.onerror = (err) => {
    console.error("❌ WebSocket error:", err);
};

ws.onclose = () => {
    console.warn("⚠️ WebSocket closed");
    wsReady = false;
};

// --- Link Sharing ---

log(window.location)
const basePath = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '');
const sessionLinkUrl = `${basePath}/player.html?code=${sessionCode}`;

// const fullUrl = `${window.location.origin}/vote/player.html?code=${sessionCode}`;
sessionLink.textContent = sessionLinkUrl;

copyLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(sessionLinkUrl).then(() => {
        copyLinkBtn.textContent = "Copied!";
        setTimeout(() => (copyLinkBtn.textContent = "Copy Link"), 2000);
    });
});

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
        selectedSeasons = new Set(seasons); // initially all selected
        document.querySelectorAll('.season-toggle').forEach(btn => btn.classList.add('selected'));
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

    filmList.innerHTML = selectedFilms.map(f => `<li>${f.Title} (${f.Year})</li>`).join('');
}

// --- Host joins vote ---
joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name || !wsReady) return;
    ws.send(JSON.stringify({ type: 'join', name }));
    nameInput.disabled = true;
    joinBtn.disabled = true;
});

// --- Player rendering and reordering ---
function renderPlayers(players) {
    playerList.innerHTML = '';
    players.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        li.draggable = true;
        li.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData("text/plain", name);
        });
        li.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        li.addEventListener('drop', (e) => {
            e.preventDefault();
            const from = e.dataTransfer.getData("text/plain");
            const to = name;
            reorderPlayers(from, to);
        });
        playerList.appendChild(li);
    });
}

function reorderPlayers(fromName, toName) {
    const items = Array.from(playerList.children).map(li => li.textContent);
    const fromIndex = items.indexOf(fromName);
    const toIndex = items.indexOf(toName);
    if (fromIndex >= 0 && toIndex >= 0) {
        items.splice(toIndex, 0, items.splice(fromIndex, 1)[0]);
        renderPlayers(items);
    }
    // You might send this new order to the server if desired
    log(items)
    if (wsReady) {
        ws.send(JSON.stringify({
            type: "reorder",
            order: items
        }));
    }
}

// --- Start Vote ---
startVoteBtn.addEventListener('click', () => {
    if (!wsReady) {
        alert("WebSocket not ready");
        return;
    }
    if (selectedFilms.length < 2) {
        alert("Select at least two films to vote on.");
        return;
    }
    ws.send(JSON.stringify({ type: 'start', films: selectedFilms }));
});
