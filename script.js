// // script.js
let filmsData = []; // Store loaded films data globally

// Function to display film details
async function showFilmDetails(film) {

    // Set the backdrop image
    const rightPanel = document.getElementById('right-panel');
    // detailsContainer.style.backgroundImage = `url(${backdropUrl})`;

    const posterUrl = film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : '';
    const backdropUrl = film.backdrop_path ? `https://image.tmdb.org/t/p/w500${film.backdrop_path}` : '';

    // Set the backdrop image
    const backdrop = document.getElementById('backdrop');
    backdrop.style.backgroundImage = `url(${backdropUrl})`;
    backdrop.style.filter = 'brightness(50%)';

    // // Set the poster image
    const poster = document.getElementById('poster');
    poster.src = posterUrl;
    poster.alt = "${film.Title} poster";


    // Function to safely get score values or return a default message
    const getScoreValue = (score) => (score ? score : 'N/A');
    
    const filmTitle = document.getElementById('film-title');
    filmTitle.innerHTML=`<h2>${film.Title} (${film.Year})</h2>`

    const filmDetails = document.getElementById('film-details');
    filmDetails.innerHTML = ` 
        <p><strong>Director:</strong> ${film.Director || 'N/A'}</p>
        <p><strong>Summary:</strong> ${film.Plot || 'N/A'}</p>
        <p><strong>Runtime:</strong> ${film.Runtime || 'N/A'} mins</p>
        <p><strong>Rotten Tomatoes Score:</strong> ${getScoreValue(film.RT)}%</p>
        <p><strong>IMDb Score:</strong> ${getScoreValue(film.IMDb)}/10</p>
        <p><strong>MetaCritic Score:</strong> ${getScoreValue(film.Meta)}%</p>
        <p><strong>Actors:</strong> ${film.Actors || 'N/A'}</p>
        <p><strong>Box Office:</strong> ${formatCurrency(film.BoxOffice)}</p>
        <p><strong>Rating:</strong> ${film.Rated || 'N/A'}</p>
        <p><strong>Language:</strong> ${film.Language || 'N/A'}</p>
        <p><strong>Watched:</strong> ${film.Watched ? "Yes":"No"}</p>
        <p><strong>Season:</strong> ${film.Season ? film.Season : "N/A"}</p>
    `;
    // Show the details container
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
            // return a.Season - b.Season; // Sort by Season score, ascending
        }
    });
}
// Function to filter films based on rating
function filterFilms(films, filter) {
    if (filter === 'all') {
        return films; // No filtering
    }
    else if (filter === "watched"){
        return films.filter(film => film.Watched === 1);
    }
    else {
        return films.filter(film => film.Watched === 0);
    }

}
// Function to format Box Office numbers
function formatCurrency(amount) {
    // Check if amount is null or undefined
    if (amount == null) {
        return 'N/A'; // Return a default message if no value is present
    }

    // If amount is a string, parse it to a number
    if (typeof amount === 'string') {
        let numericValue = parseInt(amount.replace(/[^0-9]/g, ''), 10);
        return '$' + numericValue.toLocaleString();
    }

    // If amount is a number, format it directly
    return '$' + amount.toLocaleString();
}
// Function to display the films list
function displayFilms(films) {
    const filmList = document.getElementById('films');
    filmList.innerHTML = ''; // Clear the current list

    films.forEach(film => {
        const listItem = document.createElement('li');
        listItem.textContent = film.Title;
        listItem.addEventListener('click', () => showFilmDetails(film));
        filmList.appendChild(listItem);
    });
}

// Function to load films from JSON and populate the film list
function loadFilms() {
    fetch('films.json')  // Path to your JSON file
        .then(response => response.json())
        .then(data => {
            filmsData = data; // Store loaded data globally
            const sortedFilms = sortFilms(filmsData, document.getElementById('sort-options').value);
            const filteredFilms = filterFilms(sortedFilms, document.getElementById('filter-options').value);
            displayFilms(filteredFilms); // Display sorted and filtered films
        })
        .catch(error => console.error('Error loading JSON:', error));
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


// Set the backdrop image
const backdrop = document.getElementById('backdrop');
backdrop.style.backgroundImage = 'url(SFV1_crop.jpg)';
backdrop.style.filter= 'brightness(100%)';
// // // Set the poster image
// const poster = document.getElementById('poster');
// poster.src = '/SFV1_crop.jpg';


const rightPanel = document.getElementById('right-panel');
rightPanel.style.display = 'flex';
const filmTitle = document.getElementById('film-title');
filmTitle.innerHTML = `<h2>Welcome to Sci-fi Night!</h2>`
const filmDetails = document.getElementById('film-details');
filmDetails.innerHTML = `<p><strong></strong></p>`


// Run this when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadFilms);