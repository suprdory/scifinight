# %%
import pandas as pd
df = pd.read_csv('scifi_data_180125.csv').iloc[:, 1:]
df.to_json('../films.json', orient='records', indent=4)
