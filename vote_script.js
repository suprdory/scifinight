let films = [];
let vtfilms = [];
let remainingFilms = [];
let progressElement = document.getElementById('progress');
let filmContainer = document.getElementById('film-container');
let startButton = document.getElementById('start-btn');
let filterSection = document.getElementById('filters'); // Get the filters section
let titleSection = document.getElementById('title');

let cb = ["#67001f", "#b2182b", "#d6604d", "#f4a582", "#fddbc7", "#f7f7f7", "#d1e5f0", "#92c5de", "#4393c3", "#2166ac", "#053061"]

document.getElementById('select-all-seasons').addEventListener('click', () => {
    document.querySelectorAll('#season-checkbox-list input[type="checkbox"]').forEach(cb => {
        cb.checked = true;
    });
});

document.getElementById('select-none-seasons').addEventListener('click', () => {
    document.querySelectorAll('#season-checkbox-list input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
});
function addVanTruField(films, vtfilms) {
    vtfilms.forEach(vtfilm => {
        // console.log(vtfilm.imdbID)
        const item = films.find(obj => obj.imdbID === vtfilm.imdbID);
        if (item) {
            item.vantru = true;
        }


    }
    )
    films.forEach(film=>{
        if (film.vantru){

        }
        else{
            film.vantru=false
        }
    })
    // console.log(films)
}
// Fetch films from films.json
fetch('films.json')
    .then(response => response.json())
    .then(data => {
        films = data;
        fetch('films-vantru.json')
            .then(response => response.json())
            .then(data => {
                vtfilms = data;
                // startVote()
                addVanTruField(films, vtfilms);
            })
            .catch(error => console.error('Error loading films:', error));
        // startVote()
        populateSeasonCheckboxes(films);
        // console.log(films)
    })
    .catch(error => console.error('Error loading films:', error));







function populateSeasonCheckboxes(films) {
    const seasonSet = new Set(films.map(film => film.Season));
    const listContainer = document.getElementById('season-checkbox-list');
    listContainer.innerHTML = ''; // Clear old list

    Array.from(seasonSet).sort((a, b) => a - b).forEach(season => {
        const label = document.createElement('label');
        label.style.marginRight = '10px';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = season;
        // checkbox.checked = true; // Default: all selected
        checkbox.checked = false; // Default: all selected

        label.appendChild(checkbox);
        label.append(` Season ${season}`);
        listContainer.appendChild(label);
    });

    // Add vantru box
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = "vantru";
    checkbox.checked = true; // Default: all selected
    checkbox.id = 'vantru'

    const label = document.createElement('label');
    label.style.marginRight = '10px';
    label.appendChild(checkbox);
    label.append(`Van-tru`);
    listContainer.appendChild(label);

}


// Filter films based on the selected Watched filter
// function filterFilms(films) {
//     let watchedFilter = document.getElementById('watched-filter').value;
//     if (watchedFilter === 'all') {
//         return films;
//     } else if (watchedFilter === 'watched') {
//         return films.filter(film => film.Watched === true);
//     } else {
//         return films.filter(film => film.Watched === false);
//     }
// }

function filterFilms(films) {
    const watchedFilter = document.getElementById('watched-filter').value;
    const seasonCheckboxes = document.querySelectorAll('#season-checkboxes input[type="checkbox"]');
    const selectedSeasons = Array.from(seasonCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => Number(cb.value));

    const vantruCB = document.getElementById('vantru').checked
    // console.log("vantruCB",vantruCB)

    return films.filter(film => {
        const watchedMatch = watchedFilter === 'all' ||
            (watchedFilter === 'watched' && film.Watched === true) ||
            (watchedFilter === 'unwatched' && film.Watched === false);

        const seasonMatch = selectedSeasons.length === 0 || selectedSeasons.includes(film.Season);

        const vanTruMatch = film.vantru == vantruCB;
        // console.log(film.vantru)

        return watchedMatch && (seasonMatch || vanTruMatch);
    });
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
    progressElement.textContent = `< ${remainingDecisions + 1} decisions, ${remainingFilms.length} films remaining`;


}

// Create the film group element and display additional info (year and runtime)
function createGroupElement(group, groupId) {
    let groupElement = document.createElement('div');
    groupElement.classList.add('film-group');
    groupElement.classList.add('scroll');
    groupElement.id = groupId;

    // Display each film with its title, year, and runtime
    //     groupElement.innerHTML = group.map(film => `
    //     <strong style="color:${cb[11-parseInt(film.IMDb*11/10)]};">${film.Title}</strong> (${film.Year})
    //     ${film.Runtime} mins
    //   `).join('<br>');

    group.forEach(film => {
        let card = document.createElement('div');
        card.classList.add("film-card")
        let title = document.createElement('h3');
        title.classList.add('film-title')
        title.innerText = film.Title
        title.style.color = cb[parseInt(5 - (film.IMDb - 5) * 1.4)]
        // title.style.color = cb[10]
        card.appendChild(title)

        let filmDetails = document.createElement('div')
        filmDetails.classList.add('film-details')

        let filmYear = document.createElement('span')
        filmYear.classList.add('film-year')
        filmYear.innerText = film.Year

        let filmRuntime = document.createElement('span')
        filmRuntime.classList.add('film-runtime')
        filmRuntime.innerText = film.Runtime + " m"

        filmDetails.appendChild(filmYear)
        filmDetails.appendChild(filmRuntime)

        card.append(filmDetails)

        groupElement.appendChild(card)
        // groupElement.innerHTML = groupElement.innerHTML+element.Title
    });

    // Add click event to eliminate this group
    groupElement.addEventListener('click', () => {
        eliminateGroup(groupId);
    });
    groupElement.style.display = "flex"

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

function startVote() {
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
}



// Start the game and apply the filter when clicked
startButton.addEventListener('click', () => {
    startVote()
});