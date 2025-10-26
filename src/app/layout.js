export const metadata = {
  title: "Anime Video Generator",
  description: "Generate anime-style videos in your browser and export WebM.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0d16", color: "#e7e9ff", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, Apple Color Emoji, Segoe UI Emoji" }}>
        {children}
      </body>
    </html>
  );
}
