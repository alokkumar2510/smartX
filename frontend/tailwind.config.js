/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        smartx: {
          base:    '#05050A',
          raised:  '#0a0a15',
          card:    '#111120',
          border:  'rgba(255,255,255,0.08)',
          hover:   'rgba(255,255,255,0.05)',
        },
        /* legacy compat — still used in some components */
        cyber: {
          bg:      '#05050A',
          surface: '#0a0a15',
          card:    '#111120',
          border:  '#1e1e3a',
          hover:   '#141428',
        },
        neon: {
          cyan:   '#93c5fd',
          purple: 'rgba(255,255,255,0.7)',
          pink:   '#f9a8d4',
          blue:   '#93c5fd',
          green:  '#34d399',
          orange: '#fbbf24',
          yellow: '#fcd34d',
        },
      },
      fontFamily: {
        sans:    ['General Sans', 'system-ui', '-apple-system', 'sans-serif'],
        orbitron: ['General Sans', 'sans-serif'],
        poppins:  ['General Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.3), 0 0 60px rgba(0, 240, 255, 0.1)',
        'neon-purple': '0 0 15px rgba(179, 71, 234, 0.3), 0 0 60px rgba(179, 71, 234, 0.1)',
        'neon-pink': '0 0 15px rgba(255, 45, 120, 0.3), 0 0 60px rgba(255, 45, 120, 0.1)',
        'neon-green': '0 0 15px rgba(0, 255, 136, 0.3), 0 0 60px rgba(0, 255, 136, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255,255,255,0.05)',
        'inner-glow': 'inset 0 0 30px rgba(0, 240, 255, 0.05)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-x': 'gradientX 6s ease infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'spin-slow': 'spin 8s linear infinite',
        'border-flow': 'borderFlow 3s linear infinite',
        'typing-dot': 'typingDot 1.4s infinite',
        'packet-flow': 'packetFlow 2s linear infinite',
        'grid-pulse': 'gridPulse 4s ease-in-out infinite',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.2), 0 0 40px rgba(0, 240, 255, 0.1)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.4), 0 0 80px rgba(0, 240, 255, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%': { transform: 'translateY(-8px) rotate(1deg)' },
          '66%': { transform: 'translateY(4px) rotate(-1deg)' },
        },
        glow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.4))' },
          '50%': { filter: 'drop-shadow(0 0 20px rgba(0, 240, 255, 0.7))' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        typingDot: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' },
        },
        packetFlow: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        gridPulse: {
          '0%, 100%': { opacity: '0.03' },
          '50%': { opacity: '0.08' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
