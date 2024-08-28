/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "JetBrainsMono",
          ...defaultTheme.fontFamily.mono,
          ...defaultTheme.fontFamily.sans,
        ],
      },
      colors: {
        "ornithe-bg": "var(--bg-ornithe)",
        "ornithe-input-bg": "var(--bg-input)",
        "ornithe-button-bg": "var(--bg-button)",
        "ornithe-text": "var(--text-ornithe)",
      },
    },
  },
  plugins: ["prettier-plugin-tailwindcss"],
};
