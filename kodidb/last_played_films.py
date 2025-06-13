#!/usr/bin/env python3
import sqlite3
import os
import sys
from datetime import datetime

def get_last_played_films(db_path):
    """
    Extract film titles and their last played dates from Kodi's SQLite database.
    Returns the data sorted by last played date (newest first).
    """
    try:
        # Verify file exists
        if not os.path.isfile(db_path):
            print(f"Error: Database file not found at {db_path}")
            return []
            
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Query to get film titles (c00) and last played dates
        query = """
        SELECT c00 as title, lastPlayed 
        FROM movie 
        WHERE lastPlayed IS NOT NULL 
        ORDER BY lastPlayed DESC
        """
        
        try:
            cursor.execute(query)
            results = cursor.fetchall()
            
            # Process results
            films = []
            for row in results:
                title = row[0]
                last_played = row[1]
                
                # Format date if it exists
                formatted_date = "Never played"
                if last_played:
                    try:
                        # Try to parse the date - format might vary depending on Kodi version
                        # Common formats: ISO string or timestamp
                        if isinstance(last_played, str):
                            if last_played.isdigit():
                                dt = datetime.fromtimestamp(float(last_played))
                            else:
                                dt = datetime.fromisoformat(last_played.replace('Z', '+00:00'))
                            formatted_date = dt.strftime("%Y-%m-%d %H:%M:%S")
                        else:
                            formatted_date = str(last_played)
                    except Exception as e:
                        formatted_date = f"Unparseable: {last_played}"
                
                films.append({
                    'title': title,
                    'last_played': last_played,
                    'formatted_date': formatted_date
                })
                
            return films
            
        except sqlite3.Error as e:
            print(f"SQLite query error: {e}")
            
            # Fallback - try to get table information
            print("\nAttempting to get database schema information...")
            try:
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = cursor.fetchall()
                print("Tables found in database:")
                for table in tables:
                    print(f"- {table[0]}")
                
                # Look for movie or similar tables
                movie_tables = [t[0] for t in tables if 'movie' in t[0].lower()]
                if movie_tables:
                    print(f"\nFound potential movie tables: {movie_tables}")
                    for table in movie_tables:
                        print(f"\nColumns in '{table}':")
                        cursor.execute(f"PRAGMA table_info({table})")
                        columns = cursor.fetchall()
                        for col in columns:
                            print(f"- {col[1]} ({col[2]})")
            except sqlite3.Error as inner_e:
                print(f"Error retrieving schema: {inner_e}")
                
            return []
            
    except Exception as e:
        print(f"Unexpected error: {e}")
        return []
        
    finally:
        if 'conn' in locals():
            conn.close()


def main():
    """Main function to run the script."""
    # Get path to the database file
    db_path = os.path.join(os.getcwd(), "MyVideos131.db")
    print(f"Looking for database at: {db_path}")
    
    # Get the films sorted by last played date
    films = get_last_played_films(db_path)
    
    if not films:
        print("No films with last played dates found or there was an error.")
        return
        
    # Print the results
    print(f"\nFound {len(films)} films with last played information:")
    print("\n{:<50} {:<25}".format("Film Title", "Last Played"))
    print("-" * 75)
    
    for film in films:
        print("{:<50} {:<25}".format(
            film['title'][:48] + '..' if len(film['title']) > 50 else film['title'],
            film['formatted_date']
        ))
    
    # Save to CSV
    try:
        import csv
        csv_file = "last_played_films.csv"
        with open(csv_file, 'w', newline='', encoding='utf-8') as file:
            writer = csv.writer(file)
            writer.writerow(['Title', 'Last Played'])
            for film in films:
                writer.writerow([film['title'], film['formatted_date']])
        print(f"\nData saved to {csv_file}")
    except Exception as e:
        print(f"Error saving CSV: {e}")


if __name__ == "__main__":
    main()
