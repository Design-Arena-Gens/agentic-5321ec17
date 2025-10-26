"use client";

import AnimeGenerator from "../components/AnimeGenerator.jsx";
import "./globals.css";

export default function Page() {
  return (
    <main className="container">
      <header className="header">
        <h1>Anime Video Generator</h1>
        <p>Create a short anime-style video and export to WebM.</p>
      </header>
      <AnimeGenerator />
      <footer className="footer">Built for Vercel • VP9/WebM export in-browser</footer>
    </main>
  );
}
