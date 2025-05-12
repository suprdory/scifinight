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

// Move currentSort outside the function to persist its state
let currentSort = { key: null, ascending: true };

// Send join request when user clicks the join button
joinBtn.addEventListener("click", () => {
  playerName = nameInput.value.trim();
  if (playerName && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "join", name: playerName }));
    votingSection.style.display = "block";

    // Hide the join elements
    document.getElementById("join-header").style.display = "none";
    nameInput.style.display = "none";
    joinBtn.style.display = "none";

    // Hide the "Enter your name:" label after joining
    const nameLabel = document.querySelector("label[for='name']");
    if (nameLabel) {
      nameLabel.style.display = "none";
    }
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

      // Allow clicking to eliminate only if it's this player's turn
      if (playerName === state.currentPlayer) {
        row.classList.add("clickable");
        row.addEventListener("click", () => {
          showFilmDetails(film, state);
        });
      }

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
    <h2>${film.Title}</h2>
    <p><strong>Year:</strong> ${film.Year}</p>
    <p><strong>Runtime:</strong> ${film.Runtime}</p>
    <p><strong>IMDb:</strong> ${film.IMDb !== null ? film.IMDb : "N/A"}</p>
    <p><strong>RT:</strong> ${film.RT !== null ? film.RT : "N/A"}</p>
    <p><strong>Box Office:</strong> ${film.BoxOffice !== null ? `$${(film.BoxOffice / 1_000_000).toFixed(1)}M` : "N/A"}</p>
    <p><strong>Director:</strong> ${film.Director}</p>
    <p><strong>Language:</strong> ${film.Language}</p>
    <p><strong>Season:</strong> ${film.Season}</p>
    <button class="eliminate">Vote to Eliminate</button>
    <button class="back-to-list">Back to List</button>
  `;

  // Add event listener to vote for elimination
  details.querySelector(".eliminate").addEventListener("click", () => {
    ws.send(JSON.stringify({ type: "eliminate", film: film.Title }));
  });

  // Add event listener to go back to the list
  details.querySelector(".back-to-list").addEventListener("click", () => {
    updateFilmList(state);
  });

  filmList.appendChild(details);
}
