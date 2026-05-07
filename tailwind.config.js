/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Syne", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#FAEEDA",
          100: "#FAC775",
          200: "#EF9F27",
          400: "#BA7517",
          600: "#854F0B",
          800: "#633806",
          900: "#412402",
        },
        teal: {
          50: "#E1F5EE",
          100: "#9FE1CB",
          400: "#1D9E75",
          600: "#0F6E56",
          800: "#085041",
        },
      },
    },
  },
  plugins: [],
};
