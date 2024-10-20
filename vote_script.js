let films = [];
let remainingFilms = [];
let progressElement = document.getElementById('progress');
let filmContainer = document.getElementById('film-container');
let startButton = document.getElementById('start-btn');
let filterSection = document.getElementById('filters'); // Get the filters section
let titleSection = document.getElementById('title');

// Fetch films from films.json
fetch('films.json')
    .then(response => response.json())
    .then(data => {
        films = data;
    })
    .catch(error => console.error('Error loading films:', error));

// Filter films based on the selected Watched filter
function filterFilms(films) {
    let watchedFilter = document.getElementById('watched-filter').value;
    if (watchedFilter === 'all') {
        return films;
    } else if (watchedFilter === 'watched') {
        return films.filter(film => film.Watched === true);
    } else {
        return films.filter(film => film.Watched === false);
    }
}

// Shuffle array utility function
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Divide the films into two groups and display them
function displayFilmGroups() {
    filmContainer.innerHTML = ''; // Clear previous content

    // Shuffle the remaining films and divide them
    shuffleArray(remainingFilms);
    let half = Math.ceil(remainingFilms.length / 2);
    let group1 = remainingFilms.slice(0, half);
    let group2 = remainingFilms.slice(half);

    // Create elements for each group
    let group1Element = createGroupElement(group1, "group1");
    let group2Element = createGroupElement(group2, "group2");

    // Append the groups to the container
    filmContainer.appendChild(group1Element);
    filmContainer.appendChild(group2Element);

    // Update progress
    let remainingDecisions = Math.ceil(Math.log2(remainingFilms.length));
    progressElement.textContent = `< ${remainingDecisions+1} decisions, ${remainingFilms.length} films remaining`;

    
}

// Create the film group element and display additional info (year and runtime)
function createGroupElement(group, groupId) {
    let groupElement = document.createElement('div');
    groupElement.classList.add('film-group');
    groupElement.classList.add('scroll');
    groupElement.id = groupId;

    // Display each film with its title, year, and runtime
    groupElement.innerHTML = group.map(film => `
    <strong>${film.Title}</strong> (${film.Year})
    ${film.Runtime} mins
  `).join('<br><br>');

    // Add click event to eliminate this group
    groupElement.addEventListener('click', () => {
        eliminateGroup(groupId);
    });

    return groupElement;
}

// Eliminate the selected group
function eliminateGroup(groupId) {
    let groupToRemove;
    if (groupId === "group1") {
        groupToRemove = remainingFilms.slice(0, Math.ceil(remainingFilms.length / 2));
    } else {
        groupToRemove = remainingFilms.slice(Math.ceil(remainingFilms.length / 2));
    }

    remainingFilms = remainingFilms.filter(film => !groupToRemove.includes(film));

    if (remainingFilms.length > 1) {
        displayFilmGroups();
    } else {
        showFinalFilm();
    }
}

// Show the final selected film
function showFinalFilm() {
    let finalFilm = remainingFilms[0];
    filmContainer.innerHTML = `
    <h2>The chosen film is: <br>${finalFilm.Title} (${finalFilm.Year})</h2>
  `;
    progressElement.textContent = '';
    startButton.textContent = "Re-vote";
}

// Start the game and apply the filter when clicked
startButton.addEventListener('click', () => {
    remainingFilms = filterFilms(films); // Apply the Watched filter

    // Remove filter section to free up space
    filterSection.style.display = 'none';
    // Remove filter section to free up space
    titleSection.style.display = 'none';

    if (remainingFilms.length > 1) {
        displayFilmGroups();
        startButton.textContent = "Restart";
    } else {
        alert("No films match the selected criteria.");
    }
});
