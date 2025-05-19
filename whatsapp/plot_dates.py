#%%
import pandas as pd
import matplotlib.pyplot as plt

# 1) Load CSV, skip comment lines (those starting with “//”)
df = pd.read_csv(
    '/home/suprdory/projectshdd/scifinight/watched_films.csv',
    comment='/',
    dtype=str
)

# 2) Normalize empty strings to NA and remember which rows originally had a Date
df = df.replace({'': pd.NA})
orig_mask = df['Date'].notna()

# 3) Fill missing Date from Date1, then parse
df['Date'] = df['Date'].fillna(df.get('Date1'))
df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')

# 4) Assign row numbers
df['RowNum'] = df.index + 1

# 5) Convert dates to numeric (ns since epoch), interpolate, and back to datetime
df['DateNum'] = df['Date'].view('int64')
df['DateNumInterp'] = df['DateNum'].interpolate()
df['DateInterp'] = pd.to_datetime(df['DateNumInterp'])

# 6) Plot: dates on x-axis, row number on y-axis
plt.figure(figsize=(12, 6))
# filled markers for actual dates
plt.scatter(df.loc[orig_mask, 'DateInterp'],
            df.loc[orig_mask, 'RowNum'],
            label='Original Date',
            color='blue',
            marker='o')
# unfilled markers for interpolated
plt.scatter(df.loc[~orig_mask, 'DateInterp'],
            df.loc[~orig_mask, 'RowNum'],
            label='Interpolated Date',
            facecolors='none',
            edgecolors='red',
            marker='o')

plt.xlabel('Date')
plt.ylabel('Row Number')
plt.title('Watch Dates vs. Row Number')
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
