# %%
import pandas as pd
df = pd.read_csv('scifi_data.csv').iloc[:, 1:]
df.to_json('films.json', orient='records')

# %%
