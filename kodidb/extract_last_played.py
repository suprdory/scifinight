#!/usr/bin/env python3
import csv
import sqlite3
import os
from datetime import datetime

# Connect to database
conn = sqlite3.connect("MyVideos131.db")
cursor = conn.cursor()

# Run query to get films and last played dates
cursor.execute("""
SELECT c00 as title, lastPlayed 
FROM movie_view
WHERE lastPlayed IS NOT NULL 
ORDER BY lastPlayed DESC
""")

# Format and output the results
films = []
for row in cursor.fetchall():
    title, last_played = row

    # Format date if possible
    formatted_date = last_played
    if last_played:
        try:
            if isinstance(last_played, str):
                if last_played.isdigit():
                    dt = datetime.fromtimestamp(float(last_played))
                else:
                    dt = datetime.fromisoformat(
                        last_played.replace('Z', '+00:00'))
                formatted_date = dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass

    films.append((title, formatted_date))

# Print results and save to CSV
print(f"Found {len(films)} films with last played dates")
print("\n{:<50} {:<25}".format("Film Title", "Last Played"))
print("-" * 75)

for title, date in films:
    print("{:<50} {:<25}".format(
        (title[:47] + '...') if len(title) > 50 else title,
        date or "Unknown"
    ))

# Save to CSV
with open('last_played_films.csv', 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Title', 'Last Played'])
    writer.writerows(films)

conn.close()
