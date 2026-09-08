

async function testCache() {
  console.log('--- Testing API Cache ---');
  
  // 1st request (Cold Cache)
  const start1 = Date.now();
  await Promise.all([
    fetch('http://127.0.0.1:3939/api/tmdb/trending/movie'),
    fetch('http://127.0.0.1:3939/api/tmdb/trending/tv'),
    fetch('http://127.0.0.1:3939/api/anime/anilist/trending'),
    fetch('http://127.0.0.1:3939/api/tmdb/popular/movie')
  ]);
  console.log(`Cold Cache (Before): ${Date.now() - start1}ms`);

  // 2nd request (Warm Cache)
  const start2 = Date.now();
  await Promise.all([
    fetch('http://127.0.0.1:3939/api/tmdb/trending/movie'),
    fetch('http://127.0.0.1:3939/api/tmdb/trending/tv'),
    fetch('http://127.0.0.1:3939/api/anime/anilist/trending'),
    fetch('http://127.0.0.1:3939/api/tmdb/popular/movie')
  ]);
  console.log(`Warm Cache (After): ${Date.now() - start2}ms`);
}

testCache();
