#!/usr/bin/env python3
import json
import csv

def create_watched_films_csv():
    """
    Reads films.json, filters for watched films, sorts by season, and 
    writes to watched_films.csv with only Title and imdbID.
    """
    # 1. Read the films.json file
    with open('films.json', 'r') as f:
        films = json.load(f)
    
    # 2. Filter to include only watched films
    watched_films = [film for film in films if film.get('Watched') == True]
    
    # 3. Sort by season (ascending)
    # Handle None/null values by placing them at the end
    watched_films.sort(key=lambda x: x.get('Season', float('inf')) if x.get('Season') is not None else float('inf'))
    
    # 4. Write to CSV with just Title and imdbID
    with open('watched_films.csv', 'w', newline='') as csvfile:
        # Create CSV writer and write header
        csv_writer = csv.writer(csvfile)
        csv_writer.writerow(['Title', 'imdbID'])
        
        # Write each watched film
        for film in watched_films:
            csv_writer.writerow([film['Title'], film['imdbID']])
    
    print(f"Successfully created watched_films.csv with {len(watched_films)} watched films, sorted by season.")

if __name__ == '__main__':
    create_watched_films_csv()
