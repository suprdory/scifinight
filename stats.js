const log = console.log
document.addEventListener("DOMContentLoaded", () => {
    const csvUrl = "scifi_data.csv"; // Change this to your actual CSV URL
    fetchCSV(csvUrl);
});

async function fetchCSV(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to load CSV");

        const csvText = await response.text();
        parseCSV(csvText);
    } catch (error) {
        console.error("Error fetching CSV:", error);
    }
}

function parseCSV(csvText) {
    // log(csvText)
    Papa.parse(csvText, {
        header: true, // Treat first row as column headers
        skipEmptyLines: true,
        dynamicTyping: true, // Convert numbers automatically
        complete: function (results) {
            processCSV(results.data);
            // log(results)
        },
        error: function (error) {
            console.error("Error parsing CSV:", error);
        }
    });
}

function processCSV(data) {
    if (data.length === 0) {
        console.warn("CSV file is empty or could not be parsed.");
        return;
    }


    const seasonStats = {};
    const nSeasons = 11
    for (let s = 1; s <= nSeasons; s++) {
        seasonStats[s] = {}
        seasonStats[s]['nFilms'] = 0;
        seasonStats[s]['nWatched'] = 0;
        seasonStats[s]['nUnwatched'] = 0;
    }

    data.forEach(row => {
        const season = row["Season"];

        seasonStats[season]["nFilms"] = (seasonStats[season]["nFilms"] || 0) + 1;

        if (row["Watched"] === "True") {
            seasonStats[season]["nWatched"] = (seasonStats[season]["nWatched"] || 0) + 1;
        }
        else {
            seasonStats[season]["nUnwatched"] = (seasonStats[season]["nUnwatched"] || 0) + 1;
        }

        seasonStats[season]["runtime"] = (seasonStats[season]["runtime"] || 0) + row["Runtime"];
        seasonStats[season]["imdb"] = (seasonStats[season]["imdb"] || 0) + row["IMDb"];
        seasonStats[season]["rt"] = (seasonStats[season]["rt"] || 0) + row["RT"];
        seasonStats[season]["year"] = (seasonStats[season]["year"] || 0) + row["Year"];
    });
    for (let s = 1; s <= nSeasons; s++) {
        seasonStats[s]['complete'] = 100 * seasonStats[s]["nWatched"] / seasonStats[s]["nFilms"]
        seasonStats[s]['runtime'] = seasonStats[s]['runtime'] / seasonStats[s]["nFilms"]
        seasonStats[s]['imdb'] = seasonStats[s]['imdb'] / seasonStats[s]["nFilms"]
        seasonStats[s]['rt'] = seasonStats[s]['rt'] / seasonStats[s]["nFilms"]
        seasonStats[s]['year'] = seasonStats[s]['year'] / seasonStats[s]["nFilms"]
        // seasonStats[s]['nFilms']=0;
        // seasonStats[s]['nWatched'] = 0;
    }

    // Calculate Unwatched stats
    let totName = "Unwatched"
    let s = totName
    seasonStats[totName] = {}
    seasonStats[s]['nFilms'] = 0;
    seasonStats[s]['nWatched'] = 0;
    seasonStats[s]['nUnwatched'] = 0;

    data.forEach(row => {
        if (row["Watched"] === "False") {
            seasonStats[totName]["nFilms"] = (seasonStats[totName]["nFilms"] || 0) + 1;
            if (row["Watched"] === "True") {
                seasonStats[totName]["nWatched"] = (seasonStats[totName]["nWatched"] || 0) + 1;
            }
            else {
                seasonStats[totName]["nUnwatched"] = (seasonStats[totName]["nUnwatched"] || 0) + 1;
            }
            seasonStats[totName]["runtime"] = (seasonStats[totName]["runtime"] || 0) + row["Runtime"];
            seasonStats[totName]["imdb"] = (seasonStats[totName]["imdb"] || 0) + row["IMDb"];
            seasonStats[totName]["rt"] = (seasonStats[totName]["rt"] || 0) + row["RT"];
            seasonStats[totName]["year"] = (seasonStats[totName]["year"] || 0) + row["Year"];
        }

    });

    seasonStats[s]['complete'] = 100 * seasonStats[s]["nWatched"] / seasonStats[s]["nFilms"]
    seasonStats[s]['runtime'] = seasonStats[s]['runtime'] / seasonStats[s]["nFilms"]
    seasonStats[s]['imdb'] = seasonStats[s]['imdb'] / seasonStats[s]["nFilms"]
    seasonStats[s]['rt'] = seasonStats[s]['rt'] / seasonStats[s]["nFilms"]
    seasonStats[s]['year'] = seasonStats[s]['year'] / seasonStats[s]["nFilms"]

    // Calculate watched stats
    totName = "Watched"
    s = totName
    seasonStats[totName] = {}
    data.forEach(row => {
        if (row["Watched"] === "True") {
            seasonStats[totName]["nFilms"] = (seasonStats[totName]["nFilms"] || 0) + 1;
            if (row["Watched"] === "True") {
                seasonStats[totName]["nWatched"] = (seasonStats[totName]["nWatched"] || 0) + 1;
            }
            else {
                seasonStats[totName]["nUnwatched"] = (seasonStats[totName]["nUnwatched"] || 0) + 1;
            }
            seasonStats[totName]["runtime"] = (seasonStats[totName]["runtime"] || 0) + row["Runtime"];
            seasonStats[totName]["imdb"] = (seasonStats[totName]["imdb"] || 0) + row["IMDb"];
            seasonStats[totName]["rt"] = (seasonStats[totName]["rt"] || 0) + row["RT"];
            seasonStats[totName]["year"] = (seasonStats[totName]["year"] || 0) + row["Year"];
        }

    });

    seasonStats[s]['complete'] = 100 * seasonStats[s]["nWatched"] / seasonStats[s]["nFilms"]
    seasonStats[s]['runtime'] = seasonStats[s]['runtime'] / seasonStats[s]["nFilms"]
    seasonStats[s]['imdb'] = seasonStats[s]['imdb'] / seasonStats[s]["nFilms"]
    seasonStats[s]['rt'] = seasonStats[s]['rt'] / seasonStats[s]["nFilms"]
    seasonStats[s]['year'] = seasonStats[s]['year'] / seasonStats[s]["nFilms"]



    // Calculate total count
    totName = "Total"
    s = totName
    seasonStats[totName] = {}
    data.forEach(row => {
        seasonStats[totName]["nFilms"] = (seasonStats[totName]["nFilms"] || 0) + 1;
        if (row["Watched"] === "True") {
            seasonStats[totName]["nWatched"] = (seasonStats[totName]["nWatched"] || 0) + 1;
        }
        else {
            seasonStats[totName]["nUnwatched"] = (seasonStats[totName]["nUnwatched"] || 0) + 1;
        }
        seasonStats[totName]["runtime"] = (seasonStats[totName]["runtime"] || 0) + row["Runtime"];
        seasonStats[totName]["imdb"] = (seasonStats[totName]["imdb"] || 0) + row["IMDb"];
        seasonStats[totName]["rt"] = (seasonStats[totName]["rt"] || 0) + row["RT"];
        seasonStats[totName]["year"] = (seasonStats[totName]["year"] || 0) + row["Year"];

    });

    seasonStats[s]['complete'] = 100 * seasonStats[s]["nWatched"] / seasonStats[s]["nFilms"]
    seasonStats[s]['runtime'] = seasonStats[s]['runtime'] / seasonStats[s]["nFilms"]
    seasonStats[s]['imdb'] = seasonStats[s]['imdb'] / seasonStats[s]["nFilms"]
    seasonStats[s]['rt'] = seasonStats[s]['rt'] / seasonStats[s]["nFilms"]
    seasonStats[s]['year'] = seasonStats[s]['year'] / seasonStats[s]["nFilms"]

    // const totalCount = Object.values(seasonCounts).reduce((sum, count) => sum + count, 0);
    // const totalWatchedCount = Object.values(seasonWatchedCounts).reduce((sum, count) => sum + count, 0);
    displayStats(seasonStats);

    let totalWatchedMins = 0
    data.forEach(row => {
        if (row['Watched'] === "True")
            totalWatchedMins = totalWatchedMins + row["Runtime"];
    })
    displayFooterStats(totalWatchedMins)
}
function displayFooterStats(tot) {
    const foot = document.querySelector("#footer");
    foot.innerHTML = `Total minutes watched: ${tot}`;
}

function displayStats(seasonStats) {
    const tbody = document.querySelector("#statsTable tbody");
    tbody.innerHTML = "";
    // log(counts)
    // Add total row at the top
    // tbody.innerHTML += `<tr><td><strong>Total</strong></td><td><strong>${totalCount}</strong></td></tr>`;

    // let season="total"
    // let data=seasonStats[season]
    //     const row = `
    //     <tr>
    //         <td>Total</td>
    //         <td>${data.nFilms}</td>
    //         <td>${data.complete.toFixed(0)}</td>
    //         <td>${data.runtime.toFixed(0)}</td>
    //          <td>${data.imdb.toFixed(1)}</td>
    //           <td>${data.rt.toFixed(0)}</td>
    //            <td>${data.year.toFixed(0)}</td>
    //     </tr>
    //     `;
    //     tbody.innerHTML += row;

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

