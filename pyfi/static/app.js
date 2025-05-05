/* app.js */
const backendUrl = "ws://meow.suprdory.com:8006/ws";
const ws = new WebSocket(backendUrl);

const joinScreen = document.getElementById("join-screen");
const gameScreen = document.getElementById("game-screen");
const nameInput = document.getElementById("name-input");
const joinBtn = document.getElementById("join-btn");
const startBtn = document.getElementById("start-btn");
const playerInfo = document.getElementById("player-info");
const filmList = document.getElementById("film-list");
const eliminatedList = document.getElementById("eliminated-list");

let currentPlayer = null;
let myName = "";

// Send join message
joinBtn.onclick = () => {
    myName = nameInput.value.trim();
    if (myName !== "") {
        ws.send(JSON.stringify({ type: "join", name: myName }));
        joinScreen.style.display = "none";
        gameScreen.style.display = "block";
    }
};

// Send start message
startBtn.onclick = () => {
    ws.send(JSON.stringify({ type: "start" }));
};

// Handle messages from backend
ws.onmessage = (event) => {
    const state = JSON.parse(event.data);
    currentPlayer = state.currentPlayer;

    playerInfo.innerText = `Current turn: ${currentPlayer}`;

    // Display films
    filmList.innerHTML = "";
    state.filmsRemaining.forEach((film) => {
        const li = document.createElement("li");
        li.textContent = `${film.Title} (${film.Year}) - ${film.Runtime} mins`;

        // Only allow elimination if it's this player's turn
        if (currentPlayer === myName) {
            li.onclick = () => {
                ws.send(JSON.stringify({ type: "eliminate", film: film.Title }));
            };
        }

        filmList.appendChild(li);
    });

    // Display eliminated
    eliminatedList.innerHTML = "";
    state.eliminated.forEach((title) => {
        const li = document.createElement("li");
        li.textContent = title;
        eliminatedList.appendChild(li);
    });
};