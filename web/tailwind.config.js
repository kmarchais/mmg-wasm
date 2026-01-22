/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mesh: {
          edge: "#0066cc",
          vertex: "#dc3545",
          face: "#e8f4fd",
        },
      },
    },
  },
  plugins: [],
};
