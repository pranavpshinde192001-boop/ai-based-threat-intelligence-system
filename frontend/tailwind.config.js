/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0B1020",
          card: "#121A2E",
          primary: "#00E5FF",
          secondary: "#00FF88",
          accent: "#7B61FF",
          danger: "#FF4D6D",
          text: "#E2E8F0",
          muted: "#94A3B8"
        }
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(0, 229, 255, 0.25)',
        'green-glow': '0 0 15px rgba(0, 255, 136, 0.25)',
        'purple-glow': '0 0 15px rgba(123, 97, 255, 0.25)',
        'red-glow': '0 0 15px rgba(255, 77, 109, 0.25)',
      }
    },
  },
  plugins: [],
}
