-- SQLite commands to extract film titles and last played dates
-- Save this as extract_last_played.sql

-- Output to CSV format
.mode csv
.headers on
.output last_played_films.csv

-- Run the query
SELECT 
  c00 AS "Film Title", 
  lastPlayed AS "Last Played Date"
FROM movie
WHERE lastPlayed IS NOT NULL
ORDER BY lastPlayed DESC;

-- Reset output and show results in console
.output stdout
.mode column
.headers on

-- Show the same results in console
SELECT 
  c00 AS "Film Title", 
  lastPlayed AS "Last Played Date"
FROM movie
WHERE lastPlayed IS NOT NULL
ORDER BY lastPlayed DESC;
