#%%
import pandas as pd
df = pd.read_csv('scifi_data_241024.csv')
df
df_clean=df.drop_duplicates(subset='imdbID').iloc[:,1:]
df_clean
df_clean.to_csv('scifi_data_241024.csv')
# %%
