// static/player.js

const log = console.log;

// Extract the session code from the URL
const urlParams = new URLSearchParams(window.location.search);
const sessionCode = urlParams.get("code");

const backendUrl = "wss://meow.suprdory.com:8006/ws";
const ws = new WebSocket(`${backendUrl}/${sessionCode}`);

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

// Send join request when user clicks the join button
joinBtn.addEventListener("click", () => {
    playerName = nameInput.value.trim();
    if (playerName && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "join", name: playerName }));
        votingSection.style.display = "block";
    }
});

// Listen for messages from the server
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    films = data.filmsRemaining;
    currentPlayer = data.currentPlayer;

    // Update UI
    playerHeader.textContent = `Welcome, ${playerName}`;
    updateFilmList(data);
};

// Update the list of films
function updateFilmList(state) {
    filmList.innerHTML = "";

    if (state.started) {
        status.textContent = `Current turn: ${state.currentPlayer}`;
        if (playerName === state.currentPlayer) {
            status.textContent += " (Your turn to eliminate a film)";
        }

        state.filmsRemaining.forEach((film) => {
            const li = document.createElement("li");
            li.textContent = `${film.Title} (${film.Year})`;
            li.className = "clickable";

            // Allow clicking to eliminate only if it's this player's turn
            if (playerName === state.currentPlayer) {
                li.addEventListener("click", () => {
                    ws.send(JSON.stringify({ type: "eliminate", film: film.Title }));
                });
            } else {
                li.classList.remove("clickable");
            }

            filmList.appendChild(li);
        });
    } else {
        status.textContent = "Waiting for host to start the vote...";
    }
}
