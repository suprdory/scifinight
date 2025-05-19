import sqlite3
import os

# Print current working directory and check if file exists
print(f"Current directory: {os.getcwd()}")
db_path = "MyVideos131.db"
print(f"Database file exists: {os.path.exists(db_path)}")

# Try to connect to the database
try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables in database:")
    for table in tables:
        print(f"- {table[0]}")
        
    # If 'movie' table exists, check some of its column names
    if any(table[0].lower() == 'movie' for table in tables):
        cursor.execute("PRAGMA table_info(movie)")
        columns = cursor.fetchall()
        print("\nColumns in 'movie' table:")
        for col in columns:
            print(f"- {col[1]} ({col[2]})")
    
    conn.close()
    
except sqlite3.Error as e:
    print(f"SQLite error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
