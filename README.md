<div align="center">
  <img src="muffinlogo_clean.png" alt="Muffin TV Logo" width="200"/>
  <h1>Muffin TV</h1>
  <p><strong>A Standalone Local Media Metadata & Stream Aggregator</strong></p>
</div>

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:info.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:info.svg?color=%23000000"><img src="https://api.iconify.design/lucide:info.svg" width="24" height="24" /></picture> Overview

**Muffin TV** is a standalone REST API and Electron-based desktop application designed for aggregating media metadata and streams locally. It provides a robust backend to manage TMDB data, subtitles, downloads, anime resolving, watch parties, and more. 

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:sparkles.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:sparkles.svg?color=%23000000"><img src="https://api.iconify.design/lucide:sparkles.svg" width="24" height="24" /></picture> Features

- **<picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:film.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:film.svg?color=%23000000"><img src="https://api.iconify.design/lucide:film.svg" width="18" height="18" /></picture> Media Aggregation:** Fetch and organize movies and TV shows using the TMDB API.
- **<picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:tv.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:tv.svg?color=%23000000"><img src="https://api.iconify.design/lucide:tv.svg" width="18" height="18" /></picture> Stream Sources:** Aggregate and manage streaming sources seamlessly.
- **<picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:play-circle.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:play-circle.svg?color=%23000000"><img src="https://api.iconify.design/lucide:play-circle.svg" width="18" height="18" /></picture> Anime Support:** Built-in resolver and dedicated API for Anime content.
- **<picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:subtitles.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:subtitles.svg?color=%23000000"><img src="https://api.iconify.design/lucide:subtitles.svg" width="18" height="18" /></picture> Subtitles:** Automatic fetching and integration with SUBDL and WYZIE.
- **<picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:download.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:download.svg?color=%23000000"><img src="https://api.iconify.design/lucide:download.svg" width="18" height="18" /></picture> Downloads Manager:** Native integration with `N_m3u8DL-RE` for robust media downloading.
- **<picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:users.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:users.svg?color=%23000000"><img src="https://api.iconify.design/lucide:users.svg" width="18" height="18" /></picture> Watch Party:** Real-time synchronization via Socket.IO for watching with friends.
- **<picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:library.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:library.svg?color=%23000000"><img src="https://api.iconify.design/lucide:library.svg" width="18" height="18" /></picture> Library & History:** Keep track of your watch history, user profiles, and personal library.
- **<picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:box.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:box.svg?color=%23000000"><img src="https://api.iconify.design/lucide:box.svg" width="18" height="18" /></picture> Standalone & Portable:** Runs entirely locally via `127.0.0.1` and can be packaged as a portable executable.

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:rocket.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:rocket.svg?color=%23000000"><img src="https://api.iconify.design/lucide:rocket.svg" width="24" height="24" /></picture> Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v22.0.0 or higher)
- NPM

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/muffin.git
   cd muffin
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configuration:
   Create a `.env` file in the root directory (you can use `.env.example` as a template) and add your API keys:
   ```env
   TMDB_API_KEY=your_tmdb_api_key
   SUBDL_API_KEY=your_subdl_api_key
   WYZIE_API_KEY=your_wyzie_api_key
   ```

### Running the App

- **Start backend server only:**
  ```bash
  npm start
  ```

- **Run in Development Mode (Nodemon):**
  ```bash
  npm run dev
  ```

- **Run Desktop App (Electron):**
  ```bash
  npm run dev:desktop
  ```

### Build

To create a portable executable for Windows:
```bash
npm run build:exe
```
The output will be available in the `dist-electron` folder.

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:layers.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:layers.svg?color=%23000000"><img src="https://api.iconify.design/lucide:layers.svg" width="24" height="24" /></picture> Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Database:** SQLite
- **Desktop Environment:** Electron, Puppeteer (optional)
- **Utilities:** dotenv, jimp

## <picture><source media="(prefers-color-scheme: dark)" srcset="https://api.iconify.design/lucide:file-text.svg?color=%23ffffff"><source media="(prefers-color-scheme: light)" srcset="https://api.iconify.design/lucide:file-text.svg?color=%23000000"><img src="https://api.iconify.design/lucide:file-text.svg" width="24" height="24" /></picture> License

This project is intended for personal and local use.
