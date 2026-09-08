<div align="center">
  <img src="muffinlogo_clean.png" alt="Muffin TV Logo" width="200"/>
  <h1>Muffin TV</h1>
  <p><strong>A Standalone Local Media Metadata & Stream Aggregator</strong></p>
</div>

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/info.svg" width="24" height="24" /> Overview

**Muffin TV** (formerly streambert-backend) is a standalone REST API and Electron-based desktop application designed for aggregating media metadata and streams locally. It provides a robust backend to manage TMDB data, subtitles, downloads, anime resolving, watch parties, and more. 

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/sparkles.svg" width="24" height="24" /> Features

- **<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/film.svg" width="18" height="18" /> Media Aggregation:** Fetch and organize movies and TV shows using the TMDB API.
- **<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/tv.svg" width="18" height="18" /> Stream Sources:** Aggregate and manage streaming sources seamlessly.
- **<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/play-circle.svg" width="18" height="18" /> Anime Support:** Built-in resolver and dedicated API for Anime content.
- **<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/subtitles.svg" width="18" height="18" /> Subtitles:** Automatic fetching and integration with SUBDL and WYZIE.
- **<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/download.svg" width="18" height="18" /> Downloads Manager:** Native integration with `N_m3u8DL-RE` for robust media downloading.
- **<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/users.svg" width="18" height="18" /> Watch Party:** Real-time synchronization via Socket.IO for watching with friends.
- **<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/library.svg" width="18" height="18" /> Library & History:** Keep track of your watch history, user profiles, and personal library.
- **<img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/box.svg" width="18" height="18" /> Standalone & Portable:** Runs entirely locally via `127.0.0.1` and can be packaged as a portable executable.

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/rocket.svg" width="24" height="24" /> Getting Started

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

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/layers.svg" width="24" height="24" /> Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Database:** SQLite
- **Desktop Environment:** Electron, Puppeteer (optional)
- **Utilities:** dotenv, jimp

## <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/file-text.svg" width="24" height="24" /> License

This project is intended for personal and local use.
