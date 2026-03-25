import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#33A1FD',
        secondary: '#009877',
        accent: '#B87333',
        dark: '#0D1F2D',
        muted: '#64748B',
        'bg-blue': '#EBF6FF',
        'bg-green': '#F0FBF7',
        'bg-copper': '#FDF6EE',
        'bg-page': '#F8FEFF',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Raleway', 'sans-serif'],
      },
      borderRadius: {
        btn: '50px',
        card: '16px',
        badge: '50px',
      },
      boxShadow: {
        navbar: '0 2px 20px rgba(51,161,253,0.08)',
        card: '0 4px 24px rgba(51,161,253,0.08)',
        'btn': '0 6px 20px rgba(51,161,253,0.30)',
        'btn-hover': '0 8px 28px rgba(51,161,253,0.40)',
      },
      backgroundImage: {
        'hero': 'linear-gradient(150deg, #EBF6FF 0%, #F5FBFF 50%, #FFFFFF 100%)',
        'btn-primary': 'linear-gradient(135deg, #33A1FD, #0F7EE8)',
        'stats-row': 'linear-gradient(90deg, #EBF6FF, #F0FBF7, #FDF6EE, #EBF6FF)',
      },
      borderColor: {
        'blue-tint': 'rgba(51, 161, 253, 0.15)',
        'green-tint': 'rgba(0, 152, 119, 0.15)',
        'copper-tint': 'rgba(184, 115, 51, 0.15)',
      },
    },
  },
  plugins: [],
}
export default config
