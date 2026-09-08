<div align="center">
  <img src="muffinlogo_clean.png" alt="Muffin TV Logo" width="200"/>
  <h1>Muffin TV</h1>
  <p><strong>A Standalone Local Media Metadata & Stream Aggregator</strong></p>
</div>

## 📌 Overview

**Muffin TV** (formerly streambert-backend) is a standalone REST API and Electron-based desktop application designed for aggregating media metadata and streams locally. It provides a robust backend to manage TMDB data, subtitles, downloads, anime resolving, watch parties, and more. 

## ✨ Features

- **🎬 Media Aggregation:** Fetch and organize movies and TV shows using the TMDB API.
- **📺 Stream Sources:** Aggregate and manage streaming sources seamlessly.
- **🎌 Anime Support:** Built-in resolver and dedicated API for Anime content.
- **📝 Subtitles:** Automatic fetching and integration with SUBDL and WYZIE.
- **📥 Downloads Manager:** Native integration with `N_m3u8DL-RE` for robust media downloading.
- **🍿 Watch Party:** Real-time synchronization via Socket.IO for watching with friends.
- **🗃️ Library & History:** Keep track of your watch history, user profiles, and personal library.
- **🌐 Standalone & Portable:** Runs entirely locally via `127.0.0.1` and can be packaged as a portable executable.

## 🚀 Getting Started

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

## 🛠️ Tech Stack

- **Backend:** Node.js, Express, Socket.IO
- **Database:** SQLite
- **Desktop Environment:** Electron, Puppeteer (optional)
- **Utilities:** dotenv, jimp

## 📝 License

This project is intended for personal and local use.
