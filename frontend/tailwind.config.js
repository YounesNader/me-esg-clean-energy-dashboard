/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#0a0a0f',
          surface: '#111118',
          card:    '#16161f',
          raised:  '#1c1c28',
        },
        accent: {
          teal:    '#00d4aa',
          blue:    '#3b82f6',
          amber:   '#f59e0b',
          red:     '#ef4444',
          emerald: '#10b981',
        },
        ink: {
          primary:   '#f1f5f9',
          secondary: '#94a3b8',
          muted:     '#475569',
        },
      },
      fontFamily: {
        sans:    ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
        display: ['"Bebas Neue"', 'sans-serif'],
      },
      animation: {
        'fade-up':   'fadeUp 0.45s ease both',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        shimmer:     'shimmer 1.8s infinite',
        ticker:      'ticker 40s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.4', transform: 'scale(0.8)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
}
