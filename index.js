const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const manifest = {
  id: 'community.vidlink.stremio',
  version: '1.0.0',
  name: 'VidLink',
  description: 'Stream movies & TV shows via VidLink.',
  logo: 'https://vidlink.pro/favicon.ico',
  resources: ['stream'],
  types: ['movie', 'series'],
  idPrefixes: ['tt'],
  catalogs: [],
  behaviorHints: { adult: false, p2p: false },
};

const builder = new addonBuilder(manifest);

async function imdbToTmdb(imdbId, type) {
  const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
  const apiKey = process.env.TMDB_API_KEY || '';
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`);
    const data = await res.json();
    if (type === 'movie' && data.movie_results?.length) return data.movie_results[0].id;
    if (type === 'series' && data.tv_results?.length) return data.tv_results[0].id;
  } catch (e) { console.error(e.message); }
  return null;
}

builder.defineStreamHandler(async ({ type, id }) => {
  let imdbId = id, season, episode;
  if (type === 'series') {
    const p = id.split(':');
    imdbId = p[0]; season = p[1]; episode = p[2];
  }
  const tmdbId = await imdbToTmdb(imdbId, type);
  if (!tmdbId) return { streams: [{ name: 'VidLink', title: '⚠️ Set TMDB_API_KEY on Render', url: 'data:,' }] };
  const base = 'https://vidlink.pro';
  const url = type === 'movie'
    ? `${base}/movie/${tmdbId}?autoplay=true`
    : `${base}/tv/${tmdbId}/${season}/${episode}?autoplay=true&nextbutton=true`;
  return {
    streams: [{
      name: 'VidLink',
      title: type === 'movie' ? '🎬 VidLink · Multi-source' : `📺 VidLink · S${season}E${episode}`,
      externalUrl: url
    }]
  };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
console.log('VidLink addon running on port', process.env.PORT || 7000);
