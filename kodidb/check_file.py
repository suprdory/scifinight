import os
import sys

# Print Python version and check if the file exists
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")

db_path = "MyVideos131.db"
full_path = os.path.abspath(db_path)
print(f"Full database path: {full_path}")
print(f"File exists: {os.path.exists(full_path)}")
print(f"File size: {os.path.getsize(full_path) if os.path.exists(full_path) else 'N/A'}")
