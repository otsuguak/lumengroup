/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lumenPrimary: '#0056b3', // Tu azul principal 
        lumenDark: '#1a1a1a',    // Para textos y headers 
        lumenGray: '#f4f4f4',    // Para fondos desacoplados 
        lumenAccent: '#fbbf24',  // El color de las estrellas/ratings
      },
      backgroundImage: {
        'lumen-gradient': 'linear-gradient(135deg, #003366, #0056b3)',
      }
    },
  },
  plugins: [],
}