import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "ruca-black": "#1A1A1A",
        "ruca-yellow": "#D4B000",
        "ruca-yellow-light": "#F0D000",
        "ruca-gray": "#2A2A2A",
        "ruca-gray-light": "#3A3A3A",
      },
    },
  },
  plugins: [],
};
export default config;
