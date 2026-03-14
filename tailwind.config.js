/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
        },
        card: {
          bg: 'var(--card-bg)',
          border: 'var(--card-border)',
          hover: 'var(--card-hover)',
        },
        t: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          glow: 'var(--accent-glow)',
          hover: 'var(--accent-hover)',
        },
        row: {
          border: 'var(--row-border)',
          hover: 'var(--row-hover)',
        },
        modal: {
          bg: 'var(--modal-bg)',
          border: 'var(--modal-border)',
          backdrop: 'var(--modal-backdrop)',
        },
        signal: {
          green: 'var(--green)',
          red: 'var(--red)',
          amber: 'var(--amber)',
        },
      },
      backgroundColor: {
        header: 'var(--header-bg)',
      },
      boxShadow: {
        glass: 'var(--glass-shadow)',
      },
    },
  },
  plugins: [],
}
