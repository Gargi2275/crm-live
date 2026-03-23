import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0F1F3D',
        saffron: '#F5A623',
        teal: '#1A7A8A',
        background: '#FAFAF7',
        card: '#FFFFFF',
        textPrimary: '#1C1C1E',
        textMuted: '#6B7280',
        success: '#16A34A',
        border: '#E5E7EB',
      },
      fontFamily: {
        heading: ['var(--font-fraunces)', 'serif'],
        body: ['var(--font-plus-jakarta)', 'sans-serif'],
        mono: ['var(--font-dm-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
