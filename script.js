// // script.js
let filmsData = []; // Store loaded films data globally
let watchedFilms = []; // Store watched films data globally
let urlBase = window.location.pathname;

// Load watched films list from CSV
function loadWatchedFilmsCSV() {
    return fetch('watched_films.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            // Parse CSV data
            const lines = data.split('\n');
            
            if (lines.length === 0) {
                console.error('CSV file is empty');
                return new Set();
            }
            
            const headers = lines[0].split(',');
            
            // Clean headers to remove any carriage returns
            const cleanHeaders = headers.map(header => header.trim().replace(/\r$/, ''));
            console.log('Cleaned headers:', cleanHeaders);
            
            // Find the index positions for Title and imdbID
            const titleIndex = cleanHeaders.indexOf('Title');
            const imdbIDIndex = cleanHeaders.indexOf('imdbID');
            
            if (titleIndex === -1 || imdbIDIndex === -1) {
                console.error('CSV headers not found:', cleanHeaders);
                return new Set();
            }
            
            // Process each line (skip header)
            const watchedIDs = new Set();
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue; // Skip empty lines
                
                const values = lines[i].split(',');
                if (values.length > imdbIDIndex) {
                    // Clean the imdbID value to remove any carriage returns or whitespace
                    const cleanImdbID = values[imdbIDIndex].trim().replace(/\r$/, '');
                    if (cleanImdbID) {
                        watchedIDs.add(cleanImdbID);
                    }
                }
            }
            
            console.log('Watched IDs found:', watchedIDs.size);
            return watchedIDs;
        });
}

// Helper to check if a film is watched
function isFilmWatched(imdbID) {
    return watchedFilms.some(f => f === imdbID);
}

// Function to display film details
async function showFilmDetails(film) {
    history.replaceState({}, "", urlBase +"?id=" + film.imdbID);

    const rightPanel = document.getElementById('right-panel');

    const posterUrl = film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : '';
    const backdropUrl = film.backdrop_path ? `https://image.tmdb.org/t/p/w500${film.backdrop_path}` : '';

    const backdrop = document.getElementById('backdrop');
    backdrop.style.backgroundImage = `url(${backdropUrl})`;
    backdrop.style.filter = 'brightness(50%)';
    let mediaq = window.matchMedia("(max-width: 768px)").matches;
    backdrop.style.display = mediaq ? 'none' : 'flex';

    const poster = document.getElementById('poster');
    poster.src = posterUrl;
    poster.style.display = "flex";

    const getScoreValue = (score) => (score ? score : 'N/A');

    const filmTitle = document.getElementById('film-title');
    filmTitle.innerHTML = `<h2>${film.Title} (${film.Year})</h2>`;

    const filmDetails = document.getElementById('film-details');
    filmDetails.innerHTML = `
        <p><strong>Season:</strong> ${film.Season ? film.Season : "N/A"}</p> 
        <p><strong>Watched:</strong> ${film.Watched ? "Yes" : "No"}</p>
        <p><strong>Director:</strong> ${film.Director || 'N/A'}</p>
        <p><strong>Summary:</strong> ${film.Plot || 'N/A'}</p>
        <p><strong>Runtime:</strong> ${film.Runtime || 'N/A'} mins</p>
        <p><strong>Rotten Tomatoes Score:</strong> ${getScoreValue(film.RT)}%</p>
        <p><strong><a href=${film.IMDb_link ? film.IMDb_link : "N/A"}><strong>IMDb</strong></a> Score:</strong> ${getScoreValue(film.IMDb)}/10</p>
        <p><strong>MetaCritic Score:</strong> ${getScoreValue(film.Meta)}%</p>
        <p><strong>Actors:</strong> ${film.Actors || 'N/A'}</p>
        <p><strong>Box Office:</strong> ${formatCurrency(film.BoxOffice)}</p>
        <p><strong>Rating:</strong> ${film.Rated || 'N/A'}</p>
        <p><strong>Language:</strong> ${film.Language || 'N/A'}</p>
        <p class="back" onclick="rightPanelHome()">Back</p>
    `;
    rightPanel.style.display = 'flex';
}

// Function to sort films based on selected criteria
function sortFilms(films, criteria) {
    return films.sort((a, b) => {
        if (criteria === 'Title') {
            return a.Title.localeCompare(b.Title);
        }
        else if (criteria === 'Year') {
            return b.Year - a.Year; // Sort by year, descending
        }
        else if (criteria === 'IMDb') {
            return b.IMDb - a.IMDb; // Sort by IMDb score, descending
        }
        else if (criteria === 'Metacritic') {
            return b.Meta - a.Meta; // Sort by Metacritic score, descending
        }
        else if (criteria === 'Runtime') {
            return a.Runtime - b.Runtime; // Sort by Runtime score, ascending
        }
        else if (criteria === 'RT') {
            return b.RT - a.RT; // Sort by Rotten toms score, descending
        }
        else if (criteria === 'Boxoffice') {
            return b.BoxOffice - a.BoxOffice; // Sort by Boxoffice score, descending
        }
        else if (criteria === 'Season') {
            return (a.Season === null) - (b.Season === null) || +(b.Season > a.Season) || -(b.Season < a.Season);
        }
    });
}

// Function to filter films based on watched status
function filterFilms(films, filter) {
    if (filter === 'all') {
        return films; // No filtering
    }
    else if (filter === "watched") {
        return films.filter(film => film.Watched);
    }
    else {
        return films.filter(film => !film.Watched);
    }
}

// Function to format Box Office numbers
function formatCurrency(amount) {
    if (amount == null) {
        return 'N/A';
    }

    if (typeof amount === 'string') {
        let numericValue = parseInt(amount.replace(/[^0-9]/g, ''), 10);
        return '$' + numericValue.toLocaleString();
    }

    return '$' + amount.toLocaleString();
}

// Function to display the films list
function displayFilms(films) {
    const filmList = document.getElementById('films');
    filmList.innerHTML = '';

    if (films.length === 0) {
        const listItem = document.createElement('li');
        listItem.textContent = 'No films match the current filter';
        listItem.className = 'error';
        filmList.appendChild(listItem);
        return;
    }

    films.forEach(film => {
        const listItem = document.createElement('li');
        listItem.textContent = film.Title;
        listItem.addEventListener('click', () => showFilmDetails(film));
        filmList.appendChild(listItem);
    });
}

// Function to load films from JSON and populate the film list
function loadFilms() {
    // First fetch films.json
    fetch('films.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            filmsData = data;
            console.log('Films data loaded:', filmsData.length, 'films');
            
            // Then fetch watched_films.csv
            return loadWatchedFilmsCSV();
        })
        .then(watchedIDs => {
            if (!watchedIDs) {
                console.error('No watched IDs returned');
                watchedFilms = [];
                return;
            }
            
            // Store the watched IDs in our global watchedFilms array
            watchedFilms = Array.from(watchedIDs);
            console.log('Watched films loaded:', watchedFilms.length, 'films');
            
            // Update the watched status in each film object
            filmsData.forEach(film => {
                film.Watched = isFilmWatched(film.imdbID);
            });
            
            // Now we can process and display the films
            const sortedFilms = sortFilms(filmsData, document.getElementById('sort-options').value);
            const filteredFilms = filterFilms(sortedFilms, document.getElementById('filter-options').value);
            displayFilms(filteredFilms);
            processURL();
        })
        .catch(error => {
            console.error('Error loading data:', error.message);
            
            // Display error to user if no films are available
            if (filmsData.length === 0) {
                const filmList = document.getElementById('films');
                filmList.innerHTML = `<li class="error">Error loading films: ${error.message}</li>`;
            } else {
                // Fallback to still show films if we have any loaded
                const sortedFilms = sortFilms(filmsData, document.getElementById('sort-options').value);
                displayFilms(sortedFilms);
                processURL();
            }
        });
}

// Event listeners for sorting and filtering
document.getElementById('sort-options').addEventListener('change', () => {
    const sortedFilms = sortFilms(filmsData, document.getElementById('sort-options').value);
    const filteredFilms = filterFilms(sortedFilms, document.getElementById('filter-options').value);
    displayFilms(filteredFilms);
});

document.getElementById('filter-options').addEventListener('change', () => {
    const sortedFilms = sortFilms(filmsData, document.getElementById('sort-options').value);
    const filteredFilms = filterFilms(sortedFilms, document.getElementById('filter-options').value);
    displayFilms(filteredFilms);
});

function searchFilter(){
    const term = document.getElementById('search').value.toLowerCase();

    const exactMatches = filmsData.filter(
        (film) =>
            film.Title.toLowerCase().startsWith(term)
    );

    const partialMatches = filmsData.filter(
        (film) =>
            film.Title.toLowerCase().includes(term) &&
            !(
                film.Title.toLowerCase().startsWith(term)
            )
    );

    const allMatches = [...exactMatches, ...partialMatches];

    displayFilms(allMatches);
}

function rightPanelHome() {
    history.replaceState({}, "", urlBase);
    const poster = document.getElementById('poster');
    poster.style.display = "none";

    const backdrop = document.getElementById('backdrop');
    backdrop.style.display = 'flex';
    backdrop.style.backgroundImage = 'url(img/SFV1_crop.jpg)';
    backdrop.style.filter = 'brightness(100%)';

    const rightPanel = document.getElementById('right-panel');
    rightPanel.style.display = 'flex';
    const filmTitle = document.getElementById('film-title');
    // filmTitle.innerHTML = `<h2>Welcome to <font color="grey"><del>Sci-fi</del></font> Van-tru Night!</h2>`;
    filmTitle.innerHTML = `<h2>Welcome to Sci-fi Night!</h2>`;

    const filmDetails = document.getElementById('film-details');
    filmDetails.innerHTML = `<p></p><a href='stats.html'>Stats</a>`;
    filmDetails.innerHTML = filmDetails.innerHTML + `<p></p><a href='vote.html'>Vote!</a>`;
}

// Run this when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadFilms);

function getFilmByID(films, id) {
    return films.filter(film => film.imdbID == id);
}

function processURL() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let urlID = urlParams.get('id');
    if (urlID) {
        const urlFilm = getFilmByID(filmsData, urlID);
        if (urlFilm.length == 1) {
            showFilmDetails(urlFilm[0]);
        }
        else {
            rightPanelHome();
        }
    }
    else {
        rightPanelHome();
    }
}
