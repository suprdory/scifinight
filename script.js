// // script.js
let filmsData = []; // Store loaded films data globally
let watchedFilms = []; // Store watched films data globally
let urlBase = window.location.pathname;

// Helper function to estimate missing dates based on known dates
function estimateMissingDates(orderedFilms, watchDates) {
    // Find films with actual dates to use as reference points
    const filmsWithDates = orderedFilms.filter(film => film.hasDate);
    
    if (filmsWithDates.length < 2) {
        console.log('Not enough dated films for interpolation');
        return; // Not enough reference points for interpolation
    }
    
    // Find sequences of films with missing dates
    let currentStartIndex = 0;
    
    while (currentStartIndex < orderedFilms.length) {
        // Find the next sequence of films without dates
        let sequenceStart = -1;
        let sequenceEnd = -1;
        
        // Find start of sequence (first film without a date)
        for (let i = currentStartIndex; i < orderedFilms.length; i++) {
            if (!orderedFilms[i].hasDate) {
                sequenceStart = i;
                break;
            }
        }
        
        // If no more sequences found, we're done
        if (sequenceStart === -1) break;
        
        // Find end of sequence (next film with a date, or end of list)
        for (let i = sequenceStart + 1; i < orderedFilms.length; i++) {
            if (orderedFilms[i].hasDate) {
                sequenceEnd = i - 1;
                break;
            }
        }
        
        // If reached end of list without finding another date
        if (sequenceEnd === -1) sequenceEnd = orderedFilms.length - 1;
        
        // Find reference dates before and after the sequence
        let beforeDate = null;
        let afterDate = null;
        let beforeIndex = -1;
        let afterIndex = -1;
        
        // Find the dated film before the sequence
        for (let i = sequenceStart - 1; i >= 0; i--) {
            if (orderedFilms[i].hasDate) {
                beforeDate = orderedFilms[i].date;
                beforeIndex = i;
                break;
            }
        }
        
        // Find the dated film after the sequence
        for (let i = sequenceEnd + 1; i < orderedFilms.length; i++) {
            if (orderedFilms[i].hasDate) {
                afterDate = orderedFilms[i].date;
                afterIndex = i;
                break;
            }
        }
        
        // Interpolate dates if we have before and after references
        if (beforeDate && afterDate) {
            // Parse the dates
            const parseDate = dateStr => {
                const [day, month, year] = dateStr.split('-').map(Number);
                // Convert 2-digit year to 4-digit (assuming 20xx for reasonable dates)
                const fullYear = year + (year < 50 ? 2000 : 1900);
                return new Date(fullYear, month - 1, day);
            };
            
            const beforeTime = parseDate(beforeDate).getTime();
            const afterTime = parseDate(afterDate).getTime();
            
            // Calculate time difference
            const totalDiff = afterTime - beforeTime;
            const totalPositions = afterIndex - beforeIndex;
            
            // Interpolate for each position
            for (let i = sequenceStart; i <= sequenceEnd; i++) {
                const film = orderedFilms[i];
                
                // Calculate proportional date based on position
                const positionRatio = (i - beforeIndex) / totalPositions;
                const estimatedTime = beforeTime + (totalDiff * positionRatio);
                const estimatedDate = new Date(estimatedTime);
                
                // Convert to dd-mm-yy format
                const day = String(estimatedDate.getDate()).padStart(2, '0');
                const month = String(estimatedDate.getMonth() + 1).padStart(2, '0');
                const year = String(estimatedDate.getFullYear() % 100).padStart(2, '0');
                const formattedDate = `${day}-${month}-${year}`;
                
                // Store the estimated date
                watchDates.set(film.imdbID, { date: formattedDate, isEstimated: true });
            }
        } 
        // Special case: we're at the beginning with no before reference
        else if (!beforeDate && afterDate) {
            // Assume films are watched roughly every 2 weeks before the first dated film
            const parseDate = dateStr => {
                const [day, month, year] = dateStr.split('-').map(Number);
                const fullYear = year + (year < 50 ? 2000 : 1900);
                return new Date(fullYear, month - 1, day);
            };
            
            const afterDateTime = parseDate(afterDate);
            
            // Work backwards from the first dated film
            for (let i = sequenceEnd; i >= sequenceStart; i--) {
                const film = orderedFilms[i];
                
                // Subtract roughly 2 weeks per film (14 days)
                const estimatedTime = new Date(afterDateTime.getTime() - ((afterIndex - i) * 14 * 24 * 60 * 60 * 1000));
                
                // Convert to dd-mm-yy format
                const day = String(estimatedTime.getDate()).padStart(2, '0');
                const month = String(estimatedTime.getMonth() + 1).padStart(2, '0');
                const year = String(estimatedTime.getFullYear() % 100).padStart(2, '0');
                const formattedDate = `${day}-${month}-${year}`;
                
                // Store the estimated date
                watchDates.set(film.imdbID, { date: formattedDate, isEstimated: true });
            }
        } 
        // Special case: we're at the end with no after reference
        else if (beforeDate && !afterDate) {
            // Assume films are watched roughly every 2 weeks after the last dated film
            const parseDate = dateStr => {
                const [day, month, year] = dateStr.split('-').map(Number);
                const fullYear = year + (year < 50 ? 2000 : 1900);
                return new Date(fullYear, month - 1, day);
            };
            
            const beforeDateTime = parseDate(beforeDate);
            
            // Work forwards from the last dated film
            for (let i = sequenceStart; i <= sequenceEnd; i++) {
                const film = orderedFilms[i];
                
                // Add roughly 2 weeks per film (14 days)
                const estimatedTime = new Date(beforeDateTime.getTime() + ((i - beforeIndex) * 14 * 24 * 60 * 60 * 1000));
                
                // Convert to dd-mm-yy format
                const day = String(estimatedTime.getDate()).padStart(2, '0');
                const month = String(estimatedTime.getMonth() + 1).padStart(2, '0');
                const year = String(estimatedTime.getFullYear() % 100).padStart(2, '0');
                const formattedDate = `${day}-${month}-${year}`;
                
                // Store the estimated date
                watchDates.set(film.imdbID, { date: formattedDate, isEstimated: true });
            }
        }
        
        // Move to next potential sequence
        currentStartIndex = sequenceEnd + 1;
    }
}

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
            
            // Find the index positions for Title, imdbID, and Date
            const titleIndex = cleanHeaders.indexOf('Title');
            const imdbIDIndex = cleanHeaders.indexOf('imdbID');
            const dateIndex = cleanHeaders.indexOf('Date');
            
            if (titleIndex === -1 || imdbIDIndex === -1) {
                console.error('CSV headers not found:', cleanHeaders);
                return { watchedIDs: new Set(), watchDates: new Map(), orderedFilms: [] };
            }
            
            // Process each line (skip header)
            const watchedIDs = new Set();
            const watchDates = new Map(); // Map to store imdbID -> watch date
            const orderedFilms = []; // Store films in order for date interpolation
            
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue; // Skip empty lines
                
                const values = lines[i].split(',');
                if (values.length > imdbIDIndex) {
                    // Clean the imdbID value to remove any carriage returns or whitespace
                    const cleanImdbID = values[imdbIDIndex].trim().replace(/\r$/, '');
                    if (cleanImdbID) {
                        watchedIDs.add(cleanImdbID);
                        
                        // Create film entry with id and position
                        const filmEntry = {
                            imdbID: cleanImdbID,
                            position: orderedFilms.length, // Store position for interpolation
                            hasDate: false
                        };
                        
                        // Store watch date if available
                        if (dateIndex !== -1 && values.length > dateIndex) {
                            const watchDate = values[dateIndex]?.trim().replace(/\r$/, '');
                            if (watchDate) {
                                watchDates.set(cleanImdbID, { date: watchDate, isEstimated: false });
                                filmEntry.hasDate = true;
                                filmEntry.date = watchDate;
                            }
                        }
                        
                        orderedFilms.push(filmEntry);
                    }
                }
            }
            
            // Interpolate missing dates
            estimateMissingDates(orderedFilms, watchDates);
            
            console.log('Watched IDs found:', watchedIDs.size);
            console.log('Watch dates found:', watchDates.size);
            return { watchedIDs, watchDates, orderedFilms };
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
    
    // Format the watch date in a more readable format
    let formattedWatchDate = "N/A";
    if (film.WatchDate) {
        const [day, month, year] = film.WatchDate.split('-');
        // Convert yy to 20yy (or 19yy if needed)
        const fullYear = parseInt(year) + (parseInt(year) < 50 ? 2000 : 1900);
        // Get month name from month number
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[parseInt(month) - 1];
        
        // Add indication if the date is estimated with styling
        if (film.WatchDateEstimated) {
            formattedWatchDate = `${parseInt(day)} ${monthName} ${fullYear} <span class="estimated-date">(est.)</span>`;
        } else {
            formattedWatchDate = `${parseInt(day)} ${monthName} ${fullYear}`;
        }
    }
    
    filmDetails.innerHTML = `
        <p><strong>Season:</strong> ${film.Season ? film.Season : "N/A"}</p> 
        <p><strong>Watched:</strong> ${film.Watched ? "Yes" : "No"}</p>
        <p><strong>Watch Date:</strong> ${formattedWatchDate}</p>
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
        else if (criteria === 'WatchDate') {
            // Sort by watch date, most recent first
            // If a film doesn't have a watch date, put it at the end
            if (!a.WatchDate && !b.WatchDate) return 0;
            if (!a.WatchDate) return 1;
            if (!b.WatchDate) return -1;
            
            // Parse dates in dd-mm-yy format
            const parseDateStr = dateStr => {
                const [day, month, year] = dateStr.split('-').map(Number);
                // Convert 2-digit year to 4-digit year (assuming 20xx for yy < 50, 19xx for yy >= 50)
                const fullYear = year + (year < 50 ? 2000 : 1900);
                // JavaScript months are 0-indexed
                return new Date(fullYear, month - 1, day);
            };
            
            const dateA = parseDateStr(a.WatchDate);
            const dateB = parseDateStr(b.WatchDate);
            
            return dateB - dateA; // Most recent first
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

    // Update film count
    const filmCount = document.getElementById('film-count');
    filmCount.textContent = `${films.length} of ${filmsData.length}`;

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

// Function to load films from CSV and populate the film list
function loadFilms() {
    // Fetch scifi_data.csv
    fetch('scifi_data.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            return new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    complete: function(results) {
                        filmsData = results.data;
                        console.log('Films data loaded:', filmsData.length, 'films');
                        resolve(filmsData);
                    },
                    error: function(error) {
                        reject(error);
                    }
                });
            });
        })
        .then(() => {
            // Then fetch watched_films.csv
            return loadWatchedFilmsCSV();
        })
        .then(result => {
            if (!result || !result.watchedIDs) {
                console.error('No watched IDs returned');
                watchedFilms = [];
                return;
            }
            
            const { watchedIDs, watchDates, orderedFilms } = result;
            
            // Store the watched IDs in our global watchedFilms array
            watchedFilms = Array.from(watchedIDs);
            console.log('Watched films loaded:', watchedFilms.length, 'films');
            
            // Update the watched status and watch date in each film object
            filmsData.forEach(film => {
                film.Watched = isFilmWatched(film.imdbID);
                
                // Add watch date if available
                if (watchDates && watchDates.has(film.imdbID)) {
                    const dateInfo = watchDates.get(film.imdbID);
                    film.WatchDate = dateInfo.date;
                    film.WatchDateEstimated = dateInfo.isEstimated;
                }
            });
            
            // Now we can process and display the films
            // Set default sort to "WatchDate" if not otherwise specified
            const sortOption = document.getElementById('sort-options').value || 'WatchDate';
            // Make sure the dropdown reflects our default choice
            document.getElementById('sort-options').value = sortOption;
            
            const sortedFilms = sortFilms(filmsData, sortOption);
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
                const sortOption = document.getElementById('sort-options').value || 'WatchDate';
                document.getElementById('sort-options').value = sortOption;
                const sortedFilms = sortFilms(filmsData, sortOption);
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
            film.Title && String(film.Title).toLowerCase().startsWith(term)
    );

    const partialMatches = filmsData.filter(
        (film) =>
            film.Title && String(film.Title).toLowerCase().includes(term) &&
            !(
                String(film.Title).toLowerCase().startsWith(term)
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
    filmDetails.innerHTML = '';
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
