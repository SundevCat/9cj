import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#0a0c10",
          panel: "#111318",
          raised: "#161a22",
        },
        line: "#1f242d",
        ink: {
          DEFAULT: "#e6e9ef",
          muted: "#8b93a3",
          dim: "#5a6273",
        },
        accent: {
          blue: "#63B3ED",
          green: "#68D391",
          amber: "#F6AD55",
          red: "#FC8181",
          purple: "#B794F4",
        },
      },
      fontFamily: {
        sans: ["var(--font-syne)", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-syne)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(99, 179, 237, 0.15), 0 8px 24px -8px rgba(99, 179, 237, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
