#%%
import matplotlib.dates as mdates
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

df = pd.read_csv(
    'watched_films.csv',
    comment='/',
    dtype=str
)

# df=df[df['Title']=='']

# 2) Normalize empty strings to NA and remember which rows originally had a Date
df = df.replace({'': pd.NA})
orig_mask = df['Date'].notna()

# 3) Fill missing Date from Date1, then parse
# df['Date'] = df['Date'].fillna(df.get('Date1'))
# df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')

# 4) Assign row numbers
df['RowNum'] = df.index + 1
# 5) Convert dates to datetime, interpolate
df['Date_dt']=pd.to_datetime(df['Date'],format="%d-%m-%y")
df['estDate_dt'] = df['Date_dt'].interpolate()

# 6) Plot: dates on x-axis, row number on y-axis
fig,ax=plt.subplots(figsize=(12, 6))

# unfilled markers for interpolated
ax.scatter(df.loc[~orig_mask, 'estDate_dt'],
           df.loc[~orig_mask, 'RowNum'],
           label='Interpolated Date',
           facecolors='none',
           edgecolors='red',
           marker='o')
# filled markers for actual dates
ax.scatter(df.loc[orig_mask, 'Date_dt'],
            df.loc[orig_mask, 'RowNum'],
            label='Original Date',
            color='blue',
            marker='o')


plt.xlabel('Date')
plt.ylabel('Film Number')
# plt.title('Watch Dates vs. Row Number')
plt.legend()
plt.grid(True)
plt.tight_layout()
# plt.show()
ax.axvline(pd.to_datetime('2018-10-03'), color='grey', linestyle='--')
ax.axvline(pd.to_datetime('2020-07-28'), color='grey', linestyle='--')
ax.set_xticks(pd.date_range(start='2014-01-01', end='2025-01-01', freq='YS'))
ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y'))
ax.set_xlim(pd.to_datetime('2014-01-01'), pd.to_datetime('2025-07-01'))
# ax.set_ylim(75, 150)
