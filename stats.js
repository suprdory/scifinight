const log = console.log
document.addEventListener("DOMContentLoaded", () => {
    loadAndProcessStats();
});

async function loadAndProcessStats() {
    try {
        const scifiDataResponse = await fetch("scifi_data.csv");
        if (!scifiDataResponse.ok) throw new Error("Failed to load scifi_data.csv");
        const scifiDataText = await scifiDataResponse.text();

        const watchedFilmsResponse = await fetch("watched_films.csv");
        if (!watchedFilmsResponse.ok) throw new Error("Failed to load watched_films.csv");
        const watchedFilmsCsvText = await watchedFilmsResponse.text();

        Papa.parse(scifiDataText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: function(scifiResults) {
                const scifiFilms = scifiResults.data;

                Papa.parse(watchedFilmsCsvText, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    complete: function(watchedResults) {
                        const watchedImdbIds = new Set();
                        let imdbIDKey = null;

                        if (watchedResults.meta && watchedResults.meta.fields) {
                            imdbIDKey = watchedResults.meta.fields.find(field => field.toLowerCase() === 'imdbid');
                        }

                        if (!imdbIDKey && watchedResults.data.length > 0 && typeof watchedResults.data[0] === 'object' && watchedResults.data[0] !== null) {
                            const firstRowKeys = Object.keys(watchedResults.data[0]);
                            imdbIDKey = firstRowKeys.find(key => key.toLowerCase() === 'imdbid');
                        }

                        if (imdbIDKey) {
                            watchedResults.data.forEach(row => {
                                if (row[imdbIDKey]) {
                                    watchedImdbIds.add(String(row[imdbIDKey]));
                                }
                            });
                        } else {
                            console.warn("Could not determine 'imdbID' column in watched_films.csv. Proceeding as if no films are watched for stats calculation.");
                        }
                        processCSV(scifiFilms, watchedImdbIds);
                    },
                    error: function(error) {
                        console.error("Error parsing watched_films.csv:", error);
                        processCSV(scifiResults.data, new Set());
                    }
                });
            },
            error: function(error) {
                console.error("Error parsing scifi_data.csv:", error);
            }
        });
    } catch (error) {
        console.error("Error fetching CSV files:", error);
    }
}

function processCSV(data, watchedImdbIds) {
    if (data.length === 0) {
        console.warn("CSV file is empty or could not be parsed.");
        return;
    }

    const seasonStats = {};
    const nSeasons = 12;
    for (let s = 1; s <= nSeasons; s++) {
        seasonStats[s] = { nFilms: 0, nWatched: 0, nUnwatched: 0, runtime: 0, imdb: 0, rt: 0, year: 0, complete: 0 };
    }

    data.forEach(row => {
        const season = row["Season"];
        const filmImdbID = row["imdbID"] ? String(row["imdbID"]) : null;

        seasonStats[season]["nFilms"] = (seasonStats[season]["nFilms"] || 0) + 1;

        if (filmImdbID && watchedImdbIds.has(filmImdbID)) {
            seasonStats[season]["nWatched"] = (seasonStats[season]["nWatched"] || 0) + 1;
        } else {
            seasonStats[season]["nUnwatched"] = (seasonStats[season]["nUnwatched"] || 0) + 1;
        }

        seasonStats[season]["runtime"] = (seasonStats[season]["runtime"] || 0) + (row["Runtime"] || 0);
        seasonStats[season]["imdb"] = (seasonStats[season]["imdb"] || 0) + (row["IMDb"] || 0);
        seasonStats[season]["rt"] = (seasonStats[season]["rt"] || 0) + (row["RT"] || 0);
        seasonStats[season]["year"] = (seasonStats[season]["year"] || 0) + (row["Year"] || 0);
    });

    for (let s = 1; s <= nSeasons; s++) {
        if (seasonStats[s] && seasonStats[s]['nFilms'] > 0) {
            seasonStats[s]['complete'] = 100 * seasonStats[s]["nWatched"] / seasonStats[s]["nFilms"];
            seasonStats[s]['runtime'] = seasonStats[s]['runtime'] / seasonStats[s]["nFilms"];
            seasonStats[s]['imdb'] = seasonStats[s]['imdb'] / seasonStats[s]["nFilms"];
            seasonStats[s]['rt'] = seasonStats[s]['rt'] / seasonStats[s]["nFilms"];
            seasonStats[s]['year'] = seasonStats[s]['year'] / seasonStats[s]["nFilms"];
        } else if (seasonStats[s]) {
            seasonStats[s]['complete'] = 0;
            seasonStats[s]['runtime'] = 0;
            seasonStats[s]['imdb'] = 0;
            seasonStats[s]['rt'] = 0;
            seasonStats[s]['year'] = 0;
        }
    }

    let totName = "Not";
    let s = totName;
    seasonStats[totName] = { nFilms: 0, nWatched: 0, nUnwatched: 0, runtime: 0, imdb: 0, rt: 0, year: 0, complete: 0 };

    data.forEach(row => {
        const filmImdbID = row["imdbID"] ? String(row["imdbID"]) : null;
        if (filmImdbID && !watchedImdbIds.has(filmImdbID)) {
            seasonStats[totName]["nFilms"]++;
            seasonStats[totName]["nUnwatched"]++;
            seasonStats[totName]["runtime"] += (row["Runtime"] || 0);
            seasonStats[totName]["imdb"] += (row["IMDb"] || 0);
            seasonStats[totName]["rt"] += (row["RT"] || 0);
            seasonStats[totName]["year"] += (row["Year"] || 0);
        }
    });

    if (seasonStats[totName]["nFilms"] > 0) {
        seasonStats[totName]['complete'] = 0;
        seasonStats[totName]['runtime'] /= seasonStats[totName]["nFilms"];
        seasonStats[totName]['imdb'] /= seasonStats[totName]["nFilms"];
        seasonStats[totName]['rt'] /= seasonStats[totName]["nFilms"];
        seasonStats[totName]['year'] /= seasonStats[totName]["nFilms"];
    }

    totName = "Watched";
    s = totName;
    seasonStats[totName] = { nFilms: 0, nWatched: 0, nUnwatched: 0, runtime: 0, imdb: 0, rt: 0, year: 0, complete: 0 };

    data.forEach(row => {
        const filmImdbID = row["imdbID"] ? String(row["imdbID"]) : null;
        if (filmImdbID && watchedImdbIds.has(filmImdbID)) {
            seasonStats[totName]["nFilms"]++;
            seasonStats[totName]["nWatched"]++;
            seasonStats[totName]["runtime"] += (row["Runtime"] || 0);
            seasonStats[totName]["imdb"] += (row["IMDb"] || 0);
            seasonStats[totName]["rt"] += (row["RT"] || 0);
            seasonStats[totName]["year"] += (row["Year"] || 0);
        }
    });

    if (seasonStats[totName]["nFilms"] > 0) {
        seasonStats[totName]['complete'] = 100;
        seasonStats[totName]['runtime'] /= seasonStats[totName]["nFilms"];
        seasonStats[totName]['imdb'] /= seasonStats[totName]["nFilms"];
        seasonStats[totName]['rt'] /= seasonStats[totName]["nFilms"];
        seasonStats[totName]['year'] /= seasonStats[totName]["nFilms"];
    }

    totName = "Total";
    s = totName;
    seasonStats[totName] = { nFilms: 0, nWatched: 0, nUnwatched: 0, runtime: 0, imdb: 0, rt: 0, year: 0, complete: 0 };

    data.forEach(row => {
        const filmImdbID = row["imdbID"] ? String(row["imdbID"]) : null;
        seasonStats[totName]["nFilms"]++;
        if (filmImdbID && watchedImdbIds.has(filmImdbID)) {
            seasonStats[totName]["nWatched"]++;
        } else {
            seasonStats[totName]["nUnwatched"]++;
        }
        seasonStats[totName]["runtime"] += (row["Runtime"] || 0);
        seasonStats[totName]["imdb"] += (row["IMDb"] || 0);
        seasonStats[totName]["rt"] += (row["RT"] || 0);
        seasonStats[totName]["year"] += (row["Year"] || 0);
    });

    if (seasonStats[totName]["nFilms"] > 0) {
        seasonStats[totName]['complete'] = 100 * seasonStats[totName]["nWatched"] / seasonStats[totName]["nFilms"];
        seasonStats[totName]['runtime'] /= seasonStats[totName]["nFilms"];
        seasonStats[totName]['imdb'] /= seasonStats[totName]["nFilms"];
        seasonStats[totName]['rt'] /= seasonStats[totName]["nFilms"];
        seasonStats[totName]['year'] /= seasonStats[totName]["nFilms"];
    }

    displayStats(seasonStats);

    let totalWatchedMins = 0;
    data.forEach(row => {
        const filmImdbID = row["imdbID"] ? String(row["imdbID"]) : null;
        if (filmImdbID && watchedImdbIds.has(filmImdbID))
            totalWatchedMins = totalWatchedMins + (row["Runtime"] || 0);
    });
    displayFooterStats(totalWatchedMins);
}

function displayFooterStats(tot) {
    const foot = document.querySelector("#footer");
    foot.innerHTML = `Total minutes watched: ${tot}`;
}

function displayStats(seasonStats) {
    const tbody = document.querySelector("#statsTable tbody");
    tbody.innerHTML = "";

    for (const [season, data] of Object.entries(seasonStats)) {
        const row = `
        <tr>
            <td>${season}</td>
            <td>${data.nFilms}</td>
            <td>${data.nWatched}</td>
            <td>${data.complete.toFixed(0)}</td>
            <td>${data.runtime.toFixed(0)}</td>
            <td>${data.imdb.toFixed(1)}</td>
            <td>${data.rt.toFixed(0)}</td>
            <td>${data.year.toFixed(0)}</td>
        </tr>
        `;
        tbody.innerHTML = row + tbody.innerHTML;
    }
}

