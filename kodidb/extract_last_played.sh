#!/bin/bash

# This script extracts film titles and last played dates from MyVideos131.db
# and outputs them sorted by last played date

# Check if SQLite3 is available
if ! command -v sqlite3 &> /dev/null; then
    echo "Error: sqlite3 command not found. Please install SQLite."
    exit 1
fi

# Check if the database file exists
if [ ! -f "MyVideos131.db" ]; then
    echo "Error: MyVideos131.db not found in current directory."
    exit 1
fi

# Create a temporary file for output
TMP_FILE=$(mktemp)

echo "Extracting film data from database..."

# Run the SQLite query and save results
sqlite3 -header -csv MyVideos131.db << EOF > "$TMP_FILE"
SELECT c00 AS "Film Title", lastPlayed AS "Last Played Date"
FROM movie
WHERE lastPlayed IS NOT NULL
ORDER BY lastPlayed DESC;
EOF

# Check if the query succeeded
if [ $? -ne 0 ]; then
    echo "Error: Failed to query database."
    rm -f "$TMP_FILE"
    
    # Try to get table information for debugging
    echo "Attempting to retrieve database structure:"
    sqlite3 MyVideos131.db ".tables"
    echo "Looking for tables with 'movie' in the name:"
    sqlite3 MyVideos131.db ".tables %movie%"
    
    exit 1
fi

# Count number of lines (minus header)
COUNT=$(wc -l < "$TMP_FILE")
COUNT=$((COUNT - 1))

if [ $COUNT -le 0 ]; then
    echo "No film data found."
    rm -f "$TMP_FILE"
    exit 0
fi

# Copy to final CSV file
cp "$TMP_FILE" "last_played_films.csv"

# Display the results
echo "Found $COUNT films with last played information:"
echo "Results saved to last_played_films.csv"
echo ""
echo "First 10 entries:"
head -n 11 "$TMP_FILE" | column -t -s, 

# Clean up
rm -f "$TMP_FILE"

echo ""
echo "For full results, check last_played_films.csv"
