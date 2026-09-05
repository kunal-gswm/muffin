# 🧁 Muffin

A premium streaming app for Movies, TV Shows, and Anime.

## Architecture

- **`backend/`** — Node.js + Express REST API with Puppeteer stream extraction, TMDB integration, and download management
- **`frontend/`** — React + Vite SPA with HLS.js playback, glassmorphism UI, and real-time download progress

## Setup

### Backend
```bash
cd backend
cp .env.example .env    # Fill in your TMDB_API_KEY
npm install
node server.js
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Features
- 🎬 Browse trending movies & TV shows via TMDB
- 🎌 Anime browsing & streaming via AniList + AllAnime
- 🔍 Universal search across all content
- ▶️ Native stream extraction via Puppeteer
- ⬇️ Download manager with progress tracking
- 📚 Personal watchlist & library
- 🎯 Continue watching with playback resume
