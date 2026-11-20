import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2B2FE0",
          blue: "#2438E8",
          violet: "#6D28D9",
        },
        accent: {
          lavender: {
            from: "#8FA2FF",
            to: "#B7A6FF",
          },
          gold: "#FFC83D",
        },
        text: {
          dark: "#111936",
          muted: "#5B6485",
        },
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      },
      borderRadius: {
        card: "32px",
        control: "16px",
      },
      boxShadow: {
        "blue-soft": "0 20px 60px rgba(36, 56, 232, 0.25)",
        glass: "0 25px 60px -15px rgba(10, 20, 60, 0.2)",
        "glass-dark": "0 25px 60px -15px rgba(0, 0, 0, 0.6)",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        caveat: ["'Caveat'", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
