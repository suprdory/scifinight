#!/usr/bin/env python3
"""
This script extracts film titles and last played dates from a Kodi SQLite database,
then outputs them sorted by last played date (newest first).

Usage:
1. Make sure the MyVideos131.db file is in the same directory
2. Run: python3 last_played_simple.py

Output:
- Prints a list of films with their last played dates to the console
- Creates a CSV file with the same information
"""

import sqlite3
import os
from datetime import datetime
import csv

# Database path
DB_PATH = "MyVideos131.db"

# Check if database exists
if not os.path.exists(DB_PATH):
    print(f"Error: Database file not found at {DB_PATH}")
    exit(1)

try:
    # Connect to the database
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Execute query
    c.execute("""
    SELECT c00, lastPlayed 
    FROM movie 
    WHERE lastPlayed IS NOT NULL 
    ORDER BY lastPlayed DESC
    """)
    
    # Fetch results
    films = []
    for row in c.fetchall():
        title = row[0]
        last_played = row[1]
        
        # Try to format the date if it exists
        if last_played:
            try:
                # Date format depends on Kodi version
                if isinstance(last_played, str):
                    if last_played.isdigit():
                        # Try as timestamp
                        dt = datetime.fromtimestamp(float(last_played))
                    else:
                        # Try as ISO format
                        dt = datetime.fromisoformat(last_played.replace('Z', '+00:00'))
                    last_played = dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                # If parsing fails, keep as is
                pass
        
        films.append((title, last_played))
    
    # Close connection
    conn.close()
    
    # Print results
    print(f"\nFound {len(films)} films with last played information:")
    print("\n{:<50} {:<25}".format("Film Title", "Last Played"))
    print("-" * 75)
    
    for title, date in films:
        print("{:<50} {:<25}".format(
            (title[:47] + '...') if len(title) > 50 else title,
            date or "Unknown"
        ))
    
    # Write to CSV
    with open('last_played_films.csv', 'w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Title', 'Last Played'])
        writer.writerows(films)
    
    print(f"\nData saved to last_played_films.csv")

except sqlite3.Error as e:
    print(f"SQLite error: {e}")
except Exception as e:
    print(f"Error: {e}")
