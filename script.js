// // script.js

// Function to display film details
async function showFilmDetails(film) {

    // Set the backdrop image
    const detailsContainer = document.getElementById('details-container');
    // detailsContainer.style.backgroundImage = `url(${backdropUrl})`;

    const posterUrl = film.poster_path ? `https://image.tmdb.org/t/p/w500${film.poster_path}` : '';
    const backdropUrl = film.backdrop_path ? `https://image.tmdb.org/t/p/w500${film.backdrop_path}` : '';
    
    // Set the backdrop image
    const backdrop = document.getElementById('backdrop');
    backdrop.style.backgroundImage = `url(${backdropUrl})`;

    // Set the poster image
    const poster = document.getElementById('poster');
    poster.src = posterUrl;
    poster.alt = "${film.Title} poster";


    // console.log(film,posterUrl)
    const detailsContent = document.getElementById('details-content');
    detailsContent.innerHTML = `
        <h2>${film.Title} (${film.Year})</h2>
        <p><strong>Director:</strong> ${film.Director}</p>
        <p><strong>Summary:</strong> ${film.Plot}</p>
        <p><strong>Runtime:</strong> ${film.Runtime}</p>
        <p><strong>Rotten Tomatoes Score:</strong> ${film.RT}</p>
        <p><strong>IMDb Score:</strong> ${film.IMDb}</p>
        <p><strong>MetaCritic Score:</strong> ${film.Meta}</p>
        <p><strong>Actors:</strong> ${film.Actors}</p>
        <p><strong>Box Office:</strong> ${formatCurrency(film.BoxOffice)}</p>
        <p><strong>Rating:</strong> ${film.Rated}</p>
        <p><strong>Language:</strong> ${film.Language}</p>
    `;
    // Show the details container
    detailsContainer.style.display = 'block';
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


// Function to load films from JSON and populate the film list
function loadFilms() {
    fetch('films.json')  // Path to your JSON file
        .then(response => response.json())
        .then(data => {
            const filmList = document.getElementById('films');

            data.forEach(film => {
                const listItem = document.createElement('li');
                listItem.textContent = film.Title;
                listItem.addEventListener('click', () => showFilmDetails(film));
                filmList.appendChild(listItem);
            });
        })
        .catch(error => console.error('Error loading JSON:', error));
}

// Run this when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadFilms);
