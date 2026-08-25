/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        dark: "#1B1E23",
        gold: "#C9A227",
        goldSoft: "#E4CE7A",
        steel: "#6B7280",
        bgSoft: "#F6F6F5",
      },
    },
  },
  plugins: [],
};
