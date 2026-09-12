import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#101A16",
          soft: "#182620",
          border: "#233229",
        },
        paper: {
          DEFAULT: "#F5F1E6",
          dim: "#EAE4D3",
        },
        brass: {
          DEFAULT: "#C9A227",
          dim: "#8A6F1D",
        },
        signal: {
          positive: "#4C9A6A",
          negative: "#C1493B",
        },
      },
      fontFamily: {
        serif: ["Iowan Old Style", "Georgia", "ui-serif", "serif"],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
