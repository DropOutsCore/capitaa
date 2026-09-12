/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Near-black base, layered so panels can sit on subtly different
        // surfaces without harsh borders.
        ink: {
          950: '#07070b',
          900: '#0a0a0f',
          850: '#0e0e15',
          800: '#12121b',
          700: '#181824',
        },
        // One accent, used deliberately. A cool electric cyan-violet.
        accent: {
          DEFAULT: '#6ea8ff',
          soft: '#8fbaff',
          deep: '#3f6fe0',
          glow: 'rgba(110,168,255,0.35)',
        },
        signal: {
          execute: '#4ade80',
          refuse: '#ff5c7c',
          escalate: '#ffb454',
        },
      },
      fontFamily: {
        display: ['"Sora"', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        // Elevation, not harsh box-shadow.
        glass: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
        'glass-lg': '0 24px 64px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10)',
        glow: '0 0 0 1px rgba(110,168,255,0.35), 0 8px 40px rgba(110,168,255,0.35)',
      },
      transitionTimingFunction: {
        // Custom physics -nothing linear or default ease.
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'in-out-soft': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseglow: {
          '0%,100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        float: 'float 6s cubic-bezier(0.45,0,0.55,1) infinite',
        shimmer: 'shimmer 8s linear infinite',
        pulseglow: 'pulseglow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
