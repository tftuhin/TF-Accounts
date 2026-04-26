import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#0F766E",
          600: "#0D6660",
          700: "#0A4F4A",
          800: "#073B37",
          900: "#042926",
        },
        surface: {
          0: "#0A0E14",
          1: "#0D1117",
          2: "#131920",
          3: "#1A2029",
          4: "#212832",
          border: "#2A3140",
          "border-light": "#3A4555",
        },
        ink: {
          faint: "#4A5567",
          muted: "#7D8A9B",
          secondary: "#A0ADBF",
          primary: "#CBD5E1",
          strong: "#E8ECF1",
          white: "#F1F5F9",
        },
        pf: {
          income: "#10B981",
          profit: "#8B5CF6",
          comp: "#3B82F6",
          tax: "#F59E0B",
          opex: "#EF4444",
        },
        accent: {
          blue: "#3B82F6",
          green: "#10B981",
          red: "#EF4444",
          amber: "#F59E0B",
          purple: "#8B5CF6",
        },
      },
      fontFamily: {
        display: ['"Instrument Serif"', "Georgia", "serif"],
        body: ['"Geist"', '"Segoe UI"', "system-ui", "sans-serif"],
        mono: ['"Geist Mono"', '"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1rem",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
