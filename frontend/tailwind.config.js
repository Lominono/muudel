/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: '#F2F2F7', soft: '#EFEFF4', card: '#FFFFFF' },
        ink: { DEFAULT: '#000000', muted: '#6B6B70', subtle: '#98989D' },
        accent: '#0A84FF',
        positive: '#30D158',
        negative: '#FF453A',
        warning: '#FF9500',
        paper: '#FFFFFF',
      },
      fontFamily: {
        body: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
