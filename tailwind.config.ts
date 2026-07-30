import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#33A1FD',
        secondary: '#009877',
        accent: '#0F7EE8',
        dark: '#0D1F2D',
        muted: '#64748B',
        background: '#F8FCFF',
        textPrimary: '#0D1F2D',
        textMuted: '#64748B',
        border: 'rgba(51,161,253,0.18)',
        success: '#10B981',
        'bg-blue': '#EBF6FF',
        'bg-green': '#F0FBF7',
        'bg-copper': '#EEF6FF',
        'bg-page': '#F6FBFF',
      },
      fontFamily: {
        heading: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        body: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        sans: [
          "var(--font-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
        sm: ["0.9375rem", { lineHeight: "1.45rem" }], // 15px
        base: ["1.0625rem", { lineHeight: "1.65rem" }], // 17px
        md: ["1.0625rem", { lineHeight: "1.65rem" }],
        lg: ["1.1875rem", { lineHeight: "1.75rem" }],
        xl: ["1.3125rem", { lineHeight: "1.85rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      borderRadius: {
        btn: '50px',
        card: '16px',
        badge: '50px',
      },
      boxShadow: {
        navbar: '0 8px 28px rgba(51,161,253,0.10)',
        card: '0 10px 36px rgba(51,161,253,0.10)',
        'btn': '0 10px 26px rgba(51,161,253,0.26)',
        'btn-hover': '0 16px 36px rgba(51,161,253,0.34)',
      },
      backgroundImage: {
        'hero': 'radial-gradient(circle at 15% 10%, rgba(51,161,253,0.18), transparent 36%), linear-gradient(145deg, #F2F8FF 0%, #FFFFFF 55%, #F7FBFF 100%)',
        'btn-primary': 'linear-gradient(135deg, #33A1FD 0%, #0F7EE8 100%)',
        'stats-row': 'linear-gradient(90deg, #EBF6FF, #F3F9FF, #EEF7FF, #EBF6FF)',
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
