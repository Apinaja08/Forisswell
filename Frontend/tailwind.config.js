/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        body: ["Manrope", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Manrope", "system-ui", "sans-serif"],
      },
      colors: {
        leaf: {
          50: "#effdf3",
          100: "#d8f8e3",
          200: "#b4efca",
          300: "#82dfab",
          400: "#4fc386",
          500: "#2f9f69",
          600: "#237f54",
          700: "#1f6545",
          800: "#1d5039",
          900: "#1a4331",
        },
        earth: {
          50: "#f9f6f1",
          100: "#efe7d7",
          200: "#e0d0b4",
          300: "#ceb287",
          400: "#bb935f",
          500: "#a97c45",
          600: "#8b6438",
          700: "#6f4f30",
          800: "#5a412b",
          900: "#4c3727",
        },
        status: {
          critical: "#b91c1c",
          danger: "#dc2626",
          warning: "#d97706",
          info: "#2563eb",
          success: "#15803d",
          neutral: "#475569",
        },
      },
      boxShadow: {
        soft: "0 16px 38px -22px rgba(15, 23, 42, 0.2)",
        card: "0 20px 45px -30px rgba(2, 6, 23, 0.35)",
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(circle at 20% 20%, rgba(79, 195, 134, 0.25), transparent 36%), radial-gradient(circle at 80% 0%, rgba(37, 99, 235, 0.14), transparent 32%), linear-gradient(135deg, rgba(239, 253, 243, 0.9), rgba(255, 255, 255, 0.95))",
      },
    },
  },
  plugins: [],
};
