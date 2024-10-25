# %%
import pandas as pd
import json
import requests
import numpy as np
from dotenv import dotenv_values

config = dotenv_values(".env")
omdb_api_key = config['omdb_api_key']
# %%

# df_old=pd.read_pickle('df_scfi_db_181024_posters.pkl')
df_old = pd.read_csv('scifi_data_281024.csv').iloc[:, 1:]
# %%
newData = pd.read_csv('to_add.csv')

# %%


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
    urlbase = f'http://www.omdbapi.com/?apikey={omdb_api_key}='
    url = urlbase+imdb_id
    response = requests.get(url)
    dict = json.loads(response.text)
    return dict


def get_tmdb_imdb(imdb_id):
    url = f"https://api.themoviedb.org/3/find/{imdb_id}?external_source=imdb_id"

    headers = {
        "accept": "application/json",
        "Authorization": config['tmdb_auth']
    }
    response = requests.get(url, headers=headers)
    out = json.loads(response.text)['movie_results']
    if len(out) > 0:
        return out[0]
    else:
        return None
# %%


def buildFilmDat(imdbID, season):
    omdbDat = get_omdb_imdb(imdbID)
    tmdbDat = get_tmdb_imdb(imdbID)

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

# imdbID = newData.loc[1, 'imdbID']


filmDats = []
for i, film in newData.iterrows():
    filmDat, omdbDat, tmdbDat = buildFilmDat(film['imdbID'], film['Season'])
    filmDats.append(filmDat)
    print(film['Title'], omdbDat['Title'])

df_new = pd.DataFrame(filmDats)

# %%
# get_tmdb_imdb("tt0142001")
# film = {
#     'Title': "The Year of the Sex Olympics",
#     'Year': 1968,
#     'imdbID': "tt0142001",
#     'Rated': "15",
#     'Director': "Michael Elliott",
#     'Actors': "Leonard Rossiter, Suzanne Neve, Tony Vogel, Brian Cox",
#     'Language': "English",
#     'Plot': 'Influenced by concerns about overpopulation, the counterculture of the 1960s and the societal effects of television, the play depicts a world of the future where a small elite control the media, keeping the lower classes docile by serving them an endless diet of lowest common denominator programmes and pornography. The play concentrates on an idea the programme controllers have for a new programme which will follow the trials and tribulations of a group of people left to fend for themselves on a remote island. In this respect, the play is often cited as having anticipated the craze for reality television.',
#     'IMDb_link': "https://www.imdb.com/title/tt0142001",
#     'Runtime':105,
#     'BoxOffice':None,
#     'IMDb':7.0,
#     'RT':None,
#     'Meta':None,
#     'poster_path': '/ztJENDWvfNA7jQiuVTqBm5CLyZk.jpg',
#     'backdrop_path': '/x776jj9rOKIFCNAIATagE992BbT.jpg',
#     'Watched':True,
#     'Season': 1,
# }
# df_new=pd.DataFrame([film])
# %%
df = pd.concat((df_new, df_old))
df = df.reset_index(drop=True)
# df=df.iloc[:,:-2]
df = df.sort_values("Title")
df.Watched = df.Watched == 1
# %%
# df=df_old.sort_values('Title')
# df.loc[df.Title=="Innerspace","Season"]=10
# %%

df.to_csv('scifi_data_281024.csv')
# df.to_json('films.json', orient='records', indent=4)
df.to_json('../films.json', orient='records', indent=4)

# %%
