# %%
import pandas as pd
import json
import requests
import numpy as np
from dotenv import dotenv_values

def get_scores(omdb_ratings):
    sources = ['Internet Movie Database', 'Rotten Tomatoes', 'Metacritic']

    def get_score(ratingslist, source):
        scores = {}
        for rating in ratingslist:
            scores[rating['Source']] = rating['Value']
        if source in scores.keys():
            score = scores[source]
            # print(score)
            if source == sources[0]:
                # print("IMDB")
                score = float(score[:-3])
            elif source == sources[1]:
                # print("RT",score)
                score = int(score[:-1])
            elif source == sources[2]:
                # print("Meta", score)
                score = int(score[:-4])
        else:
            score = np.nan
        # [ for rating in ratingslist]
        return score
    IMDb = get_score(omdb_ratings, 'Internet Movie Database')
    RT = get_score(omdb_ratings, 'Rotten Tomatoes')
    Metacritic = get_score(omdb_ratings, 'Metacritic')
    return (IMDb, RT, Metacritic)


def get_omdb_imdb(imdb_id):
    urlbase = f'http://www.omdbapi.com/?apikey={omdb_api_key}&i='
    url = urlbase+imdb_id
    response = requests.get(url)
    dict = json.loads(response.text)
    return dict


def get_tmdb_imdb(imdb_id):
    url = f"https://api.themoviedb.org/3/find/{imdb_id}?external_source=imdb_id"

    headers = {
    "accept": "application/json",
    "Authorization": "Bearer " + config['tmdb_auth'],
    }
    response = requests.get(url, headers=headers)
    out = json.loads(response.text)['movie_results']
    if len(out) > 0:
        return out[0]
    else:
        return None

def buildFilmDat(imdbID, season):
    omdbDat = get_omdb_imdb(imdbID)
    tmdbDat = get_tmdb_imdb(imdbID)
    print(omdbDat)
    # print(tmdbDat)
    imdb_link = 'https://www.imdb.com/title/' + omdbDat['imdbID']
    runtime = int(omdbDat['Runtime'][:-4])

    boStr = omdbDat['BoxOffice']
    if boStr == 'N/A':
        boxoffice = None
    else:
        boxoffice = omdbDat['BoxOffice'][1:].replace(',', '')

    IMDb, RT, Metacritic = get_scores(omdbDat['Ratings'])

    fields = ['Title', 'imdbID', 'Year', 'Rated', 'Director',
              'Actors', 'Language', 'Plot',]
    out = {}
    for field in fields:
        out[field] = omdbDat[field]

    out['IMDb_link'] = imdb_link
    out['Runtime'] = runtime
    out['BoxOffice'] = boxoffice
    out['IMDb'] = IMDb
    out['RT'] = RT
    out['Meta'] = Metacritic
    out['poster_path'] = tmdbDat['poster_path']
    out['backdrop_path'] = tmdbDat['backdrop_path']
    out['Watched'] = ''
    out['Season'] = season
    return out, omdbDat, tmdbDat
#%%
config = dotenv_values(".env")
omdb_api_key = config['omdb_api_key']
df_old = pd.read_csv('../scifi_data.csv').iloc[:, 1:]
newData = pd.read_csv('to_add.csv')

filmDats = []
for i, film in newData.iterrows():
    filmDat, omdbDat, tmdbDat = buildFilmDat(film['imdbID'], film['Season'])
    filmDats.append(filmDat)
    print(film['Title'], omdbDat['Title'])

df_new = pd.DataFrame(filmDats)
df_new


# %%
df = pd.concat((df_new, df_old))
df = df.reset_index(drop=True)
df = df.sort_values("Title")
df.Watched = df.Watched == 1
df
#%%
keys=['Title','Watched', 'Season', 'imdbID', 'Year', 'Rated', 'Director', 'Actors', 'Language',
       'Plot', 'IMDb_link', 'Runtime', 'BoxOffice', 'IMDb', 'RT', 'Meta',
       'poster_path', 'backdrop_path', ]

df=df[keys]
df
# %%
df.to_csv('../scifi_data.csv')

# %%
