/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14213D",
        "ink-60": "#5B6478",
        paper: "#FBF7EF",
        "paper-dim": "#F1EADA",
        amber: "#E3963E",
        "amber-dark": "#C97527",
        teal: "#2F6F62",
        coral: "#C4483A"
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"]
      }
    }
  },
  plugins: []
};
