/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      colors: {
        obsidian: {
          950: '#04040a',
          900: '#080810',
          850: '#0c0c16',
          800: '#10101c',
          750: '#161622',
          700: '#1c1c28',
          600: '#28283a',
        },
        brass: {
          DEFAULT: '#c8a55a',
          light: '#dfc07a',
          dim: '#8a7340',
          faint: 'rgba(200, 165, 90, 0.08)',
          glow: 'rgba(200, 165, 90, 0.15)',
        },
        warm: {
          white: '#ece8e0',
          100: '#d4d0c8',
          200: '#a8a498',
          300: '#7c7870',
          400: '#5c5850',
          500: '#3c3838',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'slide-in': 'slideIn 0.4s ease-out both',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
  plugins: [],
}
